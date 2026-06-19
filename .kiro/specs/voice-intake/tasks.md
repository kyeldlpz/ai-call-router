# Implementation Plan: Voice Intake MVP

## Overview

This implementation plan covers the Voice Intake MVP for RecoverAi: a real-time AI voice conversation system with live transcription. The plan is organized into 20 tasks designed for parallel execution by frontend and backend developers over 5 days.

## Task Dependency Graph

```json
{
  "waves": [
    ["T1", "T2"],
    ["T3", "T4", "T6", "T7"],
    ["T5", "T8", "T11"],
    ["T9", "T10", "T12", "T15"],
    ["T13", "T14", "T16", "T17"],
    ["T18", "T19", "T20"]
  ]
}
```

## Tasks

### Task T1: Initialize Next.js Frontend
- **Requirements**: Requirement 1, Requirement 4
- **Description**: Create the Next.js frontend application with TypeScript, Tailwind CSS, and shadcn/ui. Configure the project structure per the structure steering document.
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] 1.1 Create `frontend/` directory with Next.js 14+ App Router
  - [ ] 1.2 Enable TypeScript strict mode in tsconfig.json
  - [ ] 1.3 Configure Tailwind CSS and verify it works
  - [ ] 1.4 Initialize shadcn/ui with components.json
  - [ ] 1.5 Create folder structure: src/app, src/components, src/context, src/hooks, src/lib, src/types
  - [ ] 1.6 Verify npm run dev starts without errors
  - [ ] 1.7 Create base layout.tsx and page.tsx that render a placeholder

### Task T2: Initialize FastAPI Backend
- **Requirements**: Requirement 5, Requirement 8
- **Description**: Create the FastAPI backend application with the project structure defined in the steering document. Configure CORS, health endpoint, and environment variable loading.
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] 2.1 Create backend/ directory with structure per steering document
  - [ ] 2.2 Create FastAPI app in main.py with CORS middleware for localhost origins
  - [ ] 2.3 Implement health endpoint at GET /api/v1/health returning success envelope
  - [ ] 2.4 Create config.py that loads environment variables including OPENAI_API_KEY
  - [ ] 2.5 Create .env.example with required variables
  - [ ] 2.6 Create requirements.txt with fastapi, uvicorn, websockets, python-dotenv, pydantic
  - [ ] 2.7 Verify uvicorn app.main:app --reload starts without errors

### Task T3: Create Shared Types and Models
- **Requirements**: Requirement 4, Requirement 6
- **Description**: Define all TypeScript types for the frontend and all Pydantic models for the backend as shared data contracts.
- **Dependencies**: T1, T2
- **Acceptance Criteria**:
  - [ ] 3.1 Create frontend/src/types/index.ts with CallStatus, CallState, TranscriptMessage, WsMessage types
  - [ ] 3.2 Create backend/app/models/call.py with CallCreate, CallResponse, CallSession Pydantic models
  - [ ] 3.3 Create backend/app/models/transcript.py with TranscriptEntry Pydantic model
  - [ ] 3.4 Verify types match the API contracts in the design document
  - [ ] 3.5 Verify no any types exist in TypeScript code

### Task T4: Implement OpenAI Realtime API Client
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Build the backend service that connects to the OpenAI Realtime API via WebSocket. Handle session creation, configuration, and event parsing.
- **Dependencies**: T2
- **Acceptance Criteria**:
  - [ ] 4.1 Create backend/app/services/voice_intake.py
  - [ ] 4.2 Implement WebSocket connection to wss://api.openai.com/v1/realtime
  - [ ] 4.3 Send session.update with PCM16, server_vad, voice, and transcription config
  - [ ] 4.4 Parse session.created event to confirm connection
  - [ ] 4.5 Handle error events from OpenAI
  - [ ] 4.6 Implement input_audio_buffer.append for sending audio
  - [ ] 4.7 Parse response.audio.delta, response.audio_transcript.delta, and transcription.completed events
  - [ ] 4.8 Load API key from environment config
  - [ ] 4.9 Implement 30-second timeout on initial connection

