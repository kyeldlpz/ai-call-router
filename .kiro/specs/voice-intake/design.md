# Voice Intake MVP — Technical Design

## Architecture Overview

The Voice Intake MVP is a three-layer real-time system:

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                         │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Call UI  │    │ Audio Capture│    │ Transcript Panel      │  │
│  │ Controls │    │ (getUserMedia)│   │ (Live streaming text) │  │
│  └────┬─────┘    └──────┬───────┘    └───────────▲───────────┘  │
│       │                  │                        │              │
│       │         ┌────────▼────────────────────────┤              │
│       │         │     WebSocket Client            │              │
│       └─────────┤  (audio out / transcript in)    │              │
│                 └────────────┬─────────────────────┘              │
└──────────────────────────────┼───────────────────────────────────┘
                               │ WebSocket
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │              WebSocket Session Handler                        │ │
│  │   - Receives audio chunks from browser                       │ │
│  │   - Forwards to OpenAI Realtime API                          │ │
│  │   - Receives AI audio + transcript from OpenAI               │ │
│  │   - Streams transcript back to browser                       │ │
│  │   - Streams AI audio back to browser                         │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │              OpenAI Realtime API Client                       │ │
│  │   - WebSocket connection to OpenAI                           │ │
│  │   - Sends audio input events                                 │ │
│  │   - Receives response audio + transcript events              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              In-Memory Call Store                             │ │
│  │   - Active call state                                        │ │
│  │   - Transcript accumulation                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Decision:** The backend acts as a relay between the browser and OpenAI Realtime API. The browser does NOT connect directly to OpenAI. This is intentional because:
1. API keys must not be exposed to the browser
2. The backend can intercept transcript events for storage
3. Future features (intent detection, scoring) hook into this relay without frontend changes

---

## Voice Conversation Architecture

### OpenAI Realtime API Integration

The OpenAI Realtime API operates over WebSocket with a specific event protocol. Our backend maintains a persistent WebSocket to OpenAI for the duration of each call.

**Connection Model:**
```
Browser ←WebSocket→ FastAPI ←WebSocket→ OpenAI Realtime API
```

**Audio Format:**
- Input: PCM 16-bit, 24kHz, mono (from browser via MediaRecorder or AudioWorklet)
- Output: PCM 16-bit, 24kHz, mono (from OpenAI, played in browser)

**Decision:** Use AudioWorklet for capturing raw PCM from the microphone. MediaRecorder produces compressed formats (webm/opus) which require transcoding. AudioWorklet gives us raw PCM directly, matching OpenAI's expected input format.

### OpenAI Realtime API Event Flow

**Session Setup (on call start):**
```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "<system prompt>",
    "voice": "sage",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "gpt-4o-mini-transcribe"
    },
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    }
  }
}
```

**Key Events We Send:**
| Event | Purpose |
|-------|---------|
| `session.update` | Configure session at start |
| `input_audio_buffer.append` | Stream user audio chunks |

**Key Events We Receive:**
| Event | Purpose |
|-------|---------|
| `session.created` | Confirm session is ready |
| `response.audio.delta` | AI audio chunk to play |
| `response.audio_transcript.delta` | AI speech transcript chunk |
| `conversation.item.input_audio_transcription.completed` | User speech transcript complete |
| `response.done` | AI finished responding |
| `error` | Something went wrong |

**Decision:** Use `server_vad` (Voice Activity Detection) for turn detection. This means OpenAI automatically detects when the user stops speaking and triggers the AI response. No manual "push to talk" needed.

---

## Frontend Design

### Page Layout

Single page application (dashboard). Layout:

```
┌─────────────────────────────────────────────────────┐
│  Header: "RecoverAi" logo + call status badge       │
├─────────────────────────┬───────────────────────────┤
│                         │                           │
│    Call Panel            │    Transcript Panel       │
│                         │                           │
│  ┌───────────────────┐  │  ┌─────────────────────┐ │
│  │                   │  │  │ AI: Hello, this is   │ │
│  │   Call Status     │  │  │ the recovery team... │ │
│  │   Indicator       │  │  │                     │ │
│  │                   │  │  │ Caller: Hi, I'm     │ │
│  │   [Start Call]    │  │  │ calling about my    │ │
│  │   [End Call]      │  │  │ account...          │ │
│  │                   │  │  │                     │ │
│  │   Duration: 0:42  │  │  │ AI: Of course, I'd  │ │
│  │                   │  │  │ be happy to help... │ │
│  └───────────────────┘  │  └─────────────────────┘ │
│                         │                           │
├─────────────────────────┴───────────────────────────┤
│  Footer: Connection status indicator                 │
└─────────────────────────────────────────────────────┘
```

