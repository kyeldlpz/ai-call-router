# Testing Governance

## Testing Philosophy

This is a hackathon project. Testing exists to protect the demo, not to achieve coverage metrics.

**Priority order:**
1. Demo happy path works manually (non-negotiable)
2. Critical path logic has automated tests (if time permits)
3. Edge cases are documented as TODOs (acceptable debt)
4. Full coverage is a non-goal

---

## Unit Test Standards

### What Gets Unit Tested

| Component | Test? | Reason |
|-----------|-------|--------|
| Reducer logic (`call-reducer.ts`) | YES | Pure function, easy to test, high breakage risk |
| Pydantic model validation | YES | Catches schema drift, fast to write |
| Utility functions (formatters, parsers) | YES | Pure, deterministic, easy |
| WebSocket message parsing | YES | Critical data boundary |
| AI service functions | MOCK ONLY | Mock OpenAI, test orchestration logic |
| React components | NO | Visual testing = demo |
| Route handlers | NO for unit, YES for integration | Thin wrappers, tested via HTTP |

### Unit Test Structure

**Python (pytest):**

```python
# test_intent_detection.py

import pytest
from app.models.intent import IntentResult
from app.services.intent_detection import detect_intent

@pytest.fixture
def payment_transcript() -> str:
    return "[caller]: Hi, I'm calling about my balance.\n[ai]: Of course, how can I help?"

class TestDetectIntent:
    """Intent detection service tests."""

    async def test_returns_valid_intent_type(self, payment_transcript: str):
        """Intent detection returns a recognized intent enum value."""
        result = await detect_intent(payment_transcript, "ACC-2024-7891")
        assert result.intent in [
            "payment_inquiry", "dispute", "hardship",
            "settlement_offer", "information_request", "callback_request"
        ]

    async def test_confidence_in_valid_range(self, payment_transcript: str):
        """Confidence score is between 0.0 and 1.0."""
        result = await detect_intent(payment_transcript, "ACC-2024-7891")
        assert 0.0 <= result.confidence <= 1.0

    async def test_returns_signals_list(self, payment_transcript: str):
        """Result includes a list of detection signals."""
        result = await detect_intent(payment_transcript, "ACC-2024-7891")
        assert isinstance(result.signals, list)
```

**TypeScript (Vitest):**

```typescript
// call-reducer.test.ts

import { describe, it, expect } from "vitest";
import { callReducer, initialState } from "@/context/call-reducer";
import type { CallAction, CallState } from "@/types";

describe("callReducer", () => {
  it("transitions from idle to connecting on CALL_START", () => {
    const action: CallAction = { type: "CALL_START", callId: "call-123" };
    const result = callReducer(initialState, action);
    expect(result.status).toBe("connecting");
    expect(result.callId).toBe("call-123");
  });

  it("appends transcript message on TRANSCRIPT_DELTA", () => {
    const activeState: CallState = { ...initialState, status: "active", callId: "call-123", transcript: [] };
    const msg = { id: "1", speaker: "caller" as const, text: "Hello", timestamp: "2025-01-01T00:00:00Z" };
    const action: CallAction = { type: "TRANSCRIPT_DELTA", message: msg };
    const result = callReducer(activeState, action);
    expect(result.transcript).toHaveLength(1);
    expect(result.transcript[0].text).toBe("Hello");
  });

  it("resets to idle on CALL_RESET", () => {
    const completeState: CallState = { ...initialState, status: "complete", callId: "call-123" };
    const action: CallAction = { type: "CALL_RESET" };
    const result = callReducer(completeState, action);
    expect(result).toEqual(initialState);
  });
});
```

### Unit Test Rules

1. **Test behavior, not implementation** — Assert on outputs, not internals
2. **One assertion concept per test** — Multiple `expect` calls are fine if testing one behavior
3. **Descriptive test names** — `test_<what>_<condition>_<expected>` or describe what the behavior is
4. **No test interdependence** — Each test runs in isolation
5. **Fast** — Unit tests complete in <5 seconds total
6. **Deterministic** — No randomness, no time-dependent assertions, no network calls

---

## Integration Test Standards

### What Gets Integration Tested

| Integration Point | Test? | Approach |
|-------------------|-------|----------|
| REST endpoints (status codes, response shape) | YES | `httpx` + `pytest` |
| WebSocket lifecycle (connect, message, disconnect) | YES | `pytest-asyncio` |
| Service → Repository flow | YES | In-memory repo, no mocks |
| Frontend → Backend API | NO | Manual testing |
| Backend → OpenAI API | NO | Mock in all tests |

### Integration Test Structure

```python
# test_calls_api.py

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

class TestCallsEndpoint:
    """Integration tests for /api/v1/calls endpoints."""

    async def test_create_call_returns_201(self, client: AsyncClient):
        response = await client.post("/api/v1/calls", json={"scenario_id": "settlement_sarah"})
        assert response.status_code == 201
        body = response.json()
        assert body["success"] is True
        assert "call_id" in body["data"]

    async def test_create_call_invalid_scenario_returns_400(self, client: AsyncClient):
        response = await client.post("/api/v1/calls", json={"scenario_id": ""})
        assert response.status_code == 422  # Pydantic validation

    async def test_get_call_not_found_returns_404(self, client: AsyncClient):
        response = await client.get("/api/v1/calls/nonexistent-id")
        assert response.status_code == 404
        assert response.json()["success"] is False

    async def test_response_envelope_shape(self, client: AsyncClient):
        """All responses follow the standard envelope."""
        response = await client.get("/api/v1/health")
        body = response.json()
        assert "success" in body
        assert "data" in body
        assert "error" in body
        assert "timestamp" in body
```

### Integration Test Rules

