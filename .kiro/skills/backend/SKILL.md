# Backend Skills — RecoverAi

## Purpose

Enforce consistent backend development patterns for all developers and AI agents working on the FastAPI application.

---

## FastAPI Standards

### Rules

1. Single `FastAPI()` instance created in `main.py`
2. Routers defined in `api/v1/` and included via `app.include_router()`
3. All endpoints are `async` — no synchronous route handlers
4. CORS middleware configured for localhost origins only
5. Startup/shutdown events handle resource cleanup
6. Uvicorn runs the app: `uvicorn app.main:app --reload --port 8000`

### Application Structure

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

app = FastAPI(title="RecoverAi API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
```

---

## Route Design

### Rules

1. All REST routes prefixed with `/api/v1/`
2. All WebSocket routes prefixed with `/ws/v1/`
3. Use plural nouns for resources: `/calls`, `/summaries`
4. Use path parameters for identification: `/calls/{call_id}`
5. Use verbs only for actions: `/calls/{call_id}/end`
6. One router file per resource domain
7. Route handlers are 5-15 lines maximum

### Example (Correct)

```python
# api/v1/calls.py
from fastapi import APIRouter, HTTPException
from app.models.call import CallCreate, CallResponse
from app.services import call_service
from app.models.api import ApiResponse

router = APIRouter(prefix="/calls", tags=["calls"])

@router.post("", status_code=201)
async def create_call(body: CallCreate) -> ApiResponse[CallResponse]:
    call = await call_service.create_call(scenario=body.scenario)
    return ApiResponse(success=True, data=CallResponse.from_session(call))

@router.get("/{call_id}")
async def get_call(call_id: str) -> ApiResponse[CallResponse]:
    call = await call_service.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return ApiResponse(success=True, data=CallResponse.from_session(call))
```

### Anti-Pattern

```python
# BAD: Business logic in handler
@router.post("/calls")
async def create_call(body: CallCreate):
    call_id = str(uuid4())
    ws = await websockets.connect(OPENAI_URL)  # Service logic leaked
    active_calls[call_id] = {"ws": ws}  # Direct store access
    return {"call_id": call_id}
```

---

## Service Design

### Rules

1. Each service module contains related async functions (not classes, unless managing state)
2. Functions receive typed parameters — never `request: Request`
3. Functions return Pydantic models — never raw dicts
4. Functions raise domain-specific exceptions on failure
5. Functions have docstrings explaining their purpose
6. No imports from `app.api` — services are independent of the transport layer

### Service Template

```python
# services/voice_intake.py
"""OpenAI Realtime API voice session management."""

import json
import websockets
from app.config import settings
from app.models.call import RealtimeSession
from app.prompts.intake_system import INTAKE_SYSTEM_PROMPT

class AIServiceError(Exception):
    """Raised when OpenAI API interaction fails."""
    pass

async def create_realtime_session() -> RealtimeSession:
    """Open a new OpenAI Realtime API session with collections intake configuration."""
    try:
        ws = await websockets.connect(
            f"{settings.openai_realtime_url}?model=gpt-4o-realtime-preview",
            extra_headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            },
            open_timeout=30,
        )
        # Send session configuration
        await ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": INTAKE_SYSTEM_PROMPT,
                "voice": "sage",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": "gpt-4o-mini-transcribe"},
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "silence_duration_ms": 500,
                },
            },
        }))
        return RealtimeSession(ws=ws)
    except Exception as e:
        raise AIServiceError(f"Failed to create realtime session: {e}")
```

---

## Validation Strategy

### Rules

1. All request bodies validated by Pydantic models automatically
2. Path parameters validated with type annotations
3. Custom validators use Pydantic `@field_validator` or `@model_validator`
4. Validation errors return 422 with clear field-level messages
5. Never trust client input — validate even if frontend should prevent it

### Model Example

```python
from pydantic import BaseModel, field_validator
from typing import Literal

