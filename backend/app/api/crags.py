from fastapi import APIRouter
from app.db.session import SessionLocal
from app.models.crag import Crag
from app.core.ratings import get_rating_map
import os
import sys

# Lets us reuse the grade ordering from the ml package (same trick as recommend.py)
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))

from grading.grade_utils import grade_to_value

router = APIRouter()


@router.get("/crags")
def list_crags():
    db = SessionLocal()
    try:
        crags = db.query(Crag).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "region": c.region,
                "rock_type": c.rock_type,
                "latitude": c.latitude,
                "longitude": c.longitude,
            }
            for c in crags
        ]
    finally:
        db.close()


@router.get("/crags/{crag_id}")
def get_crag(crag_id: int):
    db = SessionLocal()
    try:
        crag = db.query(Crag).filter(Crag.id == crag_id).first()
        if crag is None:
            return {"error": "Crag not found"}

        ratings = get_rating_map(db, [s.id for s in crag.sectors])

        return {
            "id": crag.id,
            "name": crag.name,
            "country": crag.country,
            "region": crag.region,
            "latitude": crag.latitude,
            "longitude": crag.longitude,
            "rock_type": crag.rock_type,
            "altitude_m": crag.altitude_m,
            "description": crag.description,
            "sectors": [
                {
                    "id": s.id,
                    "name": s.name,
                    "num_routes": s.num_routes,
                    "grade_min": s.grade_min,
                    "grade_max": s.grade_max,
                    "climbing_type": s.climbing_type,
                    "rating": (ratings.get(s.id) or {}).get("rating"),
                    "rating_count": (ratings.get(s.id) or {}).get("rating_count", 0),
                }
                for s in crag.sectors
            ],

        }
    finally:
        db.close()

@router.get("/stats")
def get_stats():
    """
    Counts and ranges for the home page and the guide page.

    Everything the guide states as a number comes from here, so the prose
    can't drift out of date as routes are added.
    """
    db = SessionLocal()
    try:
        from sqlalchemy import func

        from app.models.crag import Route, Sector

        crag_count = db.query(Crag).count()
        sector_count = db.query(Sector).count()
        route_count = db.query(Route).count()

        # Routes grouped by style, e.g. {"sport": 130, "multi_pitch": 26}.
        # Rows with no climbing_type recorded are dropped.
        type_rows = (
            db.query(Route.climbing_type, func.count(Route.id))
            .group_by(Route.climbing_type)
            .all()
        )
        route_types = {style: count for style, count in type_rows if style}

        # Grade range. Climbing grades aren't alphabetical — "6c" comes before
        # "7a" — so we sort using the ml package's ordering. Entries that don't
        # map cleanly (the data has things like "6a/b") are skipped rather than
        # guessed at.
        grades = [g for (g,) in db.query(Route.grade).distinct().all() if g]
        ranked = sorted(
            (grade_to_value(g), g)
            for g in grades
            if grade_to_value(g) is not None
        )

        max_quickdraws = db.query(func.max(Route.quickdraws)).scalar()
        approach_min, approach_max = db.query(
            func.min(Sector.approach_time_min),
            func.max(Sector.approach_time_min),
        ).first()

        return {
            "crags": crag_count,
            "sectors": sector_count,
            "routes": route_count,
            "route_types": route_types,
            "grade_min": ranked[0][1] if ranked else None,
            "grade_max": ranked[-1][1] if ranked else None,
            "max_quickdraws": max_quickdraws,
            "approach_min_minutes": approach_min,
            "approach_max_minutes": approach_max,
        }
    finally:
        db.close()
