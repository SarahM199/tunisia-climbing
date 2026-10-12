import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))

from typing import Optional
from fastapi import APIRouter
from app.db.session import SessionLocal
from app.models.crag import Crag
from optimization.recommender import recommend_sectors
from app.core.ratings import get_global_prior, get_rating_map

router = APIRouter()


@router.get("/recommend")
def get_recommendations(
    date: str,
    grade: str,
    time: Optional[str] = None,
    climbing_type: Optional[str] = None,
    limit: int = 10,
):
    climb_hour = None
    if time:
        try:
            hh, mm = time.split(":")
            climb_hour = int(hh) + int(mm) / 60
        except ValueError:
            return {"error": "time must be in HH:MM format, e.g. 14:30"}

    db = SessionLocal()
    try:
        crags = db.query(Crag).all()
        # One aggregate query, then attached to each sector dict below so the
        # recommender can rank with it without touching the database itself.
        ratings = get_rating_map(db)
        # Unrated sectors fall back to the prior — "unknown", not "bad".
        prior_mean = get_global_prior(db)

        crags_data = [

            {
                "id": crag.id,
                "name": crag.name,
                "latitude": crag.latitude,
                "longitude": crag.longitude,
                "sectors": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "grade_min": s.grade_min,
                        "grade_max": s.grade_max,
                        "orientation": s.orientation,
                        "shade_by_hour": s.shade_by_hour,
                        "sun_until_hour": s.sun_until_hour,
                        "climbing_type": s.climbing_type,
                        "rating": (ratings.get(s.id) or {}).get("rating"),
                        "rating_count": (ratings.get(s.id) or {}).get("rating_count", 0),
                        "adjusted_rating": (ratings.get(s.id) or {}).get(
                            "adjusted_rating", prior_mean
                        ),
                    }
                    for s in crag.sectors

                    # Filter by climbing type if user specified one
                    if not climbing_type or s.climbing_type == climbing_type
                    
                ],
            }
            for crag in crags
        ]

        try:
            outcome = recommend_sectors(
                crags_data,
                target_date=date,
                project_grade=grade,
                climb_hour=climb_hour,
                top_n=limit,
            )
        except ValueError as e:
            return {"error": str(e)}

        return {
            "date": date,
            "project_grade": grade,
            "time": time,
            "warmup_steps_used": outcome["warmup_steps_used"],
            "recommendations": outcome["results"],
            "message": None if outcome["results"] else "No sectors found with both warm-up and project routes, even after widening the search.",
        }
    finally:
        db.close()

@router.get("/best-today")
def best_today():
    """
    Returns the top 3 sectors with the best conditions RIGHT NOW.
    No grade filtering — just pure weather/shade scoring.
    Uses climb_hour = current hour for shade relevance.
    """
    from datetime import datetime

    db = SessionLocal()
    try:
        crags = db.query(Crag).all()

        # Current hour (e.g. 14.5 for 2:30pm)
        now = datetime.now()
        climb_hour = now.hour + now.minute / 60
        today_str = now.strftime("%Y-%m-%d")

        # Build sector list with their crag's coordinates
        all_sectors = []
        for crag in crags:
            if crag.latitude is None or crag.longitude is None:
                continue
            for sector in crag.sectors:
                all_sectors.append({
                    "crag": {
                        "id": crag.id,
                        "name": crag.name,
                        "latitude": crag.latitude,
                        "longitude": crag.longitude,
                    },
                    "sector": {
                        "id": sector.id,
                        "name": sector.name,
                        "shade_by_hour": sector.shade_by_hour,
                        "sun_until_hour": sector.sun_until_hour,
                        "orientation": sector.orientation,
                        "climbing_type": sector.climbing_type,
                        "num_routes": sector.num_routes,
                        "grade_min": sector.grade_min,
                        "grade_max": sector.grade_max,
                    },
                })

        # Score each sector using today's forecast
        from forecasting.weather_client import get_daily_forecast
        from forecasting.climbability_score import score_day

        # Cache forecasts per crag (same location = same weather)
        forecast_cache = {}
        results = []

        for item in all_sectors:
            crag = item["crag"]
            sector = item["sector"]

            if crag["id"] not in forecast_cache:
                try:
                    forecast = get_daily_forecast(crag["latitude"], crag["longitude"], days=1)
                    forecast_cache[crag["id"]] = forecast[0] if forecast else None
                except Exception:
                    forecast_cache[crag["id"]] = None

            today_weather = forecast_cache[crag["id"]]
            if today_weather is None:
                continue

            scored = score_day(today_weather, sector, climb_hour=climb_hour)

            results.append({
                "crag_id": crag["id"],
                "crag_name": crag["name"],
                "sector_id": sector["id"],
                "sector_name": sector["name"],
                "climbing_type": sector.get("climbing_type"),
                "num_routes": sector.get("num_routes"),
                "grade_min": sector.get("grade_min"),
                "grade_max": sector.get("grade_max"),
                **scored,
            })

        # Sort by score, return top 3
        results.sort(key=lambda r: r["score"], reverse=True)
        return {
            "date": today_str,
            "hour": round(climb_hour, 1),
            "top_sectors": results[:3],
        }
    finally:
        db.close()
