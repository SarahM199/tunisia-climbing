from fastapi import FastAPI
from app.api.crags import router as crags_router
from app.api.sectors import router as sectors_router
from app.api.routes import router as routes_router
from app.api.forecast import router as forecast_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.recommend import router as recommend_router
from app.api.auth import router as auth_router
from app.api.comments import router as comments_router
from app.api.contact import router as contact_router

app = FastAPI(title="Tunisia Climbing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crags_router)
app.include_router(sectors_router)
app.include_router(routes_router)
app.include_router(forecast_router)
app.include_router(recommend_router)
app.include_router(auth_router)
app.include_router(comments_router)
app.include_router(contact_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
