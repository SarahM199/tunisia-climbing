from fastapi import APIRouter

from app.core.ratings import get_rating_map
from app.db.session import SessionLocal
from app.models.crag import Sector

router = APIRouter()

@router.get("/sectors/{sector_id}")
def get_sector(sector_id: int):
    db = SessionLocal()
    try:
        sector = db.query(Sector).filter(Sector.id == sector_id).first()
        if sector is None:
            return {"error": "Sector not found"}

        rating = get_rating_map(db, [sector.id]).get(sector.id)

        return {
            "id": sector.id,
            "name": sector.name,
            "crag_id": sector.crag_id,
            "crag_name": sector.crag.name,
            "latitude": sector.latitude,
            "longitude": sector.longitude,
            "orientation": sector.orientation,
            "num_routes": sector.num_routes,
            "grade_min": sector.grade_min,
            "grade_max": sector.grade_max,
            "approach_time_min": sector.approach_time_min,
            "approach_difficulty": sector.approach_difficulty,
            "description": sector.description,
            "climbing_type": sector.climbing_type,
            "rating": rating["rating"] if rating else None,
            "rating_count": rating["rating_count"] if rating else 0,
            "routes": [
                {
                    "id": r.id,
                    "route_number": r.route_number,
                    "name": r.name,
                    "grade": r.grade,
                    "climbing_type": r.climbing_type,
                }
                for r in sector.routes
            ],
        }
    finally:
        db.close()

@router.get("/sectors")
def list_sectors():
    """Return all sectors with coordinates for the map view."""
    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        ratings = get_rating_map(db)  # every sector, one query

        return [
            {
                "id": s.id,
                "name": s.name,
                "crag_id": s.crag_id,
                "crag_name": s.crag.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "num_routes": s.num_routes,
                "grade_min": s.grade_min,
                "grade_max": s.grade_max,
                "climbing_type": s.climbing_type,
                "rating": (ratings.get(s.id) or {}).get("rating"),
                "rating_count": (ratings.get(s.id) or {}).get("rating_count", 0),
            }
            for s in sectors
        ]
    finally:
        db.close()