### Task T5: Build WebSocket Session Handler
- **Requirements**: Requirement 1, Requirement 3, Requirement 4
- **Description**: Create the FastAPI WebSocket endpoint that bridges the browser and OpenAI with bidirectional audio/transcript relay.
- **Dependencies**: T4, T3
- **Acceptance Criteria**:
  - [ ] 5.1 Create WebSocket endpoint at /ws/v1/call/{call_id} that accepts browser connections
  - [ ] 5.2 On connect open OpenAI Realtime API session via voice_intake service
  - [ ] 5.3 Forward audio_input messages from browser to OpenAI as input_audio_buffer.append
  - [ ] 5.4 Forward response.audio.delta from OpenAI to browser as audio_delta
  - [ ] 5.5 Forward transcript events from OpenAI to browser as transcript_delta and transcript_complete
  - [ ] 5.6 Send call_status message when session is established
  - [ ] 5.7 Handle call_end message: close OpenAI session and WebSocket
  - [ ] 5.8 Run both relay directions concurrently via asyncio.gather
  - [ ] 5.9 Implement clean disconnection handling with no orphaned connections

### Task T6: Implement Call Management REST Endpoints
- **Requirements**: Requirement 1, Requirement 5, Requirement 6
- **Description**: Create REST endpoints for call lifecycle management: create call, get call state, end call.
- **Dependencies**: T3, T2
- **Acceptance Criteria**:
  - [ ] 6.1 Implement POST /api/v1/calls that creates a new call and returns call_id and websocket_url
  - [ ] 6.2 Implement GET /api/v1/calls/{call_id} that returns call state and transcript
  - [ ] 6.3 Implement POST /api/v1/calls/{call_id}/end that ends an active call
  - [ ] 6.4 Create in-memory call repository at backend/app/repositories/call_repository.py
  - [ ] 6.5 Verify all responses use the standard API envelope format
  - [ ] 6.6 Return 404 for non-existent call_id
  - [ ] 6.7 Accumulate transcript in the repository as messages arrive

### Task T7: Create Voice Agent System Prompt
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Write the system prompt defining the AI persona as a professional collections intake specialist.
- **Dependencies**: T4
- **Acceptance Criteria**:
  - [ ] 7.1 Create backend/app/prompts/intake_system.py with INTAKE_SYSTEM_PROMPT constant
  - [ ] 7.2 Define AI as professional collections intake specialist
  - [ ] 7.3 Instruct concise responses at 2-3 sentences per turn
  - [ ] 7.4 Prohibit asking for sensitive info like SSN or full card numbers
  - [ ] 7.5 Set empathetic non-threatening tone
  - [ ] 7.6 Instruct AI to greet caller on first turn
  - [ ] 7.7 Include version comment at top of file

### Task T8: Implement Browser Audio Capture
- **Requirements**: Requirement 1, Requirement 3
- **Description**: Build the frontend hook that captures microphone audio using AudioWorklet, converts to PCM16, and sends via WebSocket.
- **Dependencies**: T1, T5
- **Acceptance Criteria**:
  - [ ] 8.1 Create frontend/src/hooks/use-audio.ts
  - [ ] 8.2 Request microphone permission via navigator.mediaDevices.getUserMedia
  - [ ] 8.3 Capture raw PCM16 at 24kHz mono using AudioWorklet
  - [ ] 8.4 Base64 encode audio chunks and send over WebSocket as audio_input messages
  - [ ] 8.5 Provide startCapture() and stopCapture() methods
  - [ ] 8.6 Handle permission denial gracefully with error state
  - [ ] 8.7 Release microphone when stopCapture() is called

### Task T9: Implement Browser Audio Playback
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Build frontend logic that receives AI audio chunks via WebSocket and plays them through browser speakers.
- **Dependencies**: T8
- **Acceptance Criteria**:
  - [ ] 9.1 Integrate audio playback into WebSocket message handling
  - [ ] 9.2 Decode audio_delta messages from base64 to PCM16
  - [ ] 9.3 Play audio via AudioContext with proper buffering
  - [ ] 9.4 Verify no audible gaps or clicks between audio chunks
  - [ ] 9.5 Stop playback cleanly on call end
  - [ ] 9.6 Create AudioContext on user gesture to satisfy browser autoplay policy

### Task T10: End-to-End Voice Conversation Test
- **Requirements**: Requirement 3, Requirement 8
- **Description**: Manual integration test verifying the full voice conversation flow works end-to-end.
- **Dependencies**: T7, T8, T9, T5
- **Acceptance Criteria**:
  - [ ] 10.1 Verify Start Call results in AI greeting playing within 3 seconds
  - [ ] 10.2 Verify speaking into microphone produces AI response within 3 seconds
  - [ ] 10.3 Verify AI response is audible and contextually appropriate
  - [ ] 10.4 Verify multi-turn conversation works for 3+ turns without breaking
  - [ ] 10.5 Verify End Call terminates cleanly with no lingering connections
  - [ ] 10.6 Verify no console errors during happy path

