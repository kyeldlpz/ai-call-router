# Python Standards

## FastAPI Standards

### Route Handler Rules

Route handlers are **thin wrappers** — validate, delegate, respond.

```python
# GOOD — thin handler
@router.post("/calls", response_model=ApiResponse[CallResponse])
async def create_call(request: CreateCallRequest) -> ApiResponse[CallResponse]:
    call = await call_service.create_call(request.scenario_id)
    return ApiResponse(success=True, data=call)

# BAD — logic in handler
@router.post("/calls")
async def create_call(request: CreateCallRequest):
    call_id = str(uuid4())
    calls_db[call_id] = {"status": "connecting", ...}
    ws = await connect_to_openai(...)
    # 30 more lines of business logic
    return {"success": True, "data": {...}}
```

### Response Envelope

Every REST response uses the standard envelope:

```python
from pydantic import BaseModel, Field
from typing import Generic, TypeVar
from datetime import datetime, timezone

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
```

### Error Responses

```python
# Custom exceptions
class CallNotFoundError(Exception):
    def __init__(self, call_id: str):
        self.call_id = call_id
        super().__init__(f"Call {call_id} not found")

class AIServiceError(Exception):
    def __init__(self, service: str, detail: str):
        self.service = service
        self.detail = detail
        super().__init__(f"{service}: {detail}")

# Exception handlers registered in main.py
@app.exception_handler(CallNotFoundError)
async def call_not_found_handler(request: Request, exc: CallNotFoundError):
    return JSONResponse(
        status_code=404,
        content=ApiResponse(success=False, error=f"Call {exc.call_id} not found").model_dump(),
    )
```

### WebSocket Handlers

```python
# WebSocket handlers follow this pattern:
async def call_session_handler(websocket: WebSocket, call_id: str) -> None:
    await websocket.accept()
    try:
        session = CallSession(call_id, websocket)
        await session.run()
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {call_id}")
    except Exception as exc:
        logger.error(f"WebSocket error: {call_id}", exc_info=exc)
        await websocket.close(code=1011, reason="Internal error")
```

---

## Service Layer Rules

### Structure

```python
"""Intent detection service.

Classifies caller intent from transcript using GPT-4.1 structured outputs.
"""

import logging
from app.config import get_settings
from app.models.intent import IntentResult
from app.prompts.intent_system import INTENT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
settings = get_settings()


async def detect_intent(transcript: str, account_context: str) -> IntentResult:
    """Classify the caller's primary intent from the conversation transcript.

    Args:
        transcript: Full conversation transcript up to this point.
        account_context: Account information string for context.

    Returns:
        IntentResult with classified intent, confidence, and signals.

    Raises:
        AIServiceError: If the OpenAI API call fails.
    """
    ...
```

### Rules

1. **All service functions are `async`** — even if current implementation is sync (future-proofs for I/O)
2. **Services never import from `api/`** — dependency flows downward only
3. **Services receive typed parameters** — never raw Request objects or dictionaries
4. **Services return Pydantic models** — never raw dicts
5. **Each service owns its own error handling** — catches API errors, raises domain exceptions
6. **One module per AI concern** — `intent_detection.py`, `opportunity_scoring.py`, `summary_generation.py`

### Anti-Patterns

```python
# BAD — returning raw dict
async def detect_intent(transcript: str) -> dict:
    return {"intent": "payment_inquiry", "confidence": 0.9}

# BAD — accepting untyped data
async def detect_intent(data: dict) -> IntentResult:
    transcript = data.get("transcript", "")

# BAD — importing from API layer
from app.api.v1.calls import get_current_call  # NEVER

# BAD — raw OpenAI call without service encapsulation
response = await openai.chat.completions.create(...)  # only in services/
```

---

## Dependency Injection

### Pattern

Use FastAPI's `Depends()` for shared resources in route handlers:

```python
from functools import lru_cache
from app.config import Settings

@lru_cache
def get_settings() -> Settings:
    return Settings()

@router.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    return ApiResponse(success=True, data={"status": "healthy"})
```

### When to Use Depends

- Configuration/settings
- Repository instances (if class-based)
- Shared WebSocket managers
- Request-scoped resources

### When NOT to Use Depends

- Service functions (call them directly)
- Utility functions
- Constants

---

## Error Handling

### Exception Hierarchy

```python
# Base exception for all domain errors
class RecoverAiError(Exception):
    """Base exception for RecoverAi domain errors."""
    pass

class CallNotFoundError(RecoverAiError):
    """Raised when a call_id doesn't exist in the repository."""
    pass

class AIServiceError(RecoverAiError):
    """Raised when an AI API call fails."""
    pass

class WebSocketError(RecoverAiError):
    """Raised on WebSocket protocol errors."""
    pass
```

### Error Handling Rules