**Decision:** Two-column layout. Left column is the call control panel (small). Right column is the transcript panel (large, takes 60-70% width). This prioritizes the transcript as the primary visual during demos.

### Component Hierarchy

```
app/page.tsx
└── DashboardLayout
    ├── Header
    │   ├── Logo
    │   └── CallStatusBadge
    ├── MainContent (grid: 2 columns)
    │   ├── CallPanel
    │   │   ├── CallStatusIndicator
    │   │   ├── CallControls (Start/End buttons)
    │   │   └── CallDuration
    │   └── TranscriptPanel
    │       └── TranscriptMessage[] (mapped)
    └── Footer
        └── ConnectionStatus
```

---

## Backend Design

### FastAPI Application Structure

```python
# main.py - App creation
app = FastAPI(title="RecoverAi API", version="0.1.0")

# Routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(calls_router, prefix="/api/v1")
app.add_api_websocket_route("/ws/v1/call/{call_id}", call_session_handler)
```

### WebSocket Session Handler

The session handler is the core of the backend. It manages bidirectional audio/transcript relay:

```python
async def call_session_handler(websocket: WebSocket, call_id: str):
    """
    1. Accept browser WebSocket
    2. Open WebSocket to OpenAI Realtime API
    3. Send session.update with system prompt
    4. Run two concurrent tasks:
       a. Browser → OpenAI (forward audio chunks)
       b. OpenAI → Browser (forward audio + transcript)
    5. On disconnect, clean up both connections
    """
```

**Decision:** Use `asyncio.gather` to run the two relay directions concurrently. Each direction is an independent async loop. When either side disconnects, both are cancelled.

### REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/calls` | Create a new call (returns call_id) |
| `GET` | `/api/v1/calls/{call_id}` | Get call state and transcript |
| `POST` | `/api/v1/calls/{call_id}/end` | End a call |

**Decision:** Call creation happens via REST (returns a `call_id`), then the WebSocket connects using that `call_id`. This separates call lifecycle management from the audio stream.

---

## Conversation Lifecycle

```
┌─────────┐     ┌────────────┐     ┌────────┐     ┌────────────┐     ┌──────────┐
│  IDLE   │────▶│ CONNECTING │────▶│ ACTIVE │────▶│ ENDING     │────▶│ COMPLETE │
└─────────┘     └────────────┘     └────────┘     └────────────┘     └──────────┘
     ▲                │                  │                                  │
     │                ▼                  ▼                                  │
     │          ┌──────────┐       ┌──────────┐                            │
     └──────────│  ERROR   │       │  ERROR   │────────────────────────────┘
                └──────────┘       └──────────┘        (can reset to IDLE)
```

**State Transitions:**
| From | To | Trigger |
|------|----|---------|
| IDLE | CONNECTING | User clicks "Start Call" |
| CONNECTING | ACTIVE | OpenAI session.created received |
| ACTIVE | ENDING | User clicks "End Call" |
| ENDING | COMPLETE | WebSocket closed cleanly |
| CONNECTING | ERROR | Connection timeout or failure |
| ACTIVE | ERROR | WebSocket disconnect |
| ERROR | IDLE | User clicks "Reset" or starts new call |
| COMPLETE | IDLE | User clicks "New Call" |

---

## Transcript Lifecycle

```
Speech Detected (OpenAI VAD)
    │
    ▼
Audio Streamed to OpenAI
    │
    ├──▶ AI Response Audio Chunks (streamed to browser for playback)
    │
    ├──▶ User Transcript (conversation.item.input_audio_transcription.completed)
    │         │
    │         ▼
    │    Add to transcript array with speaker="caller"
    │
    └──▶ AI Transcript Deltas (response.audio_transcript.delta)
              │
              ▼
         Accumulate deltas → on response.done, add to transcript with speaker="ai"
```

