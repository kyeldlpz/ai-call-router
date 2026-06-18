# Testing Strategy — RecoverAi

## Testing Philosophy

This is a 5-day hackathon. The demo is the ultimate test. Automated tests exist to catch regressions in logic that multiple developers touch simultaneously, not to achieve coverage metrics.

**Priority order:**
1. Demo works end-to-end (manual)
2. State logic is correct (unit tests)
3. Message parsing is reliable (unit tests)
4. API contracts are honored (integration tests)
5. AI behaves predictably (scenario tests)

---

## Unit Testing Plan

### Tools
- **Frontend:** Vitest + @testing-library/react (hooks only)
- **Backend:** pytest + pytest-asyncio

### What to Unit Test
- Call state reducer (all transitions)
- Transcript accumulation logic
- WebSocket message parsing
- Utility functions (formatters, validators)
- Pydantic model validation
- Repository CRUD operations

### What NOT to Unit Test
- React component rendering
- Tailwind class application
- Audio capture/playback (browser API)
- Full WebSocket connection lifecycle
- AI response quality

---

## Integration Testing Plan

### Tools
- **Backend:** httpx.AsyncClient (in-process) + pytest
- **Frontend → Backend:** Manual testing with both running

### What to Integration Test
- REST endpoint request/response contracts
- WebSocket connection handshake
- Call lifecycle: create → get → end
- Error responses for invalid requests
- CORS headers present

---

## AI Testing Plan

### Approach
AI testing is scenario-based manual testing. You cannot unit test AI quality — you demo it.

### What to Test
- System prompt produces appropriate greeting
- AI maintains conversational context across turns
- AI does not hallucinate account data not in context
- AI stays within tone guidelines (professional, empathetic)
- AI responds within latency budget (< 3 seconds)
- AI handles silence gracefully

---

## Transcript Accuracy Testing

### What to Test
- Transcript messages arrive in correct order
- Speaker labels (ai/caller) are correct
- Streaming deltas accumulate correctly
- Complete messages have all required fields
- Timestamps are present and monotonically increasing
- No duplicate messages in transcript

---

## Voice Conversation Testing

### What to Test (Manual)
- Microphone capture starts on user gesture
- Audio reaches OpenAI (AI responds meaningfully)
- AI audio plays back through speakers
- Multi-turn conversation maintains context
- Call terminates cleanly on End Call

---

## UI Testing

### What to Test (Manual + Visual)
- Button states change correctly through call lifecycle
- Transcript auto-scrolls on new messages
- Status badge colors match call state
- Error messages appear and are dismissible
- Loading states display during connection
- Empty states show when no data

---

## Edge Case Testing

### Critical Edges to Test

| Edge Case | Test Method | Priority |
|-----------|-------------|----------|
| Microphone denied | Manual | High |
| WebSocket drops mid-call | Manual disconnect | High |
| Double-click Start Call | Unit test (button disabled) | Medium |
| Empty transcript after call | Unit test (reducer) | Medium |
| Very fast speech | Manual | Low |
| Long silence (30s+) | Manual | Low |
| Browser tab hidden during call | Manual | Low |

---

## Demo Validation Checklist

Run this before every demo:

```
□ Backend health check: GET http://localhost:8000/api/v1/health → 200
□ Frontend loads: http://localhost:3000 → Dashboard visible
□ Start Call → AI greets within 3s
□ Speak → AI responds within 3s
□ Transcript shows both sides correctly labeled
□ 3+ conversation turns work without error
□ End Call → Clean termination
□ Transcript persists after call
□ New Call → Fresh state
□ No console errors throughout
□ UI looks polished (no broken layouts)
```

---

## Unit Test Cases

### State Reducer Tests

#### UT-001: Initial state is idle
- **Scenario:** Reducer initialized
- **Expected:** `status: "idle"`, `callId: null`, `transcript: []`, `error: null`, `duration: 0`

#### UT-002: CALL_INIT transitions idle to connecting
- **Scenario:** Dispatch `CALL_INIT` with callId from idle state
- **Expected:** `status: "connecting"`, `callId: "call_123"`

#### UT-003: CALL_CONNECTED transitions connecting to active
- **Scenario:** Dispatch `CALL_CONNECTED` from connecting state
- **Expected:** `status: "active"`

#### UT-004: CALL_ENDING transitions active to ending
- **Scenario:** Dispatch `CALL_ENDING` from active state
- **Expected:** `status: "ending"`

#### UT-005: CALL_COMPLETE transitions ending to complete
- **Scenario:** Dispatch `CALL_COMPLETE` from ending state
- **Expected:** `status: "complete"`

#### UT-006: CALL_ERROR sets error state
- **Scenario:** Dispatch `CALL_ERROR` with message from any state
- **Expected:** `status: "error"`, `error: "Connection failed"`

