"""Main API v1 router — aggregates all route modules."""

from fastapi import APIRouter

from app.api.v1.calls import router as calls_router
from app.api.v1.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(calls_router)
