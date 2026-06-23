# Testing Skills — RecoverAi

## Purpose

Define testing standards appropriate for a 5-day hackathon. Balance quality assurance with development speed. The demo IS the primary test.

---

## Testing Philosophy

### Hackathon Reality

1. The demo is the ultimate test. If the demo works, the product works.
2. Manual testing of the happy path is the primary quality gate.
3. Automated tests are written only for code that is easy to break and hard to debug.
4. Do NOT write tests for UI rendering — the demo tests that visually.
5. Do NOT write tests for AI prompt quality — run the demo with real prompts to test that.
6. DO write tests for pure logic that multiple developers touch simultaneously.

### What Gets Tested (Priority Order)

1. **State reducer logic** — Pure function, easy to test, easy to break
2. **WebSocket message parsing** — Protocol bugs are hard to debug at runtime
3. **Pydantic model validation** — Ensure contracts match expectations
4. **API endpoint responses** — Status codes and envelope format

### What Does NOT Get Tested

- React component rendering
- Tailwind class application
- AI conversation quality
- Audio capture/playback
- End-to-end integration (tested manually)

---

## Unit Testing Requirements

### Frontend (Vitest)

#### Rules

1. Test pure functions and reducers only
2. Test files live next to the file they test: `call-reducer.test.ts`
3. Use `describe` / `it` blocks with clear descriptions
4. No mocking of React internals — test hooks via integration or skip
5. Run with: `npx vitest --run`

#### What to Test

```typescript
// context/call-reducer.test.ts
import { describe, it, expect } from "vitest";
import { callReducer } from "./call-reducer";
import type { CallState, CallAction } from "@/types";

describe("callReducer", () => {
  const initialState: CallState = {
    callId: null,
    status: "idle",
    transcript: [],
    error: null,
    duration: 0,
  };

  it("transitions from idle to connecting on CALL_INIT", () => {
    const action: CallAction = { type: "CALL_INIT", callId: "call_123" };
    const state = callReducer(initialState, action);
    expect(state.status).toBe("connecting");
    expect(state.callId).toBe("call_123");
  });

  it("adds transcript message on TRANSCRIPT_ADD", () => {
    const activeState = { ...initialState, status: "active" as const };
    const action: CallAction = {
      type: "TRANSCRIPT_ADD",
      message: { id: "1", speaker: "caller", text: "Hello", timestamp: "2025-01-01T00:00:00Z" },
    };
    const state = callReducer(activeState, action);
    expect(state.transcript).toHaveLength(1);
    expect(state.transcript[0].speaker).toBe("caller");
  });

  it("appends text to last AI message on TRANSCRIPT_DELTA", () => {
    const stateWithAiMsg = {
      ...initialState,
      status: "active" as const,
      transcript: [{ id: "1", speaker: "ai" as const, text: "Hello", timestamp: "...", isStreaming: true }],
    };
    const action: CallAction = { type: "TRANSCRIPT_DELTA", speaker: "ai", text: " world" };
    const state = callReducer(stateWithAiMsg, action);
    expect(state.transcript[0].text).toBe("Hello world");
  });

  it("resets state on CALL_RESET", () => {
    const dirtyState = { ...initialState, status: "error" as const, error: "something" };
    const state = callReducer(dirtyState, { type: "CALL_RESET" });
    expect(state).toEqual(initialState);
  });
});
```

### Backend (pytest)

#### Rules

1. Test files in `backend/tests/` directory
2. Use `pytest` with `pytest-asyncio` for async tests
3. Test services with mocked external dependencies (OpenAI, WebSocket)
4. Test API endpoints with `httpx.AsyncClient`
5. Run with: `pytest -v`

#### What to Test

```python
# tests/test_call_repository.py
import pytest
from app.repositories.call_repository import CallRepository
from app.models.call import CallSession

@pytest.fixture
def repo():
    return CallRepository()

def test_create_call(repo):
    call = repo.create_call()
    assert call.call_id is not None
    assert call.status == "idle"
    assert call.transcript == []

def test_get_call_not_found(repo):
    result = repo.get_call("nonexistent")
    assert result is None

def test_add_transcript_entry(repo):
    call = repo.create_call()
    repo.add_transcript(call.call_id, speaker="caller", text="Hello")
    updated = repo.get_call(call.call_id)
    assert len(updated.transcript) == 1
    assert updated.transcript[0].speaker == "caller"
```

```python
# tests/test_api_calls.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_call():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/calls", json={})
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "callId" in data["data"]

@pytest.mark.asyncio
async def test_get_call_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/calls/nonexistent")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
```

---

## Integration Testing Requirements

### Rules

