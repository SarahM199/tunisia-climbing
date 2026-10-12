
"""
Imports crags.csv, sectors.csv, routes.csv from data/processed/ into the
Supabase Postgres database, using the existing IDs from the CSVs directly.
 
Run from the backend/ folder, with the venv active:
    python import_to_db.py
"""
import pandas as pd
from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.crag import Crag, Sector, Route
 
CRAGS_CSV = "../data/processed/crags.csv"
SECTORS_CSV = "../data/processed/sectors.csv"
ROUTES_CSV = "../data/processed/routes.csv"
 
 
def clean_row(row: dict) -> dict:
    """Convert pandas NaN values to None so SQLAlchemy stores real NULLs."""
    return {k: (None if pd.isna(v) else v) for k, v in row.items()}
 
 
def import_crags(db):
    df = pd.read_csv(CRAGS_CSV)
    count = 0
    for _, row in df.iterrows():
        data = clean_row(row.to_dict())
        crag = Crag(
            id=int(data["id"]),
            name=data["name"],
            country=data.get("country"),
            region=data.get("region"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            rock_type=data.get("rock_type"),
            altitude_m=data.get("altitude_m"),
            description=data.get("description"),
            topo_version=data.get("topo_version"),
        )
        db.merge(crag)  # merge = insert or update if id already exists
        count += 1
    db.commit()
    print(f"Imported {count} crags.")
 
 
def import_sectors(db):
    df = pd.read_csv(SECTORS_CSV)
    count = 0
    for _, row in df.iterrows():
        data = clean_row(row.to_dict())
        sector = Sector(
            id=int(data["id"]),
            crag_id=int(data["crag_id"]),
            name=data["name"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            orientation=data.get("orientation"),
            num_routes=data.get("num_routes"),
            grade_min=data.get("grade_min"),
            grade_max=data.get("grade_max"),
            approach_time_min=data.get("approach_time_min"),
            approach_difficulty=data.get("approach_difficulty"),
            description=data.get("description"),
            climbing_type=data.get("climbing_type"),
        )
        db.merge(sector)
        count += 1
    db.commit()
    print(f"Imported {count} sectors.")
 
 
def import_routes(db):
    df = pd.read_csv(ROUTES_CSV)
    count = 0
    for _, row in df.iterrows():
        data = clean_row(row.to_dict())
        route = Route(
            id=int(data["id"]),
            sector_id=int(data["sector_id"]),
            route_number=data.get("route_number"),
            name=data["name"],
            grade=data.get("grade"),
            quickdraws=data.get("quickdraws"),
            rope_length_m=data.get("rope_length_m"),
            climbing_type=data.get("climbing_type"),
            description=data.get("description"),
        )
        db.merge(route)
        count += 1
    db.commit()
    print(f"Imported {count} routes.")
 
 
def reset_sequences(db):
    """
    Since we inserted explicit IDs (1, 2, 3...) instead of letting Postgres
    auto-generate them, its internal auto-increment counter doesn't know
    those IDs were used. Without this, the NEXT row you insert normally
    (e.g. from the API, without specifying an id) could collide with an
    existing one. This resets each table's counter to start after the
    highest existing id.
    """
    for table in ["crags", "sectors", "routes"]:
        db.execute(text(f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table}), 1)
            )
        """))
    db.commit()
    print("Reset auto-increment sequences.")
 
 
if __name__ == "__main__": #Python idiom meaning "only run this code if the file is executed directly (python import_to_db.py), not if it's imported elsewhere
    db = SessionLocal()
    try:
        # Order matters: crags before sectors (sectors reference crags),
        # sectors before routes (routes reference sectors).
        import_crags(db)
        import_sectors(db)
        import_routes(db)
        reset_sequences(db)
        print("\nImport complete.")
    finally:
        db.close()