### Task T11: Implement WebSocket Client Hook
- **Requirements**: Requirement 4, Requirement 7
- **Description**: Build the frontend WebSocket hook managing connection lifecycle, message parsing, and reconnection logic.
- **Dependencies**: T5, T1
- **Acceptance Criteria**:
  - [ ] 11.1 Create frontend/src/hooks/use-websocket.ts
  - [ ] 11.2 Connect to /ws/v1/call/{call_id} WebSocket endpoint
  - [ ] 11.3 Parse incoming messages by type field
  - [ ] 11.4 Provide send() method for outgoing messages
  - [ ] 11.5 Provide connection state: connecting, open, closed, error
  - [ ] 11.6 Implement reconnection with 3 retries and exponential backoff (1s, 2s, 4s)
  - [ ] 11.7 Clean disconnect on unmount or call end

### Task T12: Implement Call State Context and Reducer
- **Requirements**: Requirement 1, Requirement 4, Requirement 5
- **Description**: Build the React Context and useReducer that manages global call state including transcript accumulation.
- **Dependencies**: T3, T11
- **Acceptance Criteria**:
  - [ ] 12.1 Create frontend/src/context/call-context.tsx with CallProvider and useCallContext hook
  - [ ] 12.2 Create frontend/src/context/call-reducer.ts handling all CallAction types
  - [ ] 12.3 Implement TRANSCRIPT_ADD that adds a complete message to transcript array
  - [ ] 12.4 Implement TRANSCRIPT_DELTA that appends text to last AI message or creates new one
  - [ ] 12.5 Implement CALL_INIT, CALL_CONNECTED, CALL_ENDING, CALL_COMPLETE, CALL_ERROR, CALL_RESET transitions
  - [ ] 12.6 Implement DURATION_TICK that increments duration by 1 second
  - [ ] 12.7 Wrap entire app with context in layout.tsx

### Task T13: Build Transcript Panel Component
- **Requirements**: Requirement 4
- **Description**: Build the TranscriptPanel component displaying live-streaming transcript messages with speaker labels, timestamps, and auto-scroll.
- **Dependencies**: T12
- **Acceptance Criteria**:
  - [ ] 13.1 Create frontend/src/components/transcript/transcript-panel.tsx
  - [ ] 13.2 Create frontend/src/components/transcript/transcript-message.tsx
  - [ ] 13.3 Display all messages from callState.transcript
  - [ ] 13.4 Show speaker icon/label, text, and timestamp for each message
  - [ ] 13.5 Style AI messages differently from Caller messages with distinct background colors
  - [ ] 13.6 Show animated cursor/indicator for streaming AI messages
  - [ ] 13.7 Auto-scroll panel to bottom on new messages
  - [ ] 13.8 Show empty state when no transcript exists
  - [ ] 13.9 Use shadcn/ui Card and ScrollArea components

### Task T14: Implement Call Management Hook
- **Requirements**: Requirement 1, Requirement 3, Requirement 5
- **Description**: Build the useCall hook orchestrating the full call lifecycle: REST calls, WebSocket, audio, and transcript events.
- **Dependencies**: T11, T12, T8, T9
- **Acceptance Criteria**:
  - [ ] 14.1 Create frontend/src/hooks/use-call.ts
  - [ ] 14.2 Implement startCall() that calls POST /api/v1/calls, connects WebSocket, starts audio capture
  - [ ] 14.3 Implement endCall() that sends call_end via WebSocket, stops audio, updates state
  - [ ] 14.4 Dispatch incoming WebSocket messages to call reducer
  - [ ] 14.5 Route audio_delta messages to audio playback
  - [ ] 14.6 Dispatch transcript_delta and transcript_complete messages to reducer
  - [ ] 14.7 Trigger state transitions on call_status messages
  - [ ] 14.8 Start duration timer on CALL_CONNECTED and stop on CALL_COMPLETE
  - [ ] 14.9 Dispatch CALL_ERROR on connection failures

### Task T15: Implement Backend Transcript Storage
- **Requirements**: Requirement 6
- **Description**: Ensure the backend accumulates transcript messages in the call repository as they flow through the relay.
- **Dependencies**: T5, T6
- **Acceptance Criteria**:
  - [ ] 15.1 Save each transcript entry to the call repository from WebSocket session handler
  - [ ] 15.2 Store both caller and AI messages with speaker label and timestamp
  - [ ] 15.3 Return complete transcript array via GET /api/v1/calls/{call_id}
  - [ ] 15.4 Persist transcript in memory after call ends until server restart
  - [ ] 15.5 Generate unique message IDs using UUID4

