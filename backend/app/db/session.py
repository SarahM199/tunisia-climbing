from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.database_url)   # "here's how to reach the database"
SessionLocal = sessionmaker(bind=engine)          # "a way to start a conversation with it"