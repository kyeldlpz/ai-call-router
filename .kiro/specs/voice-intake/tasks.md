# Voice Intake MVP — Implementation Tasks

## Task Dependency Graph

```
T1 → T2 → T3 ─┐
               ├→ T7 → T8 → T9 → T10
T4 → T5 → T6 ─┘         │
                          ▼
                    T11 → T12 → T13
                          │
                          ▼
                    T14 → T15 → T16
                          │
                          ▼
                    T17 → T18 → T19 → T20
```

---

## Phase 1: Project Setup

### Task T1: Initialize Next.js Frontend

- **ID:** T1
- **Description:** Create the Next.js frontend application with TypeScript, Tailwind CSS, and shadcn/ui. Configure the project structure per the structure steering document.
- **Dependencies:** None
- **Owner:** Frontend
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] `frontend/` directory created with Next.js 14+ App Router
  - [ ] TypeScript strict mode enabled in `tsconfig.json`
  - [ ] Tailwind CSS configured and working
  - [ ] shadcn/ui initialized with `components.json`
  - [ ] Folder structure matches steering document: `src/app/`, `src/components/`, `src/context/`, `src/hooks/`, `src/lib/`, `src/types/`
  - [ ] `npm run dev` starts without errors
  - [ ] Base `layout.tsx` and `page.tsx` render a placeholder

### Task T2: Initialize FastAPI Backend

- **ID:** T2
- **Description:** Create the FastAPI backend application with the project structure defined in the steering document. Configure CORS, health endpoint, and environment variable loading.
- **Dependencies:** None
- **Owner:** Backend
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] `backend/` directory created with structure per steering document
  - [ ] FastAPI app created in `main.py` with CORS middleware (localhost origins)
  - [ ] Health endpoint at `GET /api/v1/health` returns `{"success": true, "data": {"status": "ok"}}`
  - [ ] `config.py` loads environment variables (OPENAI_API_KEY)
  - [ ] `.env.example` created with required variables
  - [ ] `requirements.txt` includes: fastapi, uvicorn, websockets, python-dotenv, pydantic
  - [ ] `uvicorn app.main:app --reload` starts without errors

### Task T3: Create Shared Types and Models

- **ID:** T3
- **Description:** Define all TypeScript types for the frontend and all Pydantic models for the backend. These are the data contracts that both sides agree on.
- **Dependencies:** T1, T2
- **Owner:** Full Stack
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] `frontend/src/types/index.ts` contains: `CallStatus`, `CallState`, `TranscriptMessage`, `WsMessage` types
  - [ ] `backend/app/models/call.py` contains: `CallCreate`, `CallResponse`, `CallSession` Pydantic models
  - [ ] `backend/app/models/transcript.py` contains: `TranscriptEntry` Pydantic model
  - [ ] Types match the API contracts defined in the design document
  - [ ] No `any` types in TypeScript

---

## Phase 2: Realtime Voice Connection

### Task T4: Implement OpenAI Realtime API Client

- **ID:** T4
- **Description:** Build the backend service that connects to the OpenAI Realtime API via WebSocket. Handle session creation, configuration, and event parsing.
- **Dependencies:** T2
- **Owner:** Backend / AI
- **Estimated Complexity:** High
- **Acceptance Criteria:**
  - [ ] `backend/app/services/voice_intake.py` created
  - [ ] Service can open a WebSocket connection to `wss://api.openai.com/v1/realtime`
  - [ ] Service sends `session.update` with correct configuration (PCM16, server_vad, voice, transcription)
  - [ ] Service receives and parses `session.created` event
  - [ ] Service handles `error` events from OpenAI
  - [ ] Service supports `input_audio_buffer.append` for sending audio
  - [ ] Service parses `response.audio.delta`, `response.audio_transcript.delta`, `conversation.item.input_audio_transcription.completed` events
  - [ ] Connection uses API key from environment config
  - [ ] 30-second timeout on initial connection