1. Integration tests are manual for this hackathon
2. Use the demo script as the integration test plan
3. Document the test scenario in `docs/demo-script.md`
4. Run integration test before every "done" declaration

### Manual Integration Test Checklist

```markdown
## Pre-Demo Checklist

- [ ] Backend starts without errors: `uvicorn app.main:app --reload`
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Health check passes: GET http://localhost:8000/api/v1/health
- [ ] Start Call button visible and clickable
- [ ] Microphone permission prompt appears
- [ ] AI greeting plays within 3 seconds
- [ ] Transcript shows AI greeting
- [ ] Speaking into mic → AI responds
- [ ] Transcript shows both sides
- [ ] 3+ conversation turns work
- [ ] End Call terminates cleanly
- [ ] Transcript persists after call end
- [ ] New Call resets everything
- [ ] No console errors throughout
```

---

## Mocking Strategy

### Frontend Mocks

1. Mock WebSocket for component development without backend
2. Mock API responses for UI state testing
3. Use `vitest.fn()` for callback testing

```typescript
// __mocks__/websocket.ts
export class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = WebSocket.OPEN;

  send(data: string) { /* noop */ }
  close() { this.onclose?.(); }

  // Test helper: simulate incoming message
  simulateMessage(data: object) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
}
```

### Backend Mocks

1. Mock OpenAI API for service testing without API key
2. Mock WebSocket connections for session handler testing
3. Use `unittest.mock.AsyncMock` for async function mocking

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_openai_ws():
    ws = AsyncMock()
    ws.send = AsyncMock()
    ws.recv = AsyncMock(return_value='{"type": "session.created"}')
    ws.close = AsyncMock()
    return ws
```

---

## Coverage Expectations

### Hackathon Standard (Not Production)

| Layer | Expected Coverage | Rationale |
|-------|------------------|-----------|
| State reducer | 90%+ | Pure logic, easy to test, high breakage risk |
| Repository | 80%+ | Simple CRUD, quick to test |
| API endpoints | Happy path only | Verify status codes and envelope |
| Services | Critical paths only | Mock external deps |
| Components | 0% | Visual testing via demo |
| Hooks | 0% | Integration tested manually |

### Rule

If you can write a meaningful test in under 5 minutes, write it. If it requires complex setup or mocking, skip it and test manually.

---

## Edge Case Testing

### Test Only Edges That Will Appear in Demo

| Edge Case | Where to Test | Priority |
|-----------|---------------|----------|
| Empty transcript | Reducer test | High |
| Duplicate messages | Reducer test | Medium |
| Invalid WebSocket message | Parse function test | High |
| Call not found | API endpoint test | Medium |
| Missing fields in AI response | Model validation test | High |

### Not Worth Testing (For Hackathon)

- Network partition recovery
- Concurrent call collision
- Memory limits
- Browser compatibility edge cases
- Mobile responsiveness

---

## Realtime Testing Strategy

### The Problem

WebSocket + audio + AI = extremely difficult to unit test. Don't fight it.

### The Solution

1. **Unit test the message parsing layer** — given a raw WebSocket message, does it parse correctly?
2. **Unit test the state transitions** — given parsed events, does the reducer produce correct state?
3. **Manually test the actual WebSocket flow** — use the running app
4. **Do NOT mock the OpenAI Realtime API for integration tests** — too complex, too brittle

### What to Unit Test

```python
# tests/test_message_parsing.py
from app.services.transcription import parse_openai_event

def test_parse_transcript_delta():
    event = {
        "type": "response.audio_transcript.delta",
        "delta": "Hello ",
    }
    result = parse_openai_event(event)
    assert result.type == "transcript_delta"
    assert result.text == "Hello "
    assert result.speaker == "ai"

def test_parse_user_transcript_complete():
    event = {
        "type": "conversation.item.input_audio_transcription.completed",
        "transcript": "I want to discuss my balance",
    }
    result = parse_openai_event(event)
    assert result.type == "transcript_complete"
    assert result.speaker == "caller"
    assert result.text == "I want to discuss my balance"

def test_parse_unknown_event_returns_none():
    event = {"type": "some.unknown.event", "data": {}}
    result = parse_openai_event(event)
    assert result is None
```

---

## Test File Organization

```
frontend/
├── src/
│   ├── context/
│   │   ├── call-reducer.ts
│   │   └── call-reducer.test.ts    ← co-located
│   └── lib/
│       ├── utils.ts
│       └── utils.test.ts           ← co-located

backend/
├── tests/
│   ├── conftest.py                 ← shared fixtures
│   ├── test_call_repository.py
│   ├── test_api_calls.py
│   └── test_message_parsing.py
```
