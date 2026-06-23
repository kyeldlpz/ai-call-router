# Implementation Plan: Voice Intake MVP

## Overview

This implementation plan covers the Voice Intake MVP for RecoverAi: a real-time AI voice conversation system with live transcription. The architecture uses browser Speech APIs (STT/TTS) + Ollama/OpenRouter for AI generation, connected via text-based WebSocket.

## Task Dependency Graph

```json
{
  "waves": [
    ["T1", "T2"],
    ["T3", "T4", "T6", "T7"],
    ["T5", "T8", "T11"],
    ["T9", "T10", "T12"],
    ["T13", "T14", "T15", "T16"],
    ["T17", "T18", "T19"]
  ]
}
```

## Tasks

### Task T1: Initialize Next.js Frontend
- **Requirements**: Requirement 1, Requirement 4
- **Description**: Create the Next.js frontend application with TypeScript, Tailwind CSS, and shadcn/ui. Configure the project structure per the structure steering document.
- **Dependencies**: None
- **Acceptance Criteria**:
  - [x] 1.1 Create `frontend/` directory with Next.js App Router
  - [x] 1.2 Enable TypeScript strict mode in tsconfig.json
  - [x] 1.3 Configure Tailwind CSS and verify it works
  - [x] 1.4 Initialize shadcn/ui with components.json
  - [x] 1.5 Create folder structure: src/app, src/components, src/context, src/hooks, src/lib, src/types
  - [x] 1.6 Verify npm run dev starts without errors
  - [x] 1.7 Create base layout.tsx and page.tsx that render a placeholder

### Task T2: Initialize FastAPI Backend
- **Requirements**: Requirement 5, Requirement 8
- **Description**: Create the FastAPI backend application with the project structure defined in the steering document. Configure CORS, health endpoint, and environment variable loading.
- **Dependencies**: None
- **Acceptance Criteria**:
  - [x] 2.1 Create backend/ directory with structure per steering document
  - [x] 2.2 Create FastAPI app in main.py with CORS middleware for localhost origins
  - [x] 2.3 Implement health endpoint at GET /api/v1/health returning success envelope
  - [x] 2.4 Create config.py that loads environment variables (AI_PROVIDER, OLLAMA_*, OPENROUTER_*)
  - [x] 2.5 Create .env.example with required variables
  - [x] 2.6 Create requirements.txt with fastapi, uvicorn, httpx, python-dotenv, pydantic
  - [x] 2.7 Verify uvicorn app.main:app --reload starts without errors

### Task T3: Create Shared Types and Models
- **Requirements**: Requirement 4, Requirement 6
- **Description**: Define all TypeScript types for the frontend and all Pydantic models for the backend as shared data contracts.
- **Dependencies**: T1, T2
- **Acceptance Criteria**:
  - [x] 3.1 Create frontend/src/types/index.ts with CallStatus, CallState, TranscriptMessage, WsMessage types
  - [x] 3.2 Create backend/app/models/call.py with CallCreate, CallResponse, CallSession Pydantic models
  - [x] 3.3 Create backend/app/models/transcript.py with TranscriptEntry Pydantic model
  - [x] 3.4 Verify types match the API contracts in the design document
  - [x] 3.5 Verify no any types exist in TypeScript code

### Task T4: Implement AI Conversation Service
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Build the backend service that generates conversation responses via Ollama (local) or OpenRouter (cloud free models) with key rotation and model fallback.
- **Dependencies**: T2
- **Acceptance Criteria**:
  - [x] 4.1 Create backend/app/services/voice_intake.py
  - [x] 4.2 Implement Ollama chat completion via httpx (POST /api/chat)
  - [x] 4.3 Implement OpenRouter chat completion via httpx (POST /v1/chat/completions)
  - [x] 4.4 Support multiple API keys with rotation on 429 rate-limit responses
  - [x] 4.5 Support fallback models list — try next model when primary returns 404 or all keys exhausted
  - [x] 4.6 Maintain conversation history (message list) in session
  - [x] 4.7 Implement generate_greeting() for initial AI greeting on call start
  - [x] 4.8 Implement generate_response() for turn-by-turn conversation
  - [x] 4.9 Provider selection via AI_PROVIDER env var ("ollama" or "openrouter")
  - [x] 4.10 Timeout handling (60s Ollama, 30s OpenRouter)