1. **Test the contract, not the implementation** — Verify status codes, response shapes, message types
2. **Use the real app instance** — No manual router wiring
3. **Mock external services only** — OpenAI is always mocked; internal services use real code
4. **Clean state between tests** — Reset in-memory repository before each test
5. **Test error paths** — 404s, 422s, WebSocket disconnections

---

## Coverage Requirements

### Targets (Hackathon-Adjusted)

| Layer | Coverage Target | Rationale |
|-------|----------------|-----------|
| Reducers / pure logic | 90%+ | High value, easy to test |
| Pydantic models | 80%+ | Validation correctness |
| Services (mocked AI) | 60%+ | Business logic paths |
| Route handlers | 50%+ | Integration tests cover basic paths |
| Components | 0% | Visual testing via demo |
| Hooks | 0% | Tested through manual integration |

### What Coverage Means Here

- Coverage is a guide, not a gate
- 100% coverage with bad tests is worse than 50% coverage with good tests
- If a test doesn't catch real bugs, delete it

---

## Mocking Rules

### What to Mock

| Dependency | Mock Strategy |
|------------|---------------|
| OpenAI API | Always mock. Return deterministic responses matching Pydantic schemas |
| WebSocket connections | Mock in unit tests, real in integration |
| Time/timestamps | Mock when testing time-dependent logic |
| File system | Never needed (no file I/O in this app) |
| In-memory repository | Never mock — use the real thing (it's already fast) |

### How to Mock AI Services

```python
# conftest.py

import pytest
from unittest.mock import AsyncMock, patch
from app.models.intent import IntentResult

@pytest.fixture
def mock_openai_intent():
    """Mock OpenAI to return a deterministic intent result."""
    mock_response = IntentResult(
        intent="payment_inquiry",
        confidence=0.92,
        signals=["asked about balance", "mentioned payment"]
    )
    with patch("app.services.intent_detection.call_openai", new_callable=AsyncMock) as mock:
        mock.return_value = mock_response
        yield mock
```

### Mocking Anti-Patterns

```python
# BAD — mocking internal implementation details
with patch("app.services.intent_detection._parse_response"):
    ...  # Breaks when implementation changes

# BAD — mocking the thing you're testing
with patch("app.services.intent_detection.detect_intent"):
    ...  # You're testing the mock, not the code

# BAD — not mocking external dependencies
async def test_intent():
    result = await detect_intent(transcript)  # Makes real API call!

# GOOD — mocking at the boundary
with patch("app.services.intent_detection.call_openai") as mock:
    mock.return_value = deterministic_response
    result = await detect_intent(transcript)
    assert result.intent == "payment_inquiry"
```

---

## Regression Testing

### What Constitutes a Regression

- A previously working demo scenario fails
- A WebSocket message format changes without updating the frontend parser
- An API response envelope deviates from the standard
- A Pydantic model rejects data it previously accepted

### Regression Prevention

1. **Demo scenario tests** — At least one automated test per demo scenario
2. **Contract tests** — Response shapes validated in integration tests
3. **Schema tests** — Pydantic model validation tested with known-good data

```python
class TestRegressions:
    """Tests for previously broken behaviors."""

    async def test_intent_handles_empty_transcript(self, mock_openai_intent):
        """Regression: empty transcript used to crash intent detection."""
        result = await detect_intent("", "ACC-2024-7891")
        assert result.intent == "unknown"  # Graceful degradation, not crash

    async def test_score_handles_zero_confidence(self):
        """Regression: zero confidence used to divide by zero in scoring."""
        intent = IntentResult(intent="unknown", confidence=0.0, signals=[])
        score = await calculate_score(intent, account)
        assert score.value >= 0  # No crash, valid score
```

---

## Demo Validation Testing

### The Sacred Happy Path

Before any merge to main, manually verify:

```
□ Start the backend (no errors in console)
□ Start the frontend (no errors in console)  
□ Open dashboard (renders correctly)
□ Click "Start Call" (status changes to connecting → active)
□ Speak into microphone (transcript appears within 2s)
□ Continue speaking (intent badge appears after 3-5 utterances)
□ End call (summary generates)
□ Summary card displays correctly
□ Can start a new call (state resets cleanly)
```

### Demo Scenarios to Validate

| Scenario | Expected Intent | Expected Score |
|----------|----------------|---------------|
| Sarah Mitchell (settlement) | `settlement_offer` | High (70-90) |
| Marcus Johnson (dispute) | `dispute` | Low (20-40) |
| Elena Rodriguez (hardship) | `hardship` | Medium (40-60) |

### Pre-Demo Checklist

```
□ Backend running without errors for 5+ minutes
□ Frontend loads without console errors
□ All 3 scenarios produce correct intents (manual test)
□ Transcript lag is under 2 seconds
□ No visual glitches at demo resolution (1920x1080)
□ Browser microphone permission granted
□ OpenAI API key is active and not rate-limited
```

---

## Test File Locations

```
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures, mocks
│   ├── test_calls_api.py        # REST endpoint tests
│   ├── test_intent_detection.py # Intent service tests
│   ├── test_scoring.py          # Scoring service tests
│   ├── test_models.py           # Pydantic model validation tests
│   └── test_websocket.py        # WebSocket lifecycle tests

frontend/
├── src/
│   ├── context/
│   │   └── __tests__/
│   │       └── call-reducer.test.ts
│   └── lib/
│       └── __tests__/
│           └── utils.test.ts
```

---

## Checklist: Test Health

```
□ Demo happy path passes manually
□ All tests pass (no skipped tests without TODO explanation)
□ No flaky tests (run 3x, same result)
□ AI services are mocked (no real API calls in tests)
□ Tests run in <30 seconds total
□ Test names describe behavior, not implementation
□ New critical-path code has at least one test
□ Regression tests added for any bug fix
```
