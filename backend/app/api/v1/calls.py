"""Call management REST endpoints."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.api import ApiResponse
from app.models.call import CallCreate, CallCreatedResponse, CallResponse, CallSummary
from app.repositories.call_repository import call_repository

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("")
async def list_calls() -> ApiResponse[list[CallResponse]]:
    """List all completed calls with summaries. No auth required (demo)."""
    completed = call_repository.list_completed_calls()
    results = []
    for call in completed:
        duration = 0
        if call.started_at and call.ended_at:
            start = datetime.fromisoformat(call.started_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(call.ended_at.replace("Z", "+00:00"))
            duration = int((end - start).total_seconds())
        results.append(
            CallResponse(
                call_id=call.call_id,
                status=call.status,
                started_at=call.started_at,
                ended_at=call.ended_at,
                transcript=call.transcript,
                duration_seconds=duration,
                agent_config_snapshot=call.agent_config_snapshot,
                call_summary=call.call_summary,
            )
        )
    return ApiResponse(success=True, data=results)


@router.post("", status_code=201)
async def create_call(body: CallCreate) -> ApiResponse[CallCreatedResponse]:
    """Create a new call session. Returns call_id and websocket_url."""
    call = call_repository.create_call(scenario=body.scenario)
    return ApiResponse(
        success=True,
        data=CallCreatedResponse(
            call_id=call.call_id,
            status=call.status,
            websocket_url=f"/ws/v1/call/{call.call_id}",
        ),
    )


@router.get("/{call_id}")
async def get_call(call_id: str) -> ApiResponse[CallResponse]:
    """Get call state and transcript."""
    call = call_repository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    duration = 0
    if call.started_at and call.ended_at:
        start = datetime.fromisoformat(call.started_at.replace("Z", "+00:00"))
        end = datetime.fromisoformat(call.ended_at.replace("Z", "+00:00"))
        duration = int((end - start).total_seconds())

    return ApiResponse(
        success=True,
        data=CallResponse(
            call_id=call.call_id,
            status=call.status,
            started_at=call.started_at,
            ended_at=call.ended_at,
            transcript=call.transcript,
            duration_seconds=duration,
            agent_config_snapshot=call.agent_config_snapshot,
            call_summary=call.call_summary,
        ),
    )


@router.post("/{call_id}/end")
async def end_call(call_id: str) -> ApiResponse[CallResponse]:
    """End an active call."""
    call = call_repository.update_status(call_id, "complete")
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    duration = 0
    if call.started_at and call.ended_at:
        start = datetime.fromisoformat(call.started_at.replace("Z", "+00:00"))
        end = datetime.fromisoformat(call.ended_at.replace("Z", "+00:00"))
        duration = int((end - start).total_seconds())

    return ApiResponse(
        success=True,
        data=CallResponse(
            call_id=call.call_id,
            status=call.status,
            started_at=call.started_at,
            ended_at=call.ended_at,
            transcript=call.transcript,
            duration_seconds=duration,
            agent_config_snapshot=call.agent_config_snapshot,
            call_summary=call.call_summary,
        ),
    )
