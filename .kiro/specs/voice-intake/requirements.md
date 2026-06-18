# Voice Intake MVP — Requirements

## Overview

The Voice Intake MVP is the foundational feature of RecoverAi. It establishes a real-time AI voice conversation system where a user clicks "Start Call," an AI agent greets and converses naturally, and the entire conversation is transcribed and displayed live on a dashboard.

This is the minimum viable system: voice in, AI response out, transcript displayed. No intent detection, no scoring, no handoff summaries. Those are future specs.

## Product Goals

1. Demonstrate that an AI can conduct a natural voice conversation as a collections intake agent
2. Prove real-time transcription can stream to a dashboard with sub-2-second latency
3. Establish the technical foundation (WebSocket pipeline, OpenAI Realtime API integration) that all future features build upon
4. Deliver a demo that runs reliably for 3 minutes without errors

## User Stories

### US-1: Start a Voice Call
As a demo operator, I want to click a single button to start an AI voice conversation, so that I can demonstrate the system without complex setup.

### US-2: AI Greeting
As a demo operator, I want the AI to immediately greet the caller in a professional collections tone, so that the conversation begins naturally without awkward silence.

### US-3: Natural Conversation
As a demo operator, I want to speak naturally and have the AI respond contextually, so that the demo shows genuine conversational AI capability.

### US-4: Live Transcript Display
As a demo operator, I want to see the conversation transcribed word-by-word on screen as it happens, so that observers can follow the conversation visually.

### US-5: End a Voice Call
As a demo operator, I want to click a button to end the call cleanly, so that the conversation terminates gracefully.

### US-6: View Conversation History
As a demo operator, I want to see the full transcript after the call ends, so that I can reference what was discussed.

## Functional Requirements

### FR-1: Call Initiation
- FR-1.1: The system SHALL provide a "Start Call" button on the main dashboard
- FR-1.2: The system SHALL request microphone permissions from the browser when the call starts
- FR-1.3: The system SHALL establish a WebSocket connection to the backend upon call start
- FR-1.4: The system SHALL connect to the OpenAI Realtime API within 3 seconds of the user clicking Start Call
- FR-1.5: The system SHALL display a "Connecting..." state while the connection is being established

### FR-2: AI Voice Conversation
- FR-2.1: The system SHALL use the OpenAI Realtime API for voice-to-voice conversation
- FR-2.2: The AI SHALL greet the caller within 2 seconds of connection being established
- FR-2.3: The AI SHALL respond to user speech naturally, maintaining conversational context
- FR-2.4: The AI SHALL use a professional, empathetic tone appropriate for collections intake
- FR-2.5: The system SHALL stream audio responses back to the user's browser speakers
- FR-2.6: The AI SHALL maintain conversation context for the duration of the call (no memory resets mid-call)

### FR-3: Live Transcription
- FR-3.1: The system SHALL transcribe user speech in real-time using the OpenAI Realtime API transcript events
- FR-3.2: The system SHALL transcribe AI responses in real-time
- FR-3.3: The system SHALL display transcript updates within 2 seconds of speech
- FR-3.4: The system SHALL clearly distinguish between caller speech and AI speech in the transcript
- FR-3.5: The system SHALL display speaker labels ("Caller" and "AI Agent") for each transcript segment
- FR-3.6: The system SHALL auto-scroll the transcript panel to show the latest message

### FR-4: Call Termination
- FR-4.1: The system SHALL provide an "End Call" button visible during an active call
- FR-4.2: The system SHALL close the OpenAI Realtime API session when the call ends
- FR-4.3: The system SHALL close the WebSocket connection cleanly when the call ends
- FR-4.4: The system SHALL release the browser microphone when the call ends
- FR-4.5: The system SHALL transition the UI to a "Call Complete" state showing the full transcript

### FR-5: Conversation Storage
- FR-5.1: The system SHALL store the complete transcript in memory for the duration of the browser session
- FR-5.2: The system SHALL associate each transcript message with a timestamp
- FR-5.3: The system SHALL preserve the transcript after call end for review

## Non-Functional Requirements

### NFR-1: Performance
- NFR-1.1: Audio latency from speech to AI response SHALL be under 3 seconds
- NFR-1.2: Transcript display latency SHALL be under 2 seconds from speech
- NFR-1.3: The system SHALL maintain stable performance for calls up to 5 minutes in duration

### NFR-2: Reliability
- NFR-2.1: The happy path demo SHALL complete without errors 9 out of 10 times
- NFR-2.2: WebSocket disconnections SHALL be surfaced to the user with a clear error message
- NFR-2.3: The system SHALL not crash if the microphone is denied — it SHALL show an error message

### NFR-3: Usability
- NFR-3.1: The interface SHALL be operable with a single click to start and a single click to stop
- NFR-3.2: The transcript panel SHALL be readable from 6 feet away (demo/presentation distance)
- NFR-3.3: Call status SHALL be visually obvious at all times (idle, connecting, active, ended)

### NFR-4: Compatibility
- NFR-4.1: The system SHALL work in Chrome 120+ (primary demo browser)
- NFR-4.2: The system SHALL work on localhost without HTTPS (WebRTC/getUserMedia exception)

## Acceptance Criteria

### AC-1: Complete Demo Flow
- [ ] User clicks "Start Call" → connection establishes in under 3 seconds
- [ ] AI greets the caller audibly within 2 seconds of connection
- [ ] User speaks → AI responds naturally within 3 seconds
- [ ] Transcript shows both sides of the conversation in real-time
- [ ] User clicks "End Call" → call terminates cleanly
- [ ] Full transcript remains visible after call ends

### AC-2: Transcript Accuracy
- [ ] Speaker labels correctly identify AI vs Caller for every message
- [ ] Timestamps are present on each transcript entry
- [ ] Transcript auto-scrolls to latest message
- [ ] No duplicate messages appear in the transcript

### AC-3: Error Resilience
- [ ] Microphone denial shows clear error message (not a crash)
- [ ] Network interruption shows reconnection attempt or error banner
- [ ] Call can be restarted after an error without page refresh

## Edge Cases

| # | Edge Case | Expected Behavior |
|---|-----------|-------------------|
| 1 | User denies microphone permission | Show error: "Microphone access required" with retry option |
| 2 | OpenAI Realtime API connection fails | Show error: "Connection failed" with retry button |
| 3 | WebSocket drops mid-call | Show banner: "Connection lost" and attempt reconnection |
| 4 | User clicks Start Call twice rapidly | Ignore second click (button disabled during connection) |
| 5 | User speaks before AI greeting completes | Queue user speech; AI processes after greeting |
| 6 | Very long silence (30+ seconds) | AI prompts: "Are you still there?" |
| 7 | Call exceeds 5 minutes | Allow to continue but do not guarantee stability beyond 5 min |
| 8 | Browser tab loses focus during call | Call continues normally (no suspension) |
| 9 | User refreshes page during call | Call is lost; transcript is cleared; show idle state |

## Demo Success Criteria

1. A non-technical observer can understand what is happening within 10 seconds of watching
2. The AI sounds natural — not robotic, not scripted
3. The transcript updates are visually impressive (real-time streaming effect)
4. The call starts fast enough that there is no awkward waiting
5. The end-to-end flow (start → converse → end) completes in under 2 minutes for a standard demo
6. No visible errors, console warnings, or UI glitches during the happy path
7. The UI looks polished — not a prototype wireframe