### Task T5: Build WebSocket Session Handler
- **Requirements**: Requirement 1, Requirement 3, Requirement 4
- **Description**: Create the FastAPI WebSocket endpoint that manages text-based conversation between browser and AI service.
- **Dependencies**: T4, T3
- **Acceptance Criteria**:
  - [x] 5.1 Create WebSocket endpoint at /ws/v1/call/{call_id} that accepts browser connections
  - [x] 5.2 On connect: validate call exists, create AI conversation session
  - [x] 5.3 Generate and send AI greeting as transcript_complete message
  - [x] 5.4 Loop: receive text_input → call generate_response() → send transcript_complete
  - [x] 5.5 Echo caller text back as transcript_complete for display confirmation
  - [x] 5.6 Send call_status message when session is established
  - [x] 5.7 Handle call_end message: close session and WebSocket
  - [x] 5.8 Handle AI errors gracefully: send error message to browser, don't crash session
  - [x] 5.9 Clean disconnection handling with no orphaned sessions

### Task T6: Implement Call Management REST Endpoints
- **Requirements**: Requirement 1, Requirement 5, Requirement 6
- **Description**: Create REST endpoints for call lifecycle management: create call, get call state.
- **Dependencies**: T3, T2
- **Acceptance Criteria**:
  - [x] 6.1 Implement POST /api/v1/calls that creates a new call and returns call_id
  - [x] 6.2 Implement GET /api/v1/calls/{call_id} that returns call state and transcript
  - [x] 6.3 Create in-memory call repository at backend/app/repositories/call_repository.py
  - [x] 6.4 Verify all responses use the standard API envelope format
  - [x] 6.5 Return 404 for non-existent call_id
  - [x] 6.6 Accumulate transcript in the repository as messages arrive

### Task T7: Create Voice Agent System Prompt
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Write the system prompt defining the AI persona as a professional collections intake specialist.
- **Dependencies**: T4
- **Acceptance Criteria**:
  - [x] 7.1 Create backend/app/prompts/intake_system.py with INTAKE_SYSTEM_PROMPT constant
  - [x] 7.2 Define AI as professional collections intake specialist
  - [x] 7.3 Instruct concise responses at 2-3 sentences per turn
  - [x] 7.4 Prohibit asking for sensitive info like SSN or full card numbers
  - [x] 7.5 Set empathetic non-threatening tone
  - [x] 7.6 Instruct AI to greet caller on first turn
  - [x] 7.7 Include version comment at top of file

### Task T8: Implement Browser Speech Recognition Hook
- **Requirements**: Requirement 1, Requirement 3
- **Description**: Build the frontend hook that captures speech via the Web Speech API (SpeechRecognition) and provides transcribed text.
- **Dependencies**: T1
- **Acceptance Criteria**:
  - [x] 8.1 Create frontend/src/hooks/use-speech-recognition.ts
  - [x] 8.2 Wrap browser SpeechRecognition (with webkit prefix fallback)
  - [x] 8.3 Enable continuous mode with interim results
  - [x] 8.4 Provide onResult callback for final transcripts
  - [x] 8.5 Provide onInterim callback for partial results (visual feedback)
  - [x] 8.6 Auto-restart recognition on end event for continuous listening
  - [x] 8.7 Handle no-speech and aborted errors without surfacing to user
  - [x] 8.8 Provide isSupported flag for browser compatibility check
  - [x] 8.9 Provide startListening() / stopListening() methods

### Task T9: Implement Browser Speech Synthesis Hook
- **Requirements**: Requirement 2, Requirement 3
- **Description**: Build the frontend hook that speaks AI responses aloud using the browser's SpeechSynthesis API.
- **Dependencies**: T1
- **Acceptance Criteria**:
  - [x] 9.1 Create frontend/src/hooks/use-speech-synthesis.ts
  - [x] 9.2 Wrap browser SpeechSynthesis API
  - [x] 9.3 Select best available voice (prefer natural-sounding English voices)
  - [x] 9.4 Provide speak(text) method
  - [x] 9.5 Provide cancel() method to stop mid-speech
  - [x] 9.6 Track isSpeaking state
  - [x] 9.7 Cancel any ongoing speech before starting new utterance

