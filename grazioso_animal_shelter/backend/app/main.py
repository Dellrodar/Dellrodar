from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, animals, auth, lookups, rescue_profiles, system
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Grazioso Salvare Animal Shelter API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(animals.router, prefix="/api/v1")
app.include_router(lookups.router, prefix="/api/v1")
app.include_router(rescue_profiles.router, prefix="/api/v1")
