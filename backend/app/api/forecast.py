import sys
import os
import time

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))

from fastapi import APIRouter
from app.db.session import SessionLocal
from app.models.crag import Crag
from forecasting.weather_client import get_daily_forecast
from forecasting.climbability_score import score_forecast

router = APIRouter()

# --- CACHE SETUP ---
# Simple in-memory cache so we don't hit the weather API on every page load.
# Entries expire after 30 minutes.
_forecast_cache = {}
CACHE_TTL = 1800  # 30 minutes

def get_cached_forecast(crag_id: int):
    """Return cached forecast if it exists and isn't expired."""
    entry = _forecast_cache.get(crag_id)
    if entry and (time.time() - entry["timestamp"]) < CACHE_TTL:
        return entry["data"]
    return None

def set_cached_forecast(crag_id: int, data):
    """Store forecast data in the cache."""
    _forecast_cache[crag_id] = {"data": data, "timestamp": time.time()}

# --- THE ACTUAL ENDPOINT ---
@router.get("/crags/{crag_id}/forecast")
def get_crag_forecast(crag_id: int):
    # Check cache first — if we have recent data, return it immediately
    cached = get_cached_forecast(crag_id)
    if cached:
        return cached

    db = SessionLocal()
    try:
        crag = db.query(Crag).filter(Crag.id == crag_id).first()
        if crag is None:
            return {"error": "Crag not found"}
        if crag.latitude is None or crag.longitude is None:
            return {"error": "This crag has no GPS coordinates on file"}

        raw_forecast = get_daily_forecast(crag.latitude, crag.longitude)

        # Crag-level forecast (no specific sector shade info)
        crag_forecast = score_forecast(raw_forecast)

        # Per-sector forecast, using each sector's own shade data
        sectors_forecast = []
        for sector in crag.sectors:
            sector_dict = {
                "shade_by_hour": sector.shade_by_hour,
                "sun_until_hour": sector.sun_until_hour,
                "orientation": sector.orientation,
            }
            sectors_forecast.append({
                "sector_id": sector.id,
                "sector_name": sector.name,
                "forecast": score_forecast(raw_forecast, sector_dict),
            })

        result = {
            "crag_id": crag.id,
            "crag_name": crag.name,
            "crag_forecast": crag_forecast,
            "sectors": sectors_forecast,
        }

        # Cache the result before returning
        set_cached_forecast(crag_id, result)

        return result
    finally:
        db.close()