#### UT-007: CALL_RESET returns to initial state
- **Scenario:** Dispatch `CALL_RESET` from error state
- **Expected:** Full initial state restored

#### UT-008: TRANSCRIPT_ADD appends caller message
- **Scenario:** Dispatch `TRANSCRIPT_ADD` with caller message
- **Expected:** Transcript array length increases by 1, message has `speaker: "caller"`

#### UT-009: TRANSCRIPT_ADD appends AI complete message
- **Scenario:** Dispatch `TRANSCRIPT_ADD` with AI message
- **Expected:** Message added with `speaker: "ai"`, `isStreaming: false`

#### UT-010: TRANSCRIPT_DELTA creates new AI streaming message
- **Scenario:** Dispatch `TRANSCRIPT_DELTA` when no streaming message exists
- **Expected:** New message created with `speaker: "ai"`, `isStreaming: true`, text is delta content

#### UT-011: TRANSCRIPT_DELTA appends to existing streaming message
- **Scenario:** Dispatch `TRANSCRIPT_DELTA` when last message is streaming AI
- **Expected:** Last message text extended, still `isStreaming: true`

#### UT-012: DURATION_TICK increments duration
- **Scenario:** Dispatch `DURATION_TICK` when active
- **Expected:** `duration` increases by 1

#### UT-013: Invalid transition ignored
- **Scenario:** Dispatch `CALL_CONNECTED` from idle (should be from connecting)
- **Expected:** State unchanged (guard clause)

### WebSocket Message Parsing Tests

#### UT-014: Parse transcript_delta message
- **Scenario:** Receive `{ type: "transcript_delta", data: { speaker: "ai", text: "Hello " }, timestamp: "...", sequence: 1 }`
- **Expected:** Parsed correctly with type, speaker, text extracted

#### UT-015: Parse transcript_complete message
- **Scenario:** Receive `{ type: "transcript_complete", data: { id: "msg_1", speaker: "caller", text: "Hi there", timestamp: "..." }, ... }`
- **Expected:** Full TranscriptMessage object with all fields

#### UT-016: Parse call_status message
- **Scenario:** Receive `{ type: "call_status", data: { status: "active" }, ... }`
- **Expected:** Status extracted as string

#### UT-017: Parse error message
- **Scenario:** Receive `{ type: "error", data: { message: "AI service error" }, ... }`
- **Expected:** Error message string extracted

#### UT-018: Handle unknown message type gracefully
- **Scenario:** Receive `{ type: "unknown_event", data: {}, ... }`
- **Expected:** Returns null/undefined, no crash

#### UT-019: Handle malformed JSON gracefully
- **Scenario:** Receive non-JSON string on WebSocket
- **Expected:** Logged as warning, no crash, no state change

#### UT-020: Handle missing fields in message
- **Scenario:** Receive `{ type: "transcript_delta" }` (missing data field)
- **Expected:** Graceful handling, no crash

### Backend Unit Tests

#### UT-021: CallRepository create_call generates unique ID
- **Scenario:** Create two calls
- **Expected:** Both have unique `call_id` values

#### UT-022: CallRepository get_call returns None for missing ID
- **Scenario:** Get call with nonexistent ID
- **Expected:** Returns None

#### UT-023: CallRepository add_transcript appends entry
- **Scenario:** Add transcript entry to existing call
- **Expected:** Call's transcript array length increases

#### UT-024: CallCreate model validates scenario
- **Scenario:** Create with invalid scenario name
- **Expected:** Validation error raised

#### UT-025: TranscriptEntry model requires all fields
- **Scenario:** Create TranscriptEntry without speaker field
- **Expected:** Validation error raised

---

## Integration Test Cases

### REST API Tests

#### IT-001: POST /api/v1/calls creates call
- **Request:** `POST /api/v1/calls` with `{}`
- **Expected:** 201, response has `success: true`, `data.callId` exists, `data.websocketUrl` exists

#### IT-002: POST /api/v1/calls with scenario
- **Request:** `POST /api/v1/calls` with `{ "scenario": "settlement_sarah" }`
- **Expected:** 201, call created with scenario context

#### IT-003: POST /api/v1/calls with invalid scenario
- **Request:** `POST /api/v1/calls` with `{ "scenario": "nonexistent" }`
- **Expected:** 422, validation error

#### IT-004: GET /api/v1/calls/{call_id} returns call
- **Setup:** Create a call first
- **Request:** `GET /api/v1/calls/{created_call_id}`
- **Expected:** 200, response has call data with status and transcript

#### IT-005: GET /api/v1/calls/{call_id} not found
- **Request:** `GET /api/v1/calls/nonexistent_id`
- **Expected:** 404, `success: false`, error message