### Task T5: Build WebSocket Session Handler

- **ID:** T5
- **Description:** Create the FastAPI WebSocket endpoint that bridges the browser and OpenAI. Implements bidirectional audio/transcript relay.
- **Dependencies:** T4, T3
- **Owner:** Backend
- **Estimated Complexity:** High
- **Acceptance Criteria:**
  - [ ] WebSocket endpoint at `/ws/v1/call/{call_id}` accepts browser connections
  - [ ] On connect: opens OpenAI Realtime API session via voice_intake service
  - [ ] Forwards `audio_input` messages from browser to OpenAI as `input_audio_buffer.append`
  - [ ] Forwards `response.audio.delta` from OpenAI to browser as `audio_delta`
  - [ ] Forwards transcript events from OpenAI to browser as `transcript_delta` and `transcript_complete`
  - [ ] Sends `call_status` message when session is established
  - [ ] Handles `call_end` message from browser: closes OpenAI session, closes WebSocket
  - [ ] Both relay directions run concurrently via `asyncio.gather`
  - [ ] Clean disconnection handling (no orphaned connections)

### Task T6: Implement Call Management REST Endpoints

- **ID:** T6
- **Description:** Create REST endpoints for call lifecycle management: create call, get call state, end call.
- **Dependencies:** T3, T2
- **Owner:** Backend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `POST /api/v1/calls` creates a new call, returns `call_id` and `websocket_url`
  - [ ] `GET /api/v1/calls/{call_id}` returns call state and transcript
  - [ ] `POST /api/v1/calls/{call_id}/end` ends an active call
  - [ ] In-memory call repository stores active calls (`backend/app/repositories/call_repository.py`)
  - [ ] All responses use the standard API envelope format
  - [ ] 404 returned for non-existent call_id
  - [ ] Transcript is accumulated in the repository as messages arrive

---

## Phase 3: AI Conversation

### Task T7: Create Voice Agent System Prompt

- **ID:** T7
- **Description:** Write the system prompt that defines the AI's persona as a professional collections intake specialist. Store in the prompts directory.
- **Dependencies:** T4
- **Owner:** AI
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] `backend/app/prompts/intake_system.py` created with `INTAKE_SYSTEM_PROMPT` constant
  - [ ] Prompt defines AI as professional collections intake specialist
  - [ ] Prompt instructs concise responses (2-3 sentences per turn)
  - [ ] Prompt prohibits asking for sensitive info (SSN, full card numbers)
  - [ ] Prompt sets empathetic, non-threatening tone
  - [ ] Prompt instructs AI to greet caller on first turn
  - [ ] Version comment included at top of file

### Task T8: Implement Browser Audio Capture

- **ID:** T8
- **Description:** Build the frontend hook that captures microphone audio using AudioWorklet, converts to PCM16, and sends via WebSocket.
- **Dependencies:** T1, T5
- **Owner:** Frontend
- **Estimated Complexity:** High
- **Acceptance Criteria:**
  - [ ] `frontend/src/hooks/use-audio.ts` created
  - [ ] Hook requests microphone permission via `navigator.mediaDevices.getUserMedia`
  - [ ] AudioWorklet captures raw PCM16 at 24kHz mono
  - [ ] Audio chunks are base64 encoded and sent over WebSocket as `audio_input` messages
  - [ ] Hook provides `startCapture()` and `stopCapture()` methods
  - [ ] Hook handles permission denial gracefully (returns error state)
  - [ ] Audio capture stops when `stopCapture()` is called (releases microphone)

### Task T9: Implement Browser Audio Playback

- **ID:** T9
- **Description:** Build the frontend logic that receives AI audio chunks via WebSocket and plays them through the browser speakers.
- **Dependencies:** T8
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Audio playback integrated into WebSocket message handling
  - [ ] `audio_delta` messages decoded from base64 to PCM16
  - [ ] Audio played via AudioContext with proper buffering
  - [ ] No audible gaps or clicks between audio chunks
  - [ ] Playback stops cleanly on call end
  - [ ] AudioContext created on user gesture (Start Call click) to satisfy browser autoplay policy

