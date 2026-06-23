# Requirements Document

## Introduction

The Voice Intake MVP is the foundational feature of RecoverAi. It establishes a real-time AI voice conversation system where a user clicks "Start Call," an AI agent greets and converses naturally, and the entire conversation is transcribed and displayed live on a dashboard.

This is the minimum viable system: voice in, AI response out, transcript displayed. No intent detection, no scoring, no handoff summaries. Those are future specs.

### Product Goals

1. Demonstrate that an AI can conduct a natural voice conversation as a collections intake agent
2. Prove real-time transcription can stream to a dashboard with sub-2-second latency
3. Establish the technical foundation (WebSocket pipeline, OpenAI Realtime API integration) that all future features build upon
4. Deliver a demo that runs reliably for 3 minutes without errors

## Glossary

- **OpenAI Realtime API**: WebSocket-based API for real-time voice-to-voice AI conversations
- **PCM16**: Pulse-code modulation 16-bit audio format, required by OpenAI Realtime API
- **VAD (Voice Activity Detection)**: Server-side detection of when a speaker starts/stops talking
- **AudioWorklet**: Browser API for processing raw audio on a dedicated thread
- **Transcript Delta**: A partial chunk of AI-generated transcript text, streamed word-by-word
- **Call Session**: A single voice conversation from start to end, identified by a unique call_id

## Requirements

### Requirement 1: Start a Voice Call

**User Story:** As a demo operator, I want to click a single button to start an AI voice conversation, so that I can demonstrate the system without complex setup.

#### Acceptance Criteria

1. The system SHALL provide a "Start Call" button on the main dashboard that is visible and enabled when in idle state
2. The system SHALL request microphone permissions from the browser when the call starts
3. The system SHALL establish a WebSocket connection to the backend upon call start
4. The system SHALL connect to the OpenAI Realtime API within 3 seconds of the user clicking Start Call
5. The system SHALL display a "Connecting..." state with visual pulse animation while the connection is being established
6. The system SHALL disable the Start Call button immediately after click to prevent duplicate calls

### Requirement 2: AI Voice Greeting

**User Story:** As a demo operator, I want the AI to immediately greet the caller in a professional collections tone, so that the conversation begins naturally without awkward silence.

#### Acceptance Criteria

1. The AI SHALL greet the caller audibly within 2 seconds of WebSocket connection being established
2. The AI SHALL use a professional, empathetic tone appropriate for collections intake
3. The greeting SHALL be concise (1-2 sentences maximum)
4. The system SHALL stream the greeting audio to the user's browser speakers
5. The system SHALL display the greeting text in the transcript panel simultaneously with audio playback

### Requirement 3: Natural AI Conversation

**User Story:** As a demo operator, I want to speak naturally and have the AI respond contextually, so that the demo shows genuine conversational AI capability.

#### Acceptance Criteria

1. The system SHALL use the OpenAI Realtime API with server-side VAD for automatic turn detection
2. The AI SHALL respond to user speech naturally within 3 seconds of the user finishing speaking
3. The AI SHALL maintain conversation context for the duration of the call with no memory resets mid-call
4. The AI SHALL keep responses concise at 2-3 sentences maximum per turn
5. The AI SHALL NOT ask for sensitive information such as SSN or full credit card numbers
6. The AI SHALL NOT make promises about payment plans, settlement percentages, or account balance reductions
7. The system SHALL support at least 3 consecutive conversation turns without degradation

### Requirement 4: Live Transcript Display

**User Story:** As a demo operator, I want to see the conversation transcribed word-by-word on screen as it happens, so that observers can follow the conversation visually.

#### Acceptance Criteria

1. The system SHALL transcribe user speech in real-time using OpenAI Realtime API transcript events
2. The system SHALL transcribe AI responses in real-time as streaming deltas
3. The system SHALL display transcript updates within 2 seconds of speech occurring
4. The system SHALL clearly distinguish between caller speech and AI speech with distinct visual styling and speaker labels
5. The system SHALL display speaker labels "Caller" and "AI Agent" for each transcript segment
6. The system SHALL auto-scroll the transcript panel to show the latest message
7. AI messages SHALL display progressively as deltas arrive, creating a visible real-time streaming effect
8. Each transcript message SHALL include a timestamp

### Requirement 5: End a Voice Call

**User Story:** As a demo operator, I want to click a button to end the call cleanly, so that the conversation terminates gracefully.

#### Acceptance Criteria

1. The system SHALL provide an "End Call" button visible only during an active call state
2. The system SHALL close the OpenAI Realtime API session when the call ends
3. The system SHALL close the WebSocket connection cleanly when the call ends
4. The system SHALL release the browser microphone when the call ends
5. The system SHALL transition the UI to a "Call Complete" state showing the full transcript and final duration

### Requirement 6: View Conversation History

**User Story:** As a demo operator, I want to see the full transcript after the call ends, so that I can reference what was discussed.

#### Acceptance Criteria

1. The system SHALL store the complete transcript in memory for the duration of the browser session
2. The system SHALL associate each transcript message with a speaker label and timestamp
3. The system SHALL preserve the full transcript after call end for review without data loss
4. The system SHALL provide a "New Call" button after call completion to reset state and start fresh
5. The system SHALL make the transcript available via REST API at GET /api/v1/calls/{call_id}

### Requirement 7: Error Handling and Recovery

**User Story:** As a demo operator, I want clear error feedback when something goes wrong, so that I can quickly recover and restart the demo.

#### Acceptance Criteria

1. The system SHALL NOT crash if the user denies microphone permission — it SHALL show an error message with retry instructions
2. The system SHALL surface WebSocket disconnections to the user with a clear banner message
3. The system SHALL attempt WebSocket reconnection 3 times with exponential backoff (1s, 2s, 4s) before showing a failure state
4. The system SHALL allow a call to be restarted after an error without requiring a page refresh
5. The system SHALL display transient errors as toast notifications that auto-dismiss after 5 seconds
6. The system SHALL display persistent errors as inline Alert components with an action button

### Requirement 8: Performance and Reliability

**User Story:** As a demo operator, I want the system to perform reliably under demo conditions, so that the presentation goes smoothly.

#### Acceptance Criteria

1. Audio latency from speech to AI response SHALL be under 3 seconds
2. Transcript display latency SHALL be under 2 seconds from speech
3. The system SHALL maintain stable performance for calls up to 5 minutes in duration
4. The happy path demo SHALL complete without errors 9 out of 10 times
5. The interface SHALL be operable with a single click to start and a single click to stop
6. Call status SHALL be visually obvious at all times through color-coded status badges (idle=gray, connecting=yellow, active=green, complete=blue, error=red)
7. The system SHALL work in Chrome 120+ on localhost without HTTPS