#### IT-006: POST /api/v1/calls/{call_id}/end ends call
- **Setup:** Create a call
- **Request:** `POST /api/v1/calls/{call_id}/end`
- **Expected:** 200, call status becomes "complete"

#### IT-007: POST /api/v1/calls/{call_id}/end for nonexistent call
- **Request:** `POST /api/v1/calls/fake_id/end`
- **Expected:** 404

#### IT-008: GET /api/v1/health returns OK
- **Request:** `GET /api/v1/health`
- **Expected:** 200, `{ "success": true, "data": { "status": "ok" } }`

#### IT-009: CORS headers present on response
- **Request:** Any endpoint with Origin header set to localhost:3000
- **Expected:** `Access-Control-Allow-Origin` header present

#### IT-010: Response envelope format consistent
- **Request:** Multiple different endpoints
- **Expected:** All responses have `success`, `data`, `error`, `timestamp` fields

### WebSocket Integration Tests

#### IT-011: WebSocket connects for valid call_id
- **Setup:** Create call via REST
- **Request:** WebSocket connect to `/ws/v1/call/{call_id}`
- **Expected:** Connection accepted

#### IT-012: WebSocket rejects for invalid call_id
- **Request:** WebSocket connect to `/ws/v1/call/nonexistent`
- **Expected:** Connection rejected or error message sent

#### IT-013: WebSocket sends call_status on connection
- **Setup:** Connect WebSocket for valid call
- **Expected:** First message is `{ type: "call_status", data: { status: "active" } }`

#### IT-014: WebSocket handles call_end message
- **Setup:** Connected WebSocket
- **Request:** Send `{ type: "call_end", data: {} }`
- **Expected:** Connection closes cleanly

#### IT-015: WebSocket handles invalid message format
- **Setup:** Connected WebSocket
- **Request:** Send `{ "garbage": true }`
- **Expected:** No crash, connection stays open or closes gracefully

---

## AI Conversation Test Cases

### Voice Interaction Scenarios

#### AI-001: AI produces greeting on session start
- **Scenario:** Connect to OpenAI Realtime API with system prompt
- **Expected:** AI generates audio greeting within 3 seconds
- **Validation:** Audio event received, transcript contains greeting text

#### AI-002: AI responds to "I want to pay my bill"
- **Scenario:** User says "I want to pay my bill"
- **Expected:** AI acknowledges and asks clarifying questions about the account
- **Validation:** Response is contextually relevant, professional tone

#### AI-003: AI responds to "I dispute this charge"
- **Scenario:** User says "I dispute this charge, I already paid"
- **Expected:** AI acknowledges the dispute, asks for details
- **Validation:** AI does NOT argue or threaten, shows empathy

#### AI-004: AI responds to "I lost my job"
- **Scenario:** User says "I lost my job and can't pay"
- **Expected:** AI responds with empathy, mentions options
- **Validation:** Tone is compassionate, no pressure

#### AI-005: AI maintains context across turns
- **Scenario:** Turn 1: "My name is Sarah" → Turn 2: "What's my name?"
- **Expected:** AI remembers the name from earlier in conversation
- **Validation:** AI references "Sarah" in response

#### AI-006: AI does not hallucinate account data
- **Scenario:** Ask AI "What's my balance?" without providing account context
- **Expected:** AI says it needs to look that up or asks for account number
- **Validation:** AI does NOT invent a balance number

#### AI-007: AI stays within role boundaries
- **Scenario:** User asks "What's the weather today?"
- **Expected:** AI redirects to account-related topics
- **Validation:** AI does not answer off-topic questions

#### AI-008: AI handles silence gracefully
- **Scenario:** 15 seconds of silence after AI speaks
- **Expected:** AI prompts "Are you still there?" or waits patiently
- **Validation:** No crash, no repeated responses

#### AI-009: AI keeps responses concise
- **Scenario:** Normal conversation turn
- **Expected:** AI responds in 2-3 sentences max
- **Validation:** Response length under 50 words per turn

#### AI-010: AI does not promise specific settlements
- **Scenario:** User says "Can I settle for 50%?"
- **Expected:** AI says an agent will follow up with options
- **Validation:** AI does NOT say "Yes, we can do 50%"

---

## UI Test Cases (Manual)

#### UI-001: Start Call button visible on page load
- **Scenario:** Navigate to dashboard
- **Expected:** Green "Start Call" button visible, enabled

#### UI-002: Button disables during connecting
- **Scenario:** Click Start Call
- **Expected:** Button shows loading/disabled state, prevents double-click

#### UI-003: Status badge shows connecting with pulse
- **Scenario:** Call is connecting
- **Expected:** Yellow badge with pulse animation showing "Connecting..."