### Task T10: End-to-End Voice Conversation Test

- **ID:** T10
- **Description:** Manual integration test: verify that clicking Start Call, speaking, hearing AI response, and clicking End Call works end-to-end.
- **Dependencies:** T7, T8, T9, T5
- **Owner:** Full Stack
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Start Call → AI greeting plays within 3 seconds
  - [ ] Speak into microphone → AI responds within 3 seconds
  - [ ] AI response is audible and contextually appropriate
  - [ ] Multi-turn conversation works (3+ turns without breaking)
  - [ ] End Call terminates cleanly (no lingering connections)
  - [ ] No console errors during happy path

---

## Phase 4: Live Transcript

### Task T11: Implement WebSocket Client Hook

- **ID:** T11
- **Description:** Build the frontend WebSocket hook that manages the connection lifecycle, message parsing, and reconnection logic.
- **Dependencies:** T5, T1
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `frontend/src/hooks/use-websocket.ts` created
  - [ ] Hook connects to `/ws/v1/call/{call_id}` WebSocket endpoint
  - [ ] Hook parses incoming messages by `type` field
  - [ ] Hook provides `send()` method for outgoing messages
  - [ ] Hook provides connection state: `connecting`, `open`, `closed`, `error`
  - [ ] Reconnection logic: 3 retries with exponential backoff (1s, 2s, 4s)
  - [ ] Clean disconnect on unmount or call end

### Task T12: Implement Call State Context and Reducer

- **ID:** T12
- **Description:** Build the React Context and useReducer that manages global call state, including transcript accumulation.
- **Dependencies:** T3, T11
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `frontend/src/context/call-context.tsx` created with `CallProvider` and `useCallContext` hook
  - [ ] `frontend/src/context/call-reducer.ts` handles all `CallAction` types
  - [ ] `TRANSCRIPT_ADD` adds a complete message to the transcript array
  - [ ] `TRANSCRIPT_DELTA` appends text to the last AI message (or creates new if none streaming)
  - [ ] `CALL_INIT`, `CALL_CONNECTED`, `CALL_ENDING`, `CALL_COMPLETE`, `CALL_ERROR`, `CALL_RESET` transitions work correctly
  - [ ] `DURATION_TICK` increments duration by 1 second
  - [ ] Context wraps the entire app in `layout.tsx`

### Task T13: Build Transcript Panel Component

- **ID:** T13
- **Description:** Build the TranscriptPanel component that displays live-streaming transcript messages with speaker labels, timestamps, and auto-scroll.
- **Dependencies:** T12
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `frontend/src/components/transcript/transcript-panel.tsx` created
  - [ ] `frontend/src/components/transcript/transcript-message.tsx` created
  - [ ] Panel displays all messages from `callState.transcript`
  - [ ] Each message shows: speaker icon/label, text, timestamp
  - [ ] AI messages styled differently from Caller messages (different background color)
  - [ ] Streaming AI messages show animated cursor/indicator
  - [ ] Panel auto-scrolls to bottom on new messages
  - [ ] Empty state shown when no transcript exists: "Start a call to see the transcript"
  - [ ] Uses shadcn/ui Card and ScrollArea components

---

## Phase 5: Conversation History

### Task T14: Implement Call Management Hook

