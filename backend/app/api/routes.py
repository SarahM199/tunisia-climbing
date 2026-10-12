from fastapi import APIRouter
from app.db.session import SessionLocal
from app.models.crag import Route

router = APIRouter()

# NEW: List all routes with their sector and crag info
# This gives the frontend everything it needs to filter client-side
@router.get("/routes")
def list_routes():
    db = SessionLocal()
    try:
        routes = db.query(Route).all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "route_number": r.route_number,
                "grade": r.grade,
                "quickdraws": r.quickdraws,
                "rope_length_m": r.rope_length_m,
                "climbing_type": r.climbing_type,
                # Include parent info so we can filter/display without extra requests
                "sector_id": r.sector_id,
                "sector_name": r.sector.name,
                "crag_id": r.sector.crag_id,
                "crag_name": r.sector.crag.name,
                "region": r.sector.crag.region,
            }
            for r in routes
        ]
    finally:
        db.close()

@router.get("/routes/{route_id}")
def get_route(route_id: int):
    db = SessionLocal()
    try:
        route = db.query(Route).filter(Route.id == route_id).first()
        if route is None:
            return {"error": "Route not found"}
        return {
            "id": route.id,
            "name": route.name,
            "route_number": route.route_number,
            "grade": route.grade,
            "quickdraws": route.quickdraws,
            "rope_length_m": route.rope_length_m,
            "climbing_type": route.climbing_type,
            "description": route.description,
            "sector_id": route.sector_id,
            "sector_name": route.sector.name,
            "crag_id": route.sector.crag_id,
            "crag_name": route.sector.crag.name,
        }
    finally:
        db.close()