### Task T16: Post-Call Transcript View
- **Requirements**: Requirement 6
- **Description**: After a call ends, the transcript remains visible and the UI shows a Call Complete state with full conversation history.
- **Dependencies**: T13, T14
- **Acceptance Criteria**:
  - [ ] 16.1 Keep transcript panel showing all messages when call status is complete
  - [ ] 16.2 Show Call Complete status with final duration in call panel
  - [ ] 16.3 Display New Call button to reset state and start fresh
  - [ ] 16.4 Clear transcript and return to idle state on New Call click
  - [ ] 16.5 Verify no data loss during active to complete transition

### Task T17: Build Call Panel Component
- **Requirements**: Requirement 1, Requirement 5, Requirement 8
- **Description**: Build the CallPanel component with status indicator, Start/End Call buttons, and duration timer with polished demo-ready styling.
- **Dependencies**: T12, T14
- **Acceptance Criteria**:
  - [ ] 17.1 Create frontend/src/components/call/call-panel.tsx
  - [ ] 17.2 Create frontend/src/components/call/call-controls.tsx for Start/End/New Call buttons
  - [ ] 17.3 Create frontend/src/components/call/call-status-badge.tsx with color-coded status
  - [ ] 17.4 Apply status badge colors: idle=gray, connecting=yellow/pulse, active=green, ending=orange, complete=blue, error=red
  - [ ] 17.5 Make Start Call button prominent and green, disabled during non-idle states
  - [ ] 17.6 Make End Call button red and only visible during active state
  - [ ] 17.7 Display duration timer in MM:SS format updating every second during active call
  - [ ] 17.8 Use shadcn/ui Button, Badge, and Card components

### Task T18: Build Dashboard Layout
- **Requirements**: Requirement 4, Requirement 8
- **Description**: Assemble the main dashboard page with two-column layout, header with logo, and connection status footer.
- **Dependencies**: T17, T13
- **Acceptance Criteria**:
  - [ ] 18.1 Render full dashboard layout in frontend/src/app/page.tsx
  - [ ] 18.2 Create two-column grid with left column at 35% and right column at 65%
  - [ ] 18.3 Add header with RecoverAi text/logo and overall call status
  - [ ] 18.4 Ensure layout stacks vertically on narrow screens without breaking
  - [ ] 18.5 Apply professional dark or light theme (not default unstyled)
  - [ ] 18.6 Add footer with WebSocket connection indicator dot

### Task T19: Error UI Components
- **Requirements**: Requirement 7
- **Description**: Build error handling UI with toast notifications, connection loss banner, and microphone denial alert.
- **Dependencies**: T18
- **Acceptance Criteria**:
  - [ ] 19.1 Configure shadcn/ui Toast and verify it works
  - [ ] 19.2 Show inline Alert with instructions on microphone denial
  - [ ] 19.3 Show top banner on WebSocket disconnect with reconnecting message
  - [ ] 19.4 Show Toast notification on API errors
  - [ ] 19.5 Verify all error states are recoverable via retry or new call

### Task T20: Final Demo Polish and Walkthrough
- **Requirements**: Requirement 8
- **Description**: End-to-end demo rehearsal fixing visual issues, timing problems, and UX friction for a flawless 3-minute demo.
- **Dependencies**: T19, T16
- **Acceptance Criteria**:
  - [ ] 20.1 Complete full demo flow: Start Call, AI Greets, User Speaks, AI Responds, Transcript Streams, End Call, View History
  - [ ] 20.2 Verify demo completes in under 3 minutes
  - [ ] 20.3 Verify no console errors or warnings during happy path
  - [ ] 20.4 Verify UI looks polished from 6 feet away
  - [ ] 20.5 Verify AI responses are natural and contextually appropriate
  - [ ] 20.6 Verify transcript streaming has visible real-time effect
  - [ ] 20.7 Verify at least 3 conversation turns work reliably
  - [ ] 20.8 Verify animations and transitions feel smooth
  - [ ] 20.9 Create demo script document at docs/demo-script.md

## Notes

### Parallel Execution Tracks

- Track A (Backend): T2 → T4 → T5 → T6 → T15
- Track B (Frontend): T1 → T8 → T9 → T11 → T12 → T13
- Merge Point: T10 (requires both tracks), then T14 → T16 → T17 → T18 → T19 → T20

### Day-by-Day Estimate

- Day 1: T1, T2, T3, T4, T7 (Project setup + OpenAI client)
- Day 2: T5, T6, T8, T9 (WebSocket handler + Audio capture/playback)
- Day 3: T10, T11, T12, T13 (Integration test + Transcript UI)
- Day 4: T14, T15, T16, T17 (Call management + History + Call panel)
- Day 5: T18, T19, T20 (Layout polish + Error UI + Demo rehearsal)