### Task T10: Implement WebSocket Client Hook
- **Requirements**: Requirement 4, Requirement 7
- **Description**: Build the frontend WebSocket hook managing connection lifecycle, message parsing, and reconnection logic.
- **Dependencies**: T5, T1
- **Acceptance Criteria**:
  - [x] 10.1 Create frontend/src/hooks/use-realtime-connection.ts
  - [x] 10.2 Connect to /ws/v1/call/{call_id} WebSocket endpoint
  - [x] 10.3 Parse incoming messages by type field
  - [x] 10.4 Provide send() method for outgoing messages
  - [x] 10.5 Provide connection state: connecting, connected, disconnected, reconnecting, failed
  - [x] 10.6 Implement reconnection with 3 retries and exponential backoff (1s, 2s, 4s)
  - [x] 10.7 Clean disconnect on unmount or call end

### Task T11: Implement Call State Context and Reducer
- **Requirements**: Requirement 1, Requirement 4, Requirement 5
- **Description**: Build the React Context and useReducer that manages global call state including transcript accumulation.
- **Dependencies**: T3
- **Acceptance Criteria**:
  - [x] 11.1 Create frontend/src/context/call-context.tsx with CallProvider and useCallContext hook
  - [x] 11.2 Create frontend/src/context/call-reducer.ts handling all CallAction types
  - [x] 11.3 Implement TRANSCRIPT_ADD that adds a complete message to transcript array
  - [x] 11.4 Implement TRANSCRIPT_DELTA that appends text to streaming AI message
  - [x] 11.5 Implement CALL_INIT, CALL_CONNECTED, CALL_ENDING, CALL_COMPLETE, CALL_ERROR, CALL_RESET transitions
  - [x] 11.6 Implement DURATION_TICK that increments duration by 1 second
  - [x] 11.7 Wrap entire app with context in layout.tsx

### Task T12: Implement Voice Conversation Orchestrator Hook
- **Requirements**: Requirement 1, Requirement 3, Requirement 5
- **Description**: Build the use-voice-conversation hook that orchestrates STT, TTS, WebSocket, and state into a unified call experience.
- **Dependencies**: T8, T9, T10, T11
- **Acceptance Criteria**:
  - [x] 12.1 Create frontend/src/hooks/use-voice-conversation.ts
  - [x] 12.2 startCall(): POST /api/v1/calls → start speech recognition → connect WebSocket
  - [x] 12.3 On speech result: send text_input via WebSocket (unless muted)
  - [x] 12.4 On transcript_complete from AI: speak text via SpeechSynthesis + add to transcript
  - [x] 12.5 On transcript_complete from caller: add to transcript (echo)
  - [x] 12.6 endCall(): send call_end → stop STT → cancel TTS → disconnect
  - [x] 12.7 toggleMute(): suppress sending recognized text when muted
  - [x] 12.8 Expose interimText for "hearing..." visual feedback
  - [x] 12.9 Duration timer: start on CALL_CONNECTED, stop on CALL_COMPLETE

### Task T13: Build Transcript Panel Component
- **Requirements**: Requirement 4
- **Description**: Build the TranscriptPanel component displaying live transcript messages with speaker labels, timestamps, and auto-scroll.
- **Dependencies**: T11
- **Acceptance Criteria**:
  - [x] 13.1 Create frontend/src/components/transcript/transcript-panel.tsx
  - [x] 13.2 Create frontend/src/components/transcript/transcript-message.tsx
  - [x] 13.3 Display all messages from callState.transcript
  - [x] 13.4 Show speaker icon/label, text, and timestamp for each message
  - [x] 13.5 Style AI messages differently from Caller messages
  - [x] 13.6 Show animated cursor for streaming AI messages
  - [x] 13.7 Auto-scroll panel to bottom on new messages
  - [x] 13.8 Show empty state when no transcript exists
  - [x] 13.9 Use shadcn/ui Card and ScrollArea components

### Task T14: Build Call Panel Component
- **Requirements**: Requirement 1, Requirement 5, Requirement 8
- **Description**: Build the CallPanel component with status indicator, Start/End Call buttons, duration timer, and mute toggle.
- **Dependencies**: T11, T12
- **Acceptance Criteria**:
  - [x] 14.1 Create frontend/src/components/call/call-panel.tsx
  - [x] 14.2 Create frontend/src/components/call/call-controls.tsx for Start/End/New Call/Mute buttons
  - [x] 14.3 Create frontend/src/components/call/call-status-badge.tsx with color-coded status
  - [x] 14.4 Status badge colors: idle=gray, connecting=yellow/pulse, active=green, ending=orange, complete=blue, error=red
  - [x] 14.5 Start Call button prominent and green, disabled during non-idle states
  - [x] 14.6 End Call button red, only visible during active state
  - [x] 14.7 Display duration timer in MM:SS format
  - [x] 14.8 Show "Listening..." / "AI responding..." feedback during active call