- **ID:** T14
- **Description:** Build the `useCall` hook that orchestrates the full call lifecycle: create call via REST, connect WebSocket, manage audio, handle transcript events.
- **Dependencies:** T11, T12, T8, T9
- **Owner:** Frontend
- **Estimated Complexity:** High
- **Acceptance Criteria:**
  - [ ] `frontend/src/hooks/use-call.ts` created
  - [ ] `startCall()`: calls POST /api/v1/calls → connects WebSocket → starts audio capture
  - [ ] `endCall()`: sends `call_end` via WebSocket → stops audio → updates state
  - [ ] Incoming WebSocket messages dispatched to call reducer
  - [ ] `audio_delta` messages routed to audio playback
  - [ ] `transcript_delta` and `transcript_complete` messages dispatched to reducer
  - [ ] `call_status` messages trigger state transitions
  - [ ] Duration timer starts on `CALL_CONNECTED`, stops on `CALL_COMPLETE`
  - [ ] Error handling: connection failures dispatch `CALL_ERROR`

### Task T15: Implement Backend Transcript Storage

- **ID:** T15
- **Description:** Ensure the backend accumulates transcript messages in the call repository as they flow through the relay. Complete transcripts are available via GET endpoint after call ends.
- **Dependencies:** T5, T6
- **Owner:** Backend
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] WebSocket session handler saves each transcript entry to the call repository
  - [ ] Both caller and AI messages are stored with speaker label and timestamp
  - [ ] `GET /api/v1/calls/{call_id}` returns the complete transcript array
  - [ ] Transcript persists in memory after call ends (until server restart)
  - [ ] Message IDs are unique (UUID4 or incrementing)

### Task T16: Post-Call Transcript View

- **ID:** T16
- **Description:** After a call ends, the transcript remains visible and the UI shows a "Call Complete" state with the full conversation history.
- **Dependencies:** T13, T14
- **Owner:** Frontend
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] When call status is `complete`, transcript panel still shows all messages
  - [ ] Call panel shows "Call Complete" status with final duration
  - [ ] "New Call" button appears to reset state and start fresh
  - [ ] Clicking "New Call" clears transcript and returns to idle state
  - [ ] No data loss between `active` → `complete` transition

---

## Phase 6: UI Polish

### Task T17: Build Call Panel Component

- **ID:** T17
- **Description:** Build the CallPanel component with status indicator, Start/End Call buttons, and duration timer. Polished, demo-ready styling.
- **Dependencies:** T12, T14
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `frontend/src/components/call/call-panel.tsx` created
  - [ ] `frontend/src/components/call/call-controls.tsx` created (Start/End/New Call buttons)
  - [ ] `frontend/src/components/call/call-status-badge.tsx` created (color-coded status)
  - [ ] Status badge colors: idle=gray, connecting=yellow/pulse, active=green, ending=orange, complete=blue, error=red
  - [ ] Start Call button: prominent, green, disabled during non-idle states
  - [ ] End Call button: red, only visible during active state
  - [ ] Duration timer: MM:SS format, updates every second during active call
  - [ ] Uses shadcn/ui Button, Badge, Card components

### Task T18: Build Dashboard Layout

