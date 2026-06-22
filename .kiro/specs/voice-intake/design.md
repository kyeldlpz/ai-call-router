# Design Document

## Overview

The Voice Intake MVP establishes a real-time AI voice conversation system with live transcription. The architecture uses a backend relay pattern: Browser ↔ FastAPI ↔ Ollama/OpenRouter. The browser handles speech-to-text (Web Speech API) and text-to-speech (SpeechSynthesis API) natively, while the backend orchestrates AI conversation logic via local Ollama or cloud OpenRouter free models.

This design covers: voice conversation via browser Speech APIs + LLM backend, live transcript streaming via WebSocket, call lifecycle management via REST, and in-memory state storage.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Call UI  │    │ Speech APIs  │    │ Transcript Panel      │  │
│  │ Controls │    │ STT + TTS   │    │ (Live streaming text) │  │
│  └────┬─────┘    └──────┬───────┘    └───────────▲───────────┘  │
│       │         ┌────────▼────────────────────────┤              │
│       └─────────┤     WebSocket Client            │              │
│                 └────────────┬─────────────────────┘              │
└──────────────────────────────┼───────────────────────────────────┘
                               │ WebSocket (text messages)
┌──────────────────────────────┼───────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │         WebSocket Session Handler (conversation loop)        │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │         AI Service (Ollama / OpenRouter with key rotation)   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │         In-Memory Call Store (call_repository)               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Zero-cost AI pipeline**: Browser Speech APIs (STT/TTS) + Ollama (local) or OpenRouter (free-tier models) means $0 operational cost.
2. **Text-based WebSocket protocol**: Browser converts speech to text locally, sends text to backend. Backend returns AI response as text, browser speaks it aloud. No binary audio streaming.
3. **Multi-key rotation with model fallback**: OpenRouter integration supports multiple API keys (rotate on 429) and multiple fallback models (try next model if primary is unavailable).
4. **Provider-agnostic service layer**: The `voice_intake` service abstracts Ollama vs OpenRouter behind a single `generate_response()` interface. Switching providers requires only a `.env` change.
5. **REST for lifecycle, WebSocket for conversation**: Call creation/termination via REST. Conversation messages via WebSocket.
6. **In-memory storage**: No database for hackathon. Python dictionaries keyed by call_id.

### Data Flow

```
User speaks → Browser SpeechRecognition (STT) → text
text → WebSocket → FastAPI → Ollama/OpenRouter (generate response)
                                    ↓
                         AI text response → WebSocket → Browser
                         AI text response → Browser SpeechSynthesis (TTS) → AI speaks aloud
                         AI text response → Transcript Panel (display)
```

## Components and Interfaces

### Frontend Components

#### CallPanel
- **Purpose**: Call lifecycle controls (Start/End/Reset), status display, duration timer
- **Props**: `status: CallStatus`, `duration: number`, `onStart`, `onEnd`, `onReset`
- **Sub-components**: CallStatusBadge, CallControls

#### TranscriptPanel
- **Purpose**: Displays live transcript with speaker labels and auto-scroll
- **Props**: `messages: TranscriptMessage[]`, `isActive: boolean`
- **Sub-components**: TranscriptMessage (individual message bubble)

#### DashboardLayout
- **Purpose**: Three-column grid layout assembling all panels
- **Structure**: Header (logo + connection status) → Grid (CallPanel + TranscriptPanel + Info Panel) → Footer

### Frontend Hooks

#### use-speech-recognition.ts
- **Purpose**: Wraps browser Web Speech API for continuous speech-to-text
- **Interface**:
  - `startListening()` / `stopListening()`
  - `onResult(text)` callback when final transcript is ready
  - `onInterim(text)` callback for partial results
  - Auto-restarts on `onend` to maintain continuous listening
  - Handles `no-speech` and `aborted` errors gracefully

#### use-speech-synthesis.ts
- **Purpose**: Wraps browser SpeechSynthesis API for text-to-speech
- **Interface**:
  - `speak(text)` — speaks text aloud, selects best available voice
  - `cancel()` — stops ongoing speech
  - `isSpeaking` state

#### use-voice-conversation.ts
- **Purpose**: Orchestrates the full call lifecycle combining STT, TTS, WebSocket, and state
- **Interface**:
  - `startCall()` / `endCall()` / `resetCall()`
  - `toggleMute()` — suppresses sending recognized text
  - Returns: status, transcript, duration, error, isSpeaking, interimText

### Backend Services

#### voice_intake.py
- **Purpose**: Manages AI conversation via Ollama or OpenRouter
- **Interface**:
  - `create_conversation_session() → ConversationSession`
  - `generate_response(session, user_text) → str`
  - `generate_greeting(session) → str`
  - `close_session(session) → None`