### Task T15: Build Dashboard Layout
- **Requirements**: Requirement 4, Requirement 8
- **Description**: Assemble the main dashboard page with three-column layout, header, and connection status footer.
- **Dependencies**: T14, T13
- **Acceptance Criteria**:
  - [x] 15.1 Render full dashboard layout in frontend/src/app/page.tsx
  - [x] 15.2 Three-column grid: CallPanel (25%) + TranscriptPanel (50%) + Info Panel (25%)
  - [x] 15.3 Header with RecoverAi branding and connection status indicator
  - [x] 15.4 Info panel showing: status, duration, message count, microphone state, AI provider
  - [x] 15.5 Show interim text ("Hearing...") when user is speaking
  - [x] 15.6 Footer with WebSocket connection indicator
  - [x] 15.7 Responsive stacking on narrow screens

### Task T16: Post-Call Transcript View
- **Requirements**: Requirement 6
- **Description**: After a call ends, the transcript remains visible and the UI shows a Call Complete state.
- **Dependencies**: T13, T12
- **Acceptance Criteria**:
  - [x] 16.1 Keep transcript panel showing all messages when call status is complete
  - [x] 16.2 Show Call Complete status with final duration
  - [x] 16.3 Display New Call button to reset state
  - [x] 16.4 Clear transcript and return to idle on New Call click

### Task T17: Error Handling UI
- **Requirements**: Requirement 7
- **Description**: Build error handling UI for speech recognition issues, connection failures, and AI errors.
- **Dependencies**: T15
- **Acceptance Criteria**:
  - [x] 17.1 Show inline error message on speech recognition failure or unsupported browser
  - [x] 17.2 Show error state in CallPanel when AI service fails
  - [ ] 17.3 Show reconnection state on WebSocket disconnect
  - [ ] 17.4 All error states recoverable via "New Call" button
  - [ ] 17.5 AI errors display the error message from backend

### Task T18: End-to-End Demo Test
- **Requirements**: Requirement 3, Requirement 8
- **Description**: Manual integration test verifying the full voice conversation flow works end-to-end.
- **Dependencies**: T17
- **Acceptance Criteria**:
  - [ ] 18.1 Start Call → AI greeting is spoken aloud within 5 seconds
  - [ ] 18.2 User speaks → text appears in transcript → AI responds (spoken + displayed)
  - [ ] 18.3 Multi-turn conversation works for 3+ turns
  - [ ] 18.4 End Call terminates cleanly
  - [ ] 18.5 New Call resets everything for a fresh start
  - [ ] 18.6 No console errors during happy path
  - [ ] 18.7 Works in Chrome and Edge

### Task T19: Final Demo Polish
- **Requirements**: Requirement 8
- **Description**: Polish visual issues, timing, and UX friction for a flawless demo.
- **Dependencies**: T18
- **Acceptance Criteria**:
  - [ ] 19.1 Complete full demo flow in under 3 minutes
  - [ ] 19.2 UI looks polished (professional colors, spacing, typography)
  - [ ] 19.3 AI responses are natural and contextually appropriate
  - [ ] 19.4 Transcript is readable and clearly shows conversation flow
  - [ ] 19.5 Animations and transitions feel smooth
  - [ ] 19.6 Create demo script document at docs/demo-script.md

## Notes

### Parallel Execution Tracks

- Track A (Backend): T2 → T4 → T5 → T6
- Track B (Frontend): T1 → T8 → T9 → T10 → T11 → T12 → T13 → T14
- Merge Point: T15 (layout), then T16 → T17 → T18 → T19

### Current Progress

Tasks T1–T16 are complete. Remaining: T17 (error UI), T18 (e2e test), T19 (polish).

### Key Differences from Original Plan

1. **No OpenAI Realtime API** — replaced with Ollama/OpenRouter text generation
2. **No binary audio streaming** — browser handles STT/TTS natively
3. **No AudioWorklet/ScriptProcessor** — Web Speech API replaces manual audio capture
4. **No audio playback buffer** — SpeechSynthesis handles TTS
5. **Simpler WebSocket protocol** — text in, text out (no audio_delta, no audio_input)
6. **Zero cost** — Ollama is local, OpenRouter free-tier models, browser APIs are free