#### UI-004: Status badge shows active with green
- **Scenario:** Call connected
- **Expected:** Green badge showing "Active"

#### UI-005: End Call button appears when active
- **Scenario:** Call is active
- **Expected:** Red "End Call" button visible, Start Call hidden

#### UI-006: Duration timer counts up during active call
- **Scenario:** Call active for 10 seconds
- **Expected:** Timer shows "0:10" and increments every second

#### UI-007: Transcript panel shows AI message with correct styling
- **Scenario:** AI speaks during call
- **Expected:** Message appears with AI icon, label, distinct background color

#### UI-008: Transcript panel shows Caller message with correct styling
- **Scenario:** Caller speaks during call
- **Expected:** Message appears with Caller icon, label, different background from AI

#### UI-009: Transcript auto-scrolls to latest message
- **Scenario:** Multiple messages arrive (scrollable area)
- **Expected:** Panel scrolls to bottom showing latest message

#### UI-010: Microphone permission error displays alert
- **Scenario:** Deny microphone permission
- **Expected:** Alert component shows "Microphone access required" with instructions

---

## Test Execution Commands

### Frontend
```bash
# Run all unit tests (single run, no watch)
cd frontend
npx vitest --run

# Run specific test file
npx vitest --run src/context/call-reducer.test.ts
```

### Backend
```bash
# Run all tests
cd backend
pytest -v

# Run specific test file
pytest tests/test_call_repository.py -v

# Run with output
pytest -v -s
```

### Manual Integration (Demo Test)
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Health check
curl http://localhost:8000/api/v1/health

# Then: open http://localhost:3000 and run demo checklist
```

---

## Test Priority Matrix

| Priority | Category | Count | When to Run |
|----------|----------|-------|-------------|
| P0 | Demo validation checklist | 11 checks | Before every demo |
| P1 | State reducer unit tests | 13 tests | On every commit to state logic |
| P2 | Message parsing unit tests | 7 tests | On every commit to WS handling |
| P3 | API integration tests | 15 tests | On every commit to backend |
| P4 | AI scenario tests | 10 tests | Once per day during dev |
| P5 | UI manual tests | 10 tests | Before demo day |

---

## Test Data

### Mock WebSocket Messages (for unit tests)

```typescript
export const MOCK_MESSAGES = {
  callStatusActive: {
    type: "call_status",
    data: { status: "active" },
    timestamp: "2025-06-18T10:00:00.000Z",
    sequence: 1,
  },
  transcriptDeltaAi: {
    type: "transcript_delta",
    data: { speaker: "ai", text: "Hello, " },
    timestamp: "2025-06-18T10:00:01.000Z",
    sequence: 2,
  },
  transcriptCompleteAi: {
    type: "transcript_complete",
    data: {
      id: "msg_001",
      speaker: "ai",
      text: "Hello, this is the RecoverAi recovery team. How can I help you today?",
      timestamp: "2025-06-18T10:00:02.000Z",
    },
    timestamp: "2025-06-18T10:00:02.000Z",
    sequence: 3,
  },
  transcriptCompleteCaller: {
    type: "transcript_complete",
    data: {
      id: "msg_002",
      speaker: "caller",
      text: "Hi, I'm calling about my account balance.",
      timestamp: "2025-06-18T10:00:08.000Z",
    },
    timestamp: "2025-06-18T10:00:08.000Z",
    sequence: 4,
  },
  errorMessage: {
    type: "error",
    data: { message: "AI service temporarily unavailable" },
    timestamp: "2025-06-18T10:00:10.000Z",
    sequence: 5,
  },
};
```

### Mock API Responses (for frontend tests)

```typescript
export const MOCK_API = {
  createCallSuccess: {
    success: true,
    data: { callId: "call_test_123", status: "idle", websocketUrl: "/ws/v1/call/call_test_123" },
    error: null,
    timestamp: "2025-06-18T10:00:00.000Z",
  },
  getCallComplete: {
    success: true,
    data: {
      callId: "call_test_123",
      status: "complete",
      startedAt: "2025-06-18T10:00:00.000Z",
      endedAt: "2025-06-18T10:02:30.000Z",
      durationSeconds: 150,
      transcript: [
        { id: "msg_001", speaker: "ai", text: "Hello, how can I help?", timestamp: "2025-06-18T10:00:02.000Z" },
        { id: "msg_002", speaker: "caller", text: "I want to pay my bill.", timestamp: "2025-06-18T10:00:08.000Z" },
      ],
    },
    error: null,
    timestamp: "2025-06-18T10:02:35.000Z",
  },
  notFound: {
    success: false,
    data: null,
    error: "Call not found",
    timestamp: "2025-06-18T10:00:00.000Z",
  },
};
```
