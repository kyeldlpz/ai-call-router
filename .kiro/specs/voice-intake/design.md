# Design Document

## Overview

The Voice Intake MVP establishes a real-time AI voice conversation system with live transcription. The architecture uses a backend relay pattern: Browser ↔ FastAPI ↔ OpenAI Realtime API. The backend acts as the central orchestrator, ensuring API keys stay server-side, transcripts are stored, and future intelligence features (intent detection, scoring) can plug in without frontend changes.

This design covers: voice conversation via OpenAI Realtime API, live transcript streaming via WebSocket, call lifecycle management via REST, and in-memory state storage.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Call UI  │    │ Audio Capture│    │ Transcript Panel      │  │
│  │ Controls │    │ (AudioWorklet)│   │ (Live streaming text) │  │
│  └────┬─────┘    └──────┬───────┘    └───────────▲───────────┘  │
│       │         ┌────────▼────────────────────────┤              │
│       └─────────┤     WebSocket Client            │              │
│                 └────────────┬─────────────────────┘              │
└──────────────────────────────┼───────────────────────────────────┘
                               │ WebSocket (audio + transcript)
┌──────────────────────────────┼───────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │         WebSocket Session Handler (relay)                    │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │         OpenAI Realtime API Client (voice_intake service)    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │         In-Memory Call Store (call_repository)               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Backend relay pattern**: Browser does NOT connect directly to OpenAI. Backend relays audio and transcripts. This keeps API keys server-side and allows future feature hooks.
2. **AudioWorklet for capture**: Raw PCM16 at 24kHz matches OpenAI's expected format directly — no transcoding needed.
3. **Server VAD for turn detection**: OpenAI handles voice activity detection automatically. No manual "push to talk."
4. **REST for lifecycle, WebSocket for streaming**: Call creation/termination via REST. Audio and transcript via WebSocket.
5. **In-memory storage**: No database for hackathon. Python dictionaries keyed by call_id.

### Data Flow

```
Browser Mic → AudioWorklet (PCM16) → WebSocket → FastAPI → OpenAI Realtime API
                                                          ↓
                                              AI Audio Response → WebSocket → Browser Speakers
                                              AI Transcript Delta → WebSocket → Transcript Panel
                                              User Transcript Complete → WebSocket → Transcript Panel
```

## Components and Interfaces

### Frontend Components

#### CallPanel
- **Purpose**: Call lifecycle controls (Start/End/Reset), status display, duration timer
- **Props**: `status: CallStatus`, `duration: number`, `onStart`, `onEnd`, `onReset`
- **Sub-components**: CallStatusBadge, CallControls, CallDuration

#### TranscriptPanel
- **Purpose**: Displays live-streaming transcript with speaker labels and auto-scroll
- **Props**: `messages: TranscriptMessage[]`, `isActive: boolean`
- **Sub-components**: TranscriptMessage (individual message bubble)

#### DashboardLayout
- **Purpose**: Two-column grid layout assembling all panels
- **Structure**: Header (logo + status) → Grid (CallPanel 35% + TranscriptPanel 65%) → Footer (connection indicator)

### Backend Services

#### voice_intake.py
- **Purpose**: Manages OpenAI Realtime API WebSocket connection
- **Interface**:
  - `create_realtime_session() → RealtimeSession`
  - `send_audio(session, audio_bytes) → None`
  - `close_session(session) → None`
- **Configuration**: PCM16, 24kHz, server_vad, voice="sage"

#### call_session.py (WebSocket handler)
- **Purpose**: Bidirectional relay between browser and OpenAI
- **Interface**: FastAPI WebSocket endpoint at `/ws/v1/call/{call_id}`
- **Behavior**: Two concurrent async loops (browser→OpenAI, OpenAI→browser)

#### call_repository.py
- **Purpose**: In-memory storage of active and completed calls
- **Interface**:
  - `create_call(scenario?) → CallSession`
  - `get_call(call_id) → CallSession | None`
  - `add_transcript(call_id, speaker, text) → TranscriptEntry`
  - `end_call(call_id) → CallSession`

### REST API Contracts

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| POST | /api/v1/calls | Create call | 201: {callId, status, websocketUrl} |
| GET | /api/v1/calls/{call_id} | Get call state | 200: {callId, status, transcript[], duration} |
| POST | /api/v1/calls/{call_id}/end | End call | 200: {callId, status: "complete"} |
| GET | /api/v1/health | Health check | 200: {status: "ok"} |

All responses use standard envelope: `{ success, data, error, timestamp }`

### WebSocket Protocol

**Backend → Browser messages:**
| Type | Data | Purpose |
|------|------|---------|
| call_status | {status} | Connection state change |
| transcript_delta | {speaker: "ai", text} | Streaming AI text |
| transcript_complete | {id, speaker, text, timestamp} | Complete message (caller or finalized AI) |
| audio_delta | {audio: base64} | AI audio chunk for playback |
| error | {message} | Error notification |