- **ID:** T18
- **Description:** Assemble the main dashboard page with two-column layout: Call Panel (left, narrow) and Transcript Panel (right, wide). Header with logo and connection status.
- **Dependencies:** T17, T13
- **Owner:** Frontend
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] `frontend/src/app/page.tsx` renders the full dashboard layout
  - [ ] Two-column grid: left column ~35% (Call Panel), right column ~65% (Transcript Panel)
  - [ ] Header with "RecoverAi" text/logo and overall call status
  - [ ] Responsive: stacks vertically on narrow screens (not critical, but shouldn't break)
  - [ ] Dark or light theme that looks professional (not default unstyled)
  - [ ] Footer with WebSocket connection indicator (connected/disconnected dot)

### Task T19: Error UI Components

- **ID:** T19
- **Description:** Build error handling UI: toast notifications for transient errors, banner for connection loss, alert for microphone denial.
- **Dependencies:** T18
- **Owner:** Frontend
- **Estimated Complexity:** Low
- **Acceptance Criteria:**
  - [ ] shadcn/ui Toast configured and working
  - [ ] Microphone denial shows inline Alert with instructions
  - [ ] WebSocket disconnect shows top banner: "Connection lost. Reconnecting..."
  - [ ] API errors show Toast notification
  - [ ] All error states are recoverable (user can retry or start new call)

### Task T20: Final Demo Polish and Walkthrough

- **ID:** T20
- **Description:** End-to-end demo rehearsal. Fix any visual issues, timing problems, or UX friction. Ensure the 3-minute demo flow works flawlessly.
- **Dependencies:** T19, T16
- **Owner:** Full Stack
- **Estimated Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Full demo flow: Start Call → AI Greets → User Speaks → AI Responds → Transcript Streams → End Call → View History
  - [ ] Demo completes in under 3 minutes
  - [ ] No console errors or warnings during happy path
  - [ ] UI looks polished from 6 feet away (presentation distance)
  - [ ] AI responses are natural and contextually appropriate
  - [ ] Transcript streaming has visible real-time effect (not all-at-once)
  - [ ] At least 3 conversation turns work reliably
  - [ ] Animations/transitions feel smooth (status changes, transcript scroll)
  - [ ] Document the demo script in `docs/demo-script.md`

---

## Task Summary

| ID | Task | Phase | Owner | Complexity | Dependencies |
|----|------|-------|-------|------------|--------------|
| T1 | Initialize Next.js Frontend | 1 | Frontend | Low | — |
| T2 | Initialize FastAPI Backend | 1 | Backend | Low | — |
| T3 | Create Shared Types and Models | 1 | Full Stack | Low | T1, T2 |
| T4 | OpenAI Realtime API Client | 2 | Backend/AI | High | T2 |
| T5 | WebSocket Session Handler | 2 | Backend | High | T4, T3 |
| T6 | Call Management REST Endpoints | 2 | Backend | Medium | T3, T2 |
| T7 | Voice Agent System Prompt | 3 | AI | Low | T4 |
| T8 | Browser Audio Capture | 3 | Frontend | High | T1, T5 |
| T9 | Browser Audio Playback | 3 | Frontend | Medium | T8 |
| T10 | E2E Voice Conversation Test | 3 | Full Stack | Medium | T7, T8, T9, T5 |
| T11 | WebSocket Client Hook | 4 | Frontend | Medium | T5, T1 |
| T12 | Call State Context & Reducer | 4 | Frontend | Medium | T3, T11 |
| T13 | Transcript Panel Component | 4 | Frontend | Medium | T12 |
| T14 | Call Management Hook | 5 | Frontend | High | T11, T12, T8, T9 |
| T15 | Backend Transcript Storage | 5 | Backend | Low | T5, T6 |
| T16 | Post-Call Transcript View | 5 | Frontend | Low | T13, T14 |
| T17 | Call Panel Component | 6 | Frontend | Medium | T12, T14 |
| T18 | Dashboard Layout | 6 | Frontend | Medium | T17, T13 |
| T19 | Error UI Components | 6 | Frontend | Low | T18 |
| T20 | Final Demo Polish | 6 | Full Stack | Medium | T19, T16 |

---

## Parallel Execution Opportunities

These tasks can be worked on simultaneously by different developers:

**Parallel Track A (Backend):** T2 → T4 → T5 → T6 → T15
**Parallel Track B (Frontend):** T1 → T8 → T9 → T11 → T12 → T13
**Merge Point:** T10 (requires both tracks), then T14 → T16 → T17 → T18 → T19 → T20

**Day-by-Day Estimate:**
- Day 1: T1, T2, T3, T4, T7 (Project setup + OpenAI client)
- Day 2: T5, T6, T8, T9 (WebSocket handler + Audio capture/playback)
- Day 3: T10, T11, T12, T13 (Integration test + Transcript UI)
- Day 4: T14, T15, T16, T17 (Call management + History + Call panel)
- Day 5: T18, T19, T20 (Layout polish + Error UI + Demo rehearsal)