- **Features**:
  - Maintains conversation history (message list)
  - OpenRouter: rotates through multiple API keys on 429
  - OpenRouter: falls back through multiple models if primary unavailable
  - Provider selected via `AI_PROVIDER` env var

#### call_session.py (WebSocket handler)
- **Purpose**: Text-based conversation loop between browser and AI
- **Interface**: FastAPI WebSocket endpoint at `/ws/v1/call/{call_id}`
- **Behavior**:
  1. Accept connection, create AI session
  2. Generate and send greeting
  3. Loop: receive `text_input` → generate response → send `transcript_complete`
  4. Clean up on `call_end` or disconnect

#### call_repository.py
- **Purpose**: In-memory storage of active and completed calls
- **Interface**:
  - `create_call(scenario?) → CallSession`
  - `get_call(call_id) → CallSession | None`
  - `add_transcript(call_id, speaker, text) → TranscriptEntry`
  - `update_status(call_id, status) → None`

### REST API Contracts

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| POST | /api/v1/calls | Create call | 201: {callId, status, websocketUrl} |
| GET | /api/v1/calls/{call_id} | Get call state | 200: {callId, status, transcript[], duration} |
| GET | /api/v1/health | Health check | 200: {status: "ok"} |

All responses use standard envelope: `{ success, data, error, timestamp }`

### WebSocket Protocol

**Backend → Browser messages:**
| Type | Data | Purpose |
|------|------|---------|
| call_status | {status} | Connection state change |
| transcript_complete | {speaker, text} | Complete message (caller echo or AI response) |
| error | {message} | Error notification |

**Browser → Backend messages:**
| Type | Data | Purpose |
|------|------|---------|
| text_input | {text} | Caller's transcribed speech |
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

### AI Provider Configuration

```env
# Provider selection
AI_PROVIDER=openrouter  # or "ollama"

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# OpenRouter (free-tier cloud)
OPENROUTER_API_KEYS=key1,key2,key3
OPENROUTER_MODEL=openai/gpt-oss-20b:free
OPENROUTER_FALLBACK_MODELS=google/gemma-4-31b-it:free,nvidia/nemotron-nano-9b-v2:free
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
| Speech recognition unsupported | Feature detection | Alert: "Use Chrome or Edge for voice" |
| Microphone denied | SpeechRecognition error | Alert: "Microphone access required" |
| WebSocket connect fail | onerror/onclose before open | Toast: "Connection failed. Retrying..." |
| WebSocket drop mid-call | onclose during active state | Banner: "Connection lost" + auto-retry 3x |
| Speech synthesis fail | SpeechSynthesis error | Silent (transcript still works) |
| Server error message | WebSocket error type | Toast with error text |

### Backend Errors

| Error | Detection | Response |
|-------|-----------|----------|
| Ollama unreachable | httpx ConnectError | Send error to browser, close session |
| OpenRouter all keys 429 | All attempts exhausted | Try fallback models, then error |
| OpenRouter model 404 | 404 response | Skip to next fallback model |
| AI empty response | Empty content | Retry or error to browser |
| Call not found | Missing call_id | HTTP 404 / WS close 4004 |
| AI timeout | httpx TimeoutException | Error to browser, suggest retry |

## Correctness Properties

### Property 1: Transcript Ordering
Messages in the transcript array SHALL be ordered chronologically by timestamp. No out-of-order messages are permitted.

### Property 2: Speaker Attribution
Every transcript message SHALL have exactly one speaker label ("ai" or "caller") that correctly identifies who spoke.

### Property 3: State Machine Integrity
The call status SHALL only transition through valid paths: idle→connecting→active→ending→complete, or any→error, error/complete→idle (via reset).

### Property 4: Resource Cleanup
When a call ends (by user action or error), ALL resources SHALL be released: speech recognition, speech synthesis, WebSocket connection, and backend AI session.

### Property 5: No Duplicate Messages
The same transcript message (by ID) SHALL NOT appear more than once in the transcript array.

### Property 6: Key Rotation Resilience
When an OpenRouter API key returns 429, the system SHALL automatically try the next key. When all keys are exhausted for a model, it SHALL try the next fallback model.

## Testing Strategy

### Unit Tests (Automated, if time permits)
- Call state reducer: all valid transitions, invalid transitions ignored
- WebSocket message parsing: all message types
- Config parsing: comma-separated keys and models

### Integration Tests (Automated, if time permits)
- REST endpoints: correct status codes, envelope format, 404 for missing calls
- WebSocket handshake: connection accepted for valid call_id

### Manual Tests (Demo Validation)
- End-to-end: Start → AI Greets (spoken) → User Speaks → AI Responds (spoken) → Transcript shows → End
- Error recovery: deny mic → error shown → retry works
- Provider switch: change AI_PROVIDER in .env → restart → still works
- Rate limit: trigger 429 → key rotation → conversation continues