class CallCreate(BaseModel):
    scenario: str | None = None

    @field_validator("scenario")
    @classmethod
    def validate_scenario(cls, v: str | None) -> str | None:
        if v is not None:
            valid_scenarios = ["settlement_sarah", "dispute_marcus", "hardship_elena"]
            if v not in valid_scenarios:
                raise ValueError(f"Invalid scenario. Must be one of: {valid_scenarios}")
        return v
```

---

## Logging

### Rules

1. Use Python's `logging` module with structured format
2. One logger per module: `logger = logging.getLogger(__name__)`
3. Log levels used correctly:
   - `DEBUG`: Detailed diagnostic info (WebSocket events, audio chunks)
   - `INFO`: Normal operations (call started, call ended, session created)
   - `WARNING`: Recoverable issues (retry attempt, missing optional data)
   - `ERROR`: Failures that need attention (OpenAI disconnect, unhandled exception)
4. Never log sensitive data (API keys, audio content)
5. Include `call_id` in all call-related log messages

### Example

```python
import logging

logger = logging.getLogger(__name__)

async def create_realtime_session(call_id: str) -> RealtimeSession:
    logger.info(f"Creating realtime session for call={call_id}")
    try:
        session = await _connect_to_openai()
        logger.info(f"Realtime session created for call={call_id}")
        return session
    except Exception as e:
        logger.error(f"Failed to create session for call={call_id}: {e}")
        raise
```

### Anti-Pattern

```python
# BAD: print statements
print(f"Creating session...")

# BAD: Logging sensitive data
logger.info(f"Using API key: {settings.openai_api_key}")

# BAD: Wrong log level
logger.error(f"Call started")  # This is INFO, not ERROR
```

---

## Error Handling

### Rules

1. Define domain-specific exceptions in service modules
2. Route handlers catch domain exceptions and map to HTTP responses
3. FastAPI exception handlers catch unexpected errors (global handler)
4. Never return raw Python exceptions to the client
5. Always return the standard API envelope, even for errors
6. Log all errors with context (call_id, operation, etc.)

### Exception Hierarchy

```python
# Base exception for the application
class RecoverAiError(Exception):
    """Base exception for all application errors."""
    pass

class CallNotFoundError(RecoverAiError):
    """Call ID does not exist in the store."""
    pass

class AIServiceError(RecoverAiError):
    """OpenAI API interaction failed."""
    pass

class WebSocketError(RecoverAiError):
    """WebSocket connection or message error."""
    pass
```

### Global Handler

```python
# main.py
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(RecoverAiError)
async def recoverai_error_handler(request: Request, exc: RecoverAiError):
    status_map = {
        CallNotFoundError: 404,
        AIServiceError: 502,
        WebSocketError: 503,
    }
    status = status_map.get(type(exc), 500)
    return JSONResponse(
        status_code=status,
        content={"success": False, "data": None, "error": str(exc), "timestamp": datetime.utcnow().isoformat()},
    )
```

---

## Request/Response Standards

### Rules

1. All responses use the standard envelope:
```python
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
```
2. Success responses: `success=True`, `data` populated, `error=None`
3. Error responses: `success=False`, `data=None`, `error` populated
4. Timestamps in ISO 8601 format with Z suffix
5. camelCase for JSON field names (use Pydantic `alias_generator` or `Field(alias=...)`)

### Example

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CallResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    call_id: str
    status: str
    started_at: str
    ended_at: str | None = None
    duration_seconds: int = 0
```

---

## Dependency Injection Strategy

### Rules

1. Use FastAPI's `Depends()` for shared resources
2. Settings loaded once via `lru_cache` — not re-read on every request
3. Repository instances shared via dependency injection
4. No global mutable state accessed directly in route handlers

### Example

```python
from functools import lru_cache
from app.config import Settings

@lru_cache
def get_settings() -> Settings:
    return Settings()

@router.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    return ApiResponse(success=True, data={"status": "ok"})
```

### Anti-Pattern

```python
# BAD: Importing mutable global directly
from app.repositories.call_repository import active_calls

@router.get("/calls/{call_id}")
async def get_call(call_id: str):
    return active_calls[call_id]  # Direct access, no abstraction
```
