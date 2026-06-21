"""Health check endpoint."""

from fastapi import APIRouter

from app.models.api import ApiResponse

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> ApiResponse[dict]:
    """Return service health status."""
    return ApiResponse(success=True, data={"status": "ok"})
