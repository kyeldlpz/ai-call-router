# Requirements Document

## Introduction

The Dead Air Audio Cue feature addresses the silence gap ("dead air") that occurs between the user finishing speaking and the AI response arriving during a voice intake conversation. The system plays a subtle audio cue to provide audible feedback that the system is actively processing, improving the conversational UX and reducing user uncertainty during the 2-5+ second AI generation window.

## Glossary

- **Audio_Cue_Manager**: The frontend hook responsible for detecting the processing state and controlling audio cue playback
- **Processing_State**: The period between the orchestrator sending a `text_input` WebSocket message and receiving the corresponding `transcript_complete` AI response
- **Audio_Cue**: A short, subtle looping tone or sound played during the Processing_State to fill dead air
- **Orchestrator**: The `use-voice-conversation` hook that manages the full call lifecycle including STT, TTS, and WebSocket communication
- **Web_Audio_API**: The browser-native AudioContext API used to generate or play audio cues programmatically

## Requirements

### Requirement 1: Detect Processing State

**User Story:** As a caller, I want the system to know when it is generating a response, so that it can provide appropriate audio feedback during the wait.

#### Acceptance Criteria

1. WHEN the Orchestrator sends a `text_input` message over WebSocket, THE Audio_Cue_Manager SHALL transition to the processing state
2. WHEN the Orchestrator receives a `transcript_complete` message with speaker "ai", THE Audio_Cue_Manager SHALL transition out of the processing state
3. IF the WebSocket connection drops during the processing state, THEN THE Audio_Cue_Manager SHALL transition out of the processing state and stop the audio cue
4. IF the Audio_Cue_Manager is already in the processing state when the Orchestrator sends another `text_input` message, THEN THE Audio_Cue_Manager SHALL remain in the processing state without restarting the audio cue
5. IF the Audio_Cue_Manager has been in the processing state for more than 30 seconds without receiving a `transcript_complete` message with speaker "ai", THEN THE Audio_Cue_Manager SHALL transition out of the processing state and stop the audio cue

### Requirement 2: Play Audio Cue During Processing

**User Story:** As a caller, I want to hear a subtle sound while the AI is thinking, so that I know the system is still working and has not disconnected.

#### Acceptance Criteria

1. WHEN the Audio_Cue_Manager enters the processing state, THE Audio_Cue_Manager SHALL begin playing the audio cue within 300 milliseconds
2. WHILE the Audio_Cue_Manager is in the processing state, THE Audio_Cue_Manager SHALL loop the audio cue continuously with each loop iteration lasting between 1 and 3 seconds
3. WHEN the Audio_Cue_Manager exits the processing state, THE Audio_Cue_Manager SHALL stop the audio cue with a fade-out of no more than 200 milliseconds
4. THE Audio_Cue_Manager SHALL play the audio cue at a volume level no greater than 50% of the AI speech synthesis output volume
5. WHILE the AI speech synthesis output is playing, THE Audio_Cue_Manager SHALL suspend the audio cue and resume it once speech synthesis completes
6. IF the audio cue fails to play, THEN THE Audio_Cue_Manager SHALL continue the processing state without the audio cue and shall not interrupt or block the AI response flow

### Requirement 3: Audio Cue Generation

**User Story:** As a developer, I want the audio cue generated programmatically using Web Audio API, so that there are no external audio file dependencies.

#### Acceptance Criteria

1. THE Audio_Cue_Manager SHALL generate the audio cue using the Web_Audio_API OscillatorNode without requiring external audio files
2. THE Audio_Cue_Manager SHALL generate the tone using a sine waveform at a frequency between 400 Hz and 600 Hz so that it remains distinguishable from human speech frequencies yet is perceived as soft and unobtrusive
3. THE Audio_Cue_Manager SHALL set the audio cue output gain to no more than 0.15 (on a 0.0 to 1.0 linear scale) so that the tone does not compete with speech audio
4. THE Audio_Cue_Manager SHALL use a loop duration of no more than 2 seconds per cycle

### Requirement 4: Audio Cue Lifecycle Management

**User Story:** As a caller, I want the audio cue to behave correctly across call lifecycle events, so that it never plays at inappropriate times.

#### Acceptance Criteria

1. WHILE the call status is not "active", THE Audio_Cue_Manager SHALL remain silent regardless of other signals
2. WHEN the call status transitions to "ending", "complete", or "idle" (via reset), THE Audio_Cue_Manager SHALL stop playback within 50 milliseconds and close the Web_Audio_API AudioContext
3. WHILE the AI speech synthesis isSpeaking flag is true, THE Audio_Cue_Manager SHALL suppress playback and, if the audio cue is currently playing, stop it with the standard fade-out
4. IF the audio cue is playing and the speech-to-text onInterim callback fires with non-empty text, THEN THE Audio_Cue_Manager SHALL stop the audio cue within 100 milliseconds

### Requirement 5: Browser Compatibility

**User Story:** As a caller using Chrome or Edge, I want the audio cue to work reliably, so that I have a consistent experience on supported browsers.

#### Acceptance Criteria

1. THE Audio_Cue_Manager SHALL verify Web_Audio_API support by checking for the existence of `AudioContext` or `webkitAudioContext` on the window object before attempting playback
2. IF the Web_Audio_API is not supported, THEN THE Audio_Cue_Manager SHALL skip audio cue playback entirely without throwing errors to the console or UI, and without interrupting the voice conversation flow
3. WHEN the AudioContext is in a suspended state due to browser autoplay policy, THE Audio_Cue_Manager SHALL call `resume()` on the AudioContext upon the user's call-start button click before attempting playback
4. IF the AudioContext `resume()` call fails or rejects, THEN THE Audio_Cue_Manager SHALL skip audio cue playback for the duration of the call without throwing errors or impacting the voice conversation flow