**Decision:** User transcripts arrive as complete messages (after VAD detects end of speech). AI transcripts arrive as deltas (word by word). For the frontend:
- User messages: displayed as complete messages when received
- AI messages: displayed progressively as deltas arrive (creates the real-time streaming effect)

---

## State Management

### Frontend State (React Context + useReducer)

```typescript
// State shape
interface CallState {
  callId: string | null;
  status: "idle" | "connecting" | "active" | "ending" | "complete" | "error";
  transcript: TranscriptMessage[];
  error: string | null;
  duration: number; // seconds
}

// Actions
type CallAction =
  | { type: "CALL_INIT"; callId: string }
  | { type: "CALL_CONNECTED" }
  | { type: "TRANSCRIPT_ADD"; message: TranscriptMessage }
  | { type: "TRANSCRIPT_DELTA"; speaker: "ai"; text: string }
  | { type: "CALL_ENDING" }
  | { type: "CALL_COMPLETE" }
  | { type: "CALL_ERROR"; error: string }
  | { type: "CALL_RESET" }
  | { type: "DURATION_TICK" };
```

**Decision:** `TRANSCRIPT_DELTA` is a separate action for AI streaming. It appends text to the last AI message in the transcript. `TRANSCRIPT_ADD` creates a new complete message (used for caller messages and to finalize AI messages).

### Backend State (In-Memory)

```python
# Simple dictionary store
active_calls: dict[str, CallSession] = {}

@dataclass
class CallSession:
    call_id: str
    status: str  # idle, active, complete
    transcript: list[TranscriptEntry]
    started_at: datetime
    ended_at: datetime | None
    openai_ws: WebSocket | None  # Connection to OpenAI
    browser_ws: WebSocket | None  # Connection to browser
```

---

## Data Models

### Backend Models (Pydantic)

```python
# models/call.py
class CallCreate(BaseModel):
    """Request to create a new call"""
    scenario: str | None = None  # Optional: use a pre-built mock scenario

class CallResponse(BaseModel):
    """Call state response"""
    call_id: str
    status: str
    started_at: str
    ended_at: str | None
    transcript: list[TranscriptEntry]
    duration_seconds: int

class TranscriptEntry(BaseModel):
    """Single transcript message"""
    id: str
    speaker: Literal["ai", "caller"]
    text: str
    timestamp: str
```

### Frontend Types

```typescript
// types/index.ts
export type CallStatus = "idle" | "connecting" | "active" | "ending" | "complete" | "error";

export interface CallState {
  callId: string | null;
  status: CallStatus;
  transcript: TranscriptMessage[];
  error: string | null;
  duration: number;
}

export interface TranscriptMessage {
  id: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: string;
  isStreaming?: boolean; // true while AI message is still receiving deltas
}
```

---

## API Contracts

### POST /api/v1/calls

Create a new call session.

**Request:**
```json
{
  "scenario": "settlement_sarah"  // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "call_id": "call_abc123",
    "status": "idle",
    "websocket_url": "/ws/v1/call/call_abc123"
  },
  "error": null,
  "timestamp": "2025-06-18T10:00:00Z"
}
```

### GET /api/v1/calls/{call_id}

Get call state and transcript.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "call_id": "call_abc123",
    "status": "complete",
    "started_at": "2025-06-18T10:00:00Z",
    "ended_at": "2025-06-18T10:02:30Z",
    "duration_seconds": 150,
    "transcript": [
      {
        "id": "msg_001",
        "speaker": "ai",
        "text": "Hello, this is the RecoverAi recovery team...",
        "timestamp": "2025-06-18T10:00:02Z"
      },
      {
        "id": "msg_002",
        "speaker": "caller",
        "text": "Hi, I'm calling about my account balance.",
        "timestamp": "2025-06-18T10:00:08Z"
      }
    ]
  },
  "error": null,
  "timestamp": "2025-06-18T10:02:35Z"
}
```

### WebSocket /ws/v1/call/{call_id}

**Messages from Backend → Browser:**

```json
// Call connected
{ "type": "call_status", "data": { "status": "active" }, "timestamp": "...", "sequence": 1 }

