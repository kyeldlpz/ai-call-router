"""Agent configuration REST endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.agent_config import AgentConfigResponse, AgentConfigUpdate
from app.models.api import ApiResponse
from app.prompts.compose import compose_system_prompt
from app.repositories.agent_config_repository import agent_config_repository

router = APIRouter(prefix="/agent-config", tags=["agent-config"])


def _to_response() -> AgentConfigResponse:
    payload = agent_config_repository.build_response()
    return AgentConfigResponse.model_validate(payload)


@router.get("")
async def get_agent_config() -> ApiResponse[AgentConfigResponse]:
    """Return current global agent config with composed preview."""
    return ApiResponse(success=True, data=_to_response())


@router.put("")
async def update_agent_config(
    body: AgentConfigUpdate,
) -> ApiResponse[AgentConfigResponse]:
    """Update global agent config."""
    try:
        agent_config_repository.save(body)
        compose_system_prompt(agent_config_repository.get())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return ApiResponse(success=True, data=_to_response())


@router.post("/reset")
async def reset_agent_config() -> ApiResponse[AgentConfigResponse]:
    """Reset agent config to collections_default preset."""
    agent_config_repository.reset()
    return ApiResponse(success=True, data=_to_response())
