"""Call history endpoints — RBAC protected (super_admin only)."""

import logging
from fastapi import APIRouter, Header, HTTPException
from typing import Optional

from app.models.api import ApiResponse
from app.services.call_storage import get_calls_by_category, get_call_with_transcript
from app.services.supabase_client import get_supabase_anon

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["history"])


async def _verify_super_admin(authorization: str) -> str:
    """Verify the request is from a super_admin user.

    Args:
        authorization: Bearer token from Supabase Auth

    Returns:
        User ID if authorized

    Raises:
        HTTPException 401/403 if not authorized
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.replace("Bearer ", "")

    # Use service client to verify — more reliable than anon client
    from app.services.supabase_client import get_supabase_service
    service = get_supabase_service()
    if not service:
        raise HTTPException(status_code=503, detail="Auth service unavailable")

    try:
        # Get user from token
        user_response = service.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = user_response.user.id

        # Check role in profiles table
        profile = service.table("profiles").select("role").eq("id", user_id).single().execute()

        if not profile.data or profile.data.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Access denied — super_admin role required")

        return user_id

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


@router.get("/calls")
async def list_calls(
    category: Optional[str] = None,
    limit: int = 50,
    authorization: str = Header(default=""),
) -> ApiResponse[list]:
    """List all categorized calls. Super admin only."""
    await _verify_super_admin(authorization)

    calls = await get_calls_by_category(category=category, limit=limit)
    return ApiResponse(success=True, data=calls)


@router.get("/calls/{call_id}")
async def get_call_detail(
    call_id: str,
    authorization: str = Header(default=""),
) -> ApiResponse[dict]:
    """Get a single call with full transcript. Super admin only."""
    await _verify_super_admin(authorization)

    call = await get_call_with_transcript(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    return ApiResponse(success=True, data=call)


@router.get("/stats")
async def get_stats(
    authorization: str = Header(default=""),
) -> ApiResponse[dict]:
    """Get call category statistics. Super admin only."""
    await _verify_super_admin(authorization)

    from app.services.supabase_client import get_supabase_service
    supabase = get_supabase_service()
    if not supabase:
        return ApiResponse(success=True, data={"total": 0, "categories": {}})

    try:
        result = supabase.table("calls").select("category").execute()
        calls = result.data or []

        # Count by category
        categories = {}
        for call in calls:
            cat = call.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1

        return ApiResponse(success=True, data={
            "total": len(calls),
            "categories": categories,
        })
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return ApiResponse(success=False, error=str(e))