// AI transcript delta (streaming)
{ "type": "transcript_delta", "data": { "speaker": "ai", "text": "Hello, " }, "timestamp": "...", "sequence": 2 }
{ "type": "transcript_delta", "data": { "speaker": "ai", "text": "this is " }, "timestamp": "...", "sequence": 3 }

// AI transcript complete
{ "type": "transcript_complete", "data": { "id": "msg_001", "speaker": "ai", "text": "Hello, this is the recovery team.", "timestamp": "..." }, "timestamp": "...", "sequence": 4 }

// Caller transcript (arrives complete)
{ "type": "transcript_complete", "data": { "id": "msg_002", "speaker": "caller", "text": "Hi, I'm calling about my account.", "timestamp": "..." }, "timestamp": "...", "sequence": 5 }

// AI audio chunk (base64 encoded PCM)
{ "type": "audio_delta", "data": { "audio": "<base64 PCM>" }, "timestamp": "...", "sequence": 6 }

// Error
{ "type": "error", "data": { "message": "Connection lost to AI service" }, "timestamp": "...", "sequence": 7 }
```

**Messages from Browser → Backend:**

```json
// Audio chunk from microphone (base64 encoded PCM)
{ "type": "audio_input", "data": { "audio": "<base64 PCM>" } }

// End call signal
{ "type": "call_end", "data": {} }
```

---

## Component Design

### CallPanel Component

```
┌─────────────────────────────┐
│  ● IDLE                     │  ← Status badge (color-coded)
│                             │
│     ┌─────────────────┐    │
│     │   🎙️ Start Call  │    │  ← Primary action button
│     └─────────────────┘    │
│                             │
│  Duration: --:--            │  ← Timer (shows 00:00 when active)
└─────────────────────────────┘
```

States:
- **Idle:** Green "Start Call" button, no duration
- **Connecting:** Pulsing indicator, "Connecting..." text, button disabled
- **Active:** Red "End Call" button, running duration timer
- **Complete:** "New Call" button, final duration shown
- **Error:** Error message + "Try Again" button

### TranscriptPanel Component

```
┌─────────────────────────────────────────┐
│  Live Transcript                         │
├─────────────────────────────────────────┤
│                                          │
│  🤖 AI Agent                    10:00:02 │
│  Hello, this is the RecoverAi recovery   │
│  team. How can I help you today?         │
│                                          │
│  👤 Caller                      10:00:08 │
│  Hi, I'm calling about my account        │
│  balance. I received a letter...         │
│                                          │
│  🤖 AI Agent                    10:00:12 │
│  Of course, I'd be happy to help you     │
│  with that. Could you provide me with... │  ← Streaming (animated cursor)
│                                          │
└─────────────────────────────────────────┘
```

Features:
- Auto-scroll to bottom on new messages
- Animated typing indicator for streaming AI responses
- Distinct visual styling for AI vs Caller messages
- Timestamp on each message
- Empty state: "Start a call to see the transcript"

---

## Sequence Diagrams

### Call Start Sequence

```
User          Browser         FastAPI         OpenAI
 │               │               │               │
 │ Click Start   │               │               │
 │──────────────▶│               │               │
 │               │ POST /calls   │               │
 │               │──────────────▶│               │
 │               │  {call_id}    │               │
 │               │◀──────────────│               │
 │               │               │               │
 │               │ WS Connect    │               │
 │               │──────────────▶│               │
 │               │               │ WS Connect    │
 │               │               │──────────────▶│
 │               │               │ session.update│
 │               │               │──────────────▶│
 │               │               │               │
 │               │               │session.created│
 │               │               │◀──────────────│
 │               │ call_status:  │               │
 │               │ active        │               │
 │               │◀──────────────│               │
 │               │               │               │
 │               │               │ AI greeting   │
 │               │               │ (audio+text)  │
 │               │audio_delta    │◀──────────────│
 │               │◀──────────────│               │
 │  Play audio   │               │               │
 │◀──────────────│               │               │
 │               │transcript_    │               │
 │               │delta          │               │
 │               │◀──────────────│               │
 │  Show text    │               │               │
 │◀──────────────│               │               │