| Layer | Catches | Raises |
|-------|---------|--------|
| Route handlers | Domain exceptions | HTTP responses (via exception handlers) |
| Services | External API errors (OpenAI, network) | Domain exceptions |
| Repositories | KeyError, storage errors | `CallNotFoundError` |
| WebSocket handlers | `WebSocketDisconnect`, domain exceptions | Nothing (logs and closes) |

### Never Do

```python
# BAD — swallowed exception
try:
    result = await detect_intent(transcript)
except Exception:
    pass  # NEVER

# BAD — bare except
try:
    ...
except:
    ...

# BAD — logging but not handling
try:
    result = await detect_intent(transcript)
except Exception as e:
    logger.error(e)
    # then what? caller gets None? crashes?
```

### Graceful Degradation

```python
# GOOD — AI failure returns fallback, doesn't crash the flow
async def detect_intent_safe(transcript: str) -> IntentResult:
    try:
        return await detect_intent(transcript)
    except AIServiceError as exc:
        logger.warning(f"Intent detection failed: {exc}")
        return IntentResult(intent="unknown", confidence=0.0, signals=["ai_service_unavailable"])
```

---

## Logging Strategy

### Configuration

```python
import logging

# JSON-structured logging for production-like output
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
```

### Per-Module Logger

```python
# Every module gets its own logger
logger = logging.getLogger(__name__)
```

### Log Levels

| Level | Use For |
|-------|---------|
| DEBUG | WebSocket frame details, AI prompt contents, state transitions |
| INFO | Call started, call ended, intent detected, summary generated |
| WARNING | AI service timeout (retrying), WebSocket reconnection |
| ERROR | Unrecoverable failures, exception details |

### What to Log

```python
# GOOD — structured, actionable
logger.info(f"Call started: call_id={call_id} scenario={scenario_id}")
logger.info(f"Intent detected: call_id={call_id} intent={result.intent} confidence={result.confidence}")
logger.warning(f"OpenAI timeout: call_id={call_id} attempt={attempt}/{MAX_RETRIES}")
logger.error(f"AI service failed: call_id={call_id} service=intent_detection", exc_info=exc)

# BAD — useless
logger.info("Processing...")
logger.debug(f"data = {data}")  # dumps entire payload
```

### What NOT to Log

- API keys or secrets
- Full prompt text at INFO level (use DEBUG)
- Every WebSocket frame at INFO level (use DEBUG)
- User PII (even mock data — keep habit clean)

---

## Validation Strategy

### Pydantic Models for Everything

```python
from pydantic import BaseModel, Field
from typing import Literal

class CreateCallRequest(BaseModel):
    scenario_id: str = Field(..., min_length=1, max_length=50)

class IntentResult(BaseModel):
    intent: Literal[
        "payment_inquiry", "dispute", "hardship",
        "settlement_offer", "information_request", "callback_request", "unknown"
    ]
    confidence: float = Field(..., ge=0.0, le=1.0)
    signals: list[str] = Field(default_factory=list)

class OpportunityScore(BaseModel):
    level: Literal["high", "medium", "low"]
    value: int = Field(..., ge=0, le=100)
    factors: list[str] = Field(default_factory=list)
```

### Validation Rules

1. **All API inputs validated via Pydantic** — no manual dict checks
2. **All AI outputs validated via Pydantic** — parse structured output into model
3. **Field constraints on every numeric field** — `ge`, `le`, `gt`, `lt`
4. **Literal types for enums** — not bare strings
5. **Default factories for mutable defaults** — `Field(default_factory=list)`

### AI Output Validation

```python
# GOOD — validate AI response against Pydantic model
import json

async def detect_intent(transcript: str) -> IntentResult:
    response = await call_openai(...)
    raw_json = response.choices[0].message.content
    return IntentResult.model_validate_json(raw_json)

# BAD — trust AI output structure
async def detect_intent(transcript: str) -> dict:
    response = await call_openai(...)
    return json.loads(response.choices[0].message.content)
```

---

## Type Hints

### Requirements

- **All function parameters** must have type hints
- **All return types** must be annotated
- **All class attributes** must be typed (Pydantic handles this)
- **Module-level variables** should have type hints if not obvious

```python
# GOOD
async def generate_summary(call_id: str, transcript: list[str]) -> HandoffSummary:
    ...

# BAD
async def generate_summary(call_id, transcript):
    ...
```

### Modern Syntax (Python 3.11+)

```python
# Use built-in generics (not typing module)
list[str]          # not List[str]
dict[str, int]     # not Dict[str, int]
str | None         # not Optional[str]
tuple[int, ...]    # not Tuple[int, ...]
```

---

## Checklist: Python File Review

```
□ All functions have type hints (params + return)
□ Async for all I/O operations
□ Pydantic model for all inputs and outputs
□ Logger initialized with __name__
□ No business logic in route handlers
□ No raw dict returns from services
□ Custom exceptions for domain errors
□ Graceful degradation for AI failures
□ No bare except clauses
□ No swallowed exceptions
□ Imports sorted: stdlib → third-party → internal
```