**Browser → Backend messages:**
| Type | Data | Purpose |
|------|------|---------|
| audio_input | {audio: base64} | Microphone audio chunk |
| call_end | {} | End call signal |

### State Management

**Frontend (React Context + useReducer):**
```typescript
interface CallState {
  callId: string | null;
  status: "idle" | "connecting" | "active" | "ending" | "complete" | "error";
  transcript: TranscriptMessage[];
  error: string | null;
  duration: number;
}
```

**State machine:**
```
idle → connecting → active → ending → complete
  ↑         ↓          ↓                    ↓
  └── error ←──── error ←──────────────────┘ (reset)
```

### OpenAI Realtime API Configuration

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "<system prompt>",
    "voice": "sage",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": { "model": "gpt-4o-mini-transcribe" },
    "turn_detection": { "type": "server_vad", "threshold": 0.5, "silence_duration_ms": 500 }
  }
}
```

## Data Models

### Backend (Pydantic)

**CallSession:**
- call_id: str (UUID)
- status: Literal["idle", "active", "complete"]
- transcript: list[TranscriptEntry]
- started_at: datetime
- ended_at: datetime | None

**TranscriptEntry:**
- id: str (UUID)
- speaker: Literal["ai", "caller"]
- text: str
- timestamp: str (ISO 8601)

**CallCreate (request):**
- scenario: str | None

**CallResponse (response):**
- call_id: str
- status: str
- started_at: str
- ended_at: str | None
- transcript: list[TranscriptEntry]
- duration_seconds: int

### Frontend (TypeScript)

**CallState:**
- callId: string | null
- status: CallStatus
- transcript: TranscriptMessage[]
- error: string | null
- duration: number

**TranscriptMessage:**
- id: string
- speaker: "ai" | "caller"
- text: string
- timestamp: string
- isStreaming?: boolean

**WsMessage:**
- type: WsMessageType
- data: unknown
- timestamp: string
- sequence: number

## Error Handling

### Frontend Errors

| Error | Detection | User Experience |
|-------|-----------|-----------------|
| Microphone denied | getUserMedia rejection | Alert: "Microphone required" + retry |
| WebSocket connect fail | onerror/onclose before open | Toast: "Connection failed. Retrying..." |
| WebSocket drop mid-call | onclose during active state | Banner: "Connection lost" + auto-retry 3x |
| Audio playback failure | AudioContext error | Silent failure (transcript still works) |
| Server error message | WebSocket error type | Toast with error text |

### Backend Errors

| Error | Detection | Response |
|-------|-----------|----------|
| OpenAI WS connect fail | Connection timeout | Send error to browser, close session |
| OpenAI WS drop mid-call | on_close event | Retry once, then error to browser |
| Invalid audio data | Decode failure | Log warning, skip chunk, continue |
| Call not found | Missing call_id | HTTP 404 |
| Unexpected OpenAI event | Unknown type | Log and ignore |

## Correctness Properties

### Property 1: Transcript Ordering
Messages in the transcript array SHALL be ordered chronologically by timestamp. No out-of-order messages are permitted.

**Validates: Requirements 4.8**

### Property 2: Speaker Attribution
Every transcript message SHALL have exactly one speaker label ("ai" or "caller") that correctly identifies who spoke.

**Validates: Requirements 4.4, 4.5**

### Property 3: State Machine Integrity
The call status SHALL only transition through valid paths: idle→connecting→active→ending→complete, or any→error, error/complete→idle (via reset).

**Validates: Requirements 1.5, 5.5**

### Property 4: Resource Cleanup
When a call ends (by user action or error), ALL resources SHALL be released: microphone stream, WebSocket connections (browser↔backend, backend↔OpenAI), and audio context.

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 5: No Duplicate Messages
The same transcript message (by ID) SHALL NOT appear more than once in the transcript array.

**Validates: Requirements 4.1, 4.2**

### Property 6: Delta Accumulation
AI transcript deltas SHALL accumulate into a single message. When response.done is received, the accumulated message is finalized with isStreaming set to false.

**Validates: Requirements 4.7**

## Testing Strategy

### Unit Tests (Automated)
- Call state reducer: all valid transitions, invalid transitions ignored
- WebSocket message parsing: all message types, malformed messages handled
- Transcript accumulation: deltas merge correctly, complete messages append
- Repository CRUD: create, get, add_transcript, end_call

### Integration Tests (Automated)
- REST endpoints: correct status codes, envelope format, 404 for missing calls
- WebSocket handshake: connection accepted for valid call_id

### Manual Tests (Demo Validation)
- End-to-end: Start → Greet → Converse → Transcript streams → End → History preserved
- Error recovery: Deny mic → error shown → retry works
- Latency: AI responds within 3s, transcript appears within 2s