```

### Conversation Turn Sequence

```
User          Browser         FastAPI         OpenAI
 │               │               │               │
 │ Speaks        │               │               │
 │──────────────▶│               │               │
 │               │ audio_input   │               │
 │               │──────────────▶│               │
 │               │               │input_audio_   │
 │               │               │buffer.append  │
 │               │               │──────────────▶│
 │               │               │               │
 │               │               │  (VAD detects │
 │               │               │   end of turn)│
 │               │               │               │
 │               │               │ transcription │
 │               │               │ .completed    │
 │               │               │◀──────────────│
 │               │transcript_    │               │
 │               │complete       │               │
 │               │(caller)       │               │
 │               │◀──────────────│               │
 │               │               │               │
 │               │               │response.audio │
 │               │               │.delta (chunks)│
 │               │               │◀──────────────│
 │               │audio_delta    │               │
 │               │◀──────────────│               │
 │  Play audio   │               │               │
 │◀──────────────│               │               │
 │               │               │response.audio │
 │               │               │_transcript    │
 │               │transcript_    │.delta         │
 │               │delta (ai)     │◀──────────────│
 │               │◀──────────────│               │
 │  Show text    │               │               │
 │◀──────────────│               │               │
```

---

## Error Handling

### Frontend Error Strategy

| Error | Detection | User Experience |
|-------|-----------|-----------------|
| Microphone denied | `getUserMedia` rejection | Alert: "Microphone required" + instructions |
| WebSocket connect fail | `onerror` / `onclose` before open | Toast: "Connection failed. Retrying..." |
| WebSocket drop mid-call | `onclose` during active state | Banner: "Connection lost" + auto-retry (3x) |
| Audio playback failure | AudioContext error | Silent failure (transcript still works) |
| Server error message | WebSocket `error` type message | Toast with error text |

### Backend Error Strategy

| Error | Detection | Response |
|-------|-----------|----------|
| OpenAI WS connect fail | Connection timeout/rejection | Send `error` message to browser, close session |
| OpenAI WS drop mid-call | `on_close` event | Attempt reconnection once, then send error to browser |
| Invalid audio data | Decode failure | Log warning, skip chunk, continue |
| Call not found | Missing `call_id` in store | HTTP 404 |
| Unexpected OpenAI event | Unknown event type | Log and ignore |

---

## Mock Data Strategy

### System Prompt (Voice Agent Persona)

```
You are a professional collections intake specialist at RecoverAi.
You answer inbound calls from customers who have outstanding accounts.

Your role:
- Greet callers warmly and professionally
- Ask how you can help them today
- Listen to their situation with empathy
- Ask clarifying questions about their account
- Acknowledge their concerns
- Let them know an agent will follow up with next steps

Your tone: Professional, empathetic, helpful. Never threatening or aggressive.
You work for a recovery services company helping people resolve their accounts.

Keep responses concise (2-3 sentences max per turn).
Do not make promises about payment plans or settlements.
Do not ask for sensitive information like SSN or full credit card numbers.
```

### Mock Scenarios (Optional Pre-seeded Context)

For demos, the system prompt can be extended with account context:

```
Current caller context (for demo purposes):
- Name: Sarah Mitchell
- Account: ACC-2024-7891
- Balance: $4,200.00
- Days past due: 45
- Last payment: March 15, 2025
```

This makes the AI's responses more realistic and specific during demos.

---

## Future Extension Points

These are explicitly NOT built now, but the architecture supports them:

1. **Intent Detection** — Hook into the transcript relay in the backend. After each caller message, run intent classification. Send result via WebSocket `intent_update` message.

2. **Opportunity Scoring** — After intent is detected, run scoring. Send via WebSocket `score_update` message.

3. **Agent Handoff Summary** — On call end, gather full transcript + detected intent + score. Generate summary via GPT-4.1. Return via REST endpoint.

4. **Conversation History** — Replace in-memory store with Supabase. No frontend changes needed (same API contract).

5. **Multiple Concurrent Calls** — Current architecture already uses `call_id` to separate sessions. Multiple calls just means multiple entries in the in-memory store.

The relay architecture means ALL future intelligence features are backend-only changes. The frontend just needs to handle new WebSocket message types.
