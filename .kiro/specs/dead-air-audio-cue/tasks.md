# Implementation Plan: Dead Air Audio Cue

## Overview

Implement a subtle audio cue that plays during the "dead air" gap between user speech ending and AI response arriving. The feature uses a standalone `useDeadAirCue` hook consuming an `isProcessing` signal from the voice conversation orchestrator, generating a sine wave tone via the Web Audio API. Implementation proceeds incrementally: test infrastructure setup, orchestrator signal, standalone hook, integration wiring, and final validation.

## Tasks

- [x] 1. Set up test infrastructure
  - [x] 1.1 Install and configure Vitest with fast-check for the frontend
    - Install `vitest`, `@vitest/coverage-v8`, `fast-check`, and `jsdom` as dev dependencies
    - Create `vitest.config.ts` at `frontend/` root with jsdom environment and src path alias
    - Add `"test": "vitest --run"` script to `package.json`
    - Verify setup by running `npm run test` exits cleanly with zero tests
    - _Requirements: 3.1 (Web Audio API generation needs testable environment)_

- [x] 2. Expose `isProcessing` signal from the orchestrator
  - [x] 2.1 Add `isProcessing` state to `use-voice-conversation.ts`
    - Add `const [isProcessing, setIsProcessing] = useState(false)` to the hook
    - Set `isProcessing = true` immediately before `send({ type: "text_input", ... })` in `handleSpeechResult`
    - Set `isProcessing = false` inside `handleWsMessage` when a `transcript_complete` message with `speaker: "ai"` is received
    - Set `isProcessing = false` when `connectionState` transitions to `"failed"` or `"disconnected"` while processing
    - Expose `isProcessing` in the hook return object and in the `VoiceConversationReturn` interface
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Write property tests for processing state transitions
    - **Property 1: Processing state entry is idempotent**
    - **Validates: Requirements 1.1, 1.4**
    - Generate random active call states; apply text_input event; assert `isProcessing === true`
    - **Property 2: AI transcript completes processing**
    - **Validates: Requirements 1.2**
    - Generate random `isProcessing=true` states; apply `transcript_complete` with `speaker: "ai"`; assert `isProcessing === false`

- [x] 3. Checkpoint — Verify orchestrator signal
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `useDeadAirCue` hook
  - [x] 4.1 Create the hook file with configuration constants and internal types
    - Create `frontend/src/hooks/use-dead-air-cue.ts`
    - Define `UseDeadAirCueOptions` and `UseDeadAirCueReturn` interfaces
    - Define configuration constants: `CUE_FREQUENCY_HZ = 440`, `CUE_GAIN = 0.12`, `CUE_FADE_OUT_MS = 150`, `CUE_START_DELAY_MS = 200`, `CUE_LOOP_DURATION_MS = 1800`, `CUE_TIMEOUT_MS = 30_000`, `CUE_STOP_ON_INTERIM_MS = 80`
    - Add `isSupported` check for `AudioContext` or `webkitAudioContext` on `window`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2_

  - [x] 4.2 Implement AudioContext lifecycle management
    - Create AudioContext lazily on first processing state entry
    - Resume AudioContext if suspended (handle autoplay policy)
    - Close AudioContext on call end (status transition to "ending", "complete", or "idle")
    - Clean up on component unmount via `useEffect` return
    - _Requirements: 4.2, 5.3, 5.4_

  - [x] 4.3 Implement tone playback (start/stop) logic
    - On entering playable state: wait `CUE_START_DELAY_MS`, create `OscillatorNode` (sine, 440 Hz), connect through `GainNode` (gain ≤ 0.15), start oscillator
    - Loop oscillator by stopping and restarting every `CUE_LOOP_DURATION_MS`
    - On exiting playable state: fade out via `linearRampToValueAtTime` over `CUE_FADE_OUT_MS`, then stop oscillator
    - Wrap all audio operations in try/catch — failures degrade to silence
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 3.3, 3.4_

  - [x] 4.4 Implement signal priority and suppression logic
    - Play cue if and only if: `isProcessing === true` AND `isSpeaking === false` AND `interimText === ""` AND `callStatus === "active"`
    - Suppress (stop with fade-out) when `isSpeaking` becomes true
    - Suppress (stop within 100ms) when `interimText` becomes non-empty
    - Remain silent when `callStatus` is not `"active"`
    - Implement 30-second timeout watchdog that exits processing state
    - _Requirements: 1.5, 2.5, 4.1, 4.3, 4.4_

  - [x] 4.5 Write property test for audio cue playback predicate
    - **Property 3: Audio cue playback predicate**
    - **Validates: Requirements 2.5, 4.1, 4.3, 4.4**
    - Generate all combinations of (`isProcessing`, `isSpeaking`, `interimText`, `callStatus`); assert cue plays if and only if the full predicate holds

  - [x] 4.6 Write unit tests for timing and configuration
    - Test that audio cue starts within 300ms of entering processing state (mock timers)
    - Test that fade-out duration is ≤ 200ms (verify GainNode ramp call)
    - Test OscillatorNode uses sine waveform at 440 Hz
    - Test gain value is ≤ 0.15
    - Test loop duration is ≤ 2000ms
    - Test 30s timeout exits processing state
    - Test WebSocket disconnect exits processing state
    - Test unsupported browser returns `isSupported=false` with no errors
    - Test AudioContext resume failure results in silent degradation
    - Test call status "ending"/"complete"/"idle" stops playback and closes AudioContext
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Checkpoint — Verify hook in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate hook into the application
  - [x] 6.1 Wire `useDeadAirCue` into `page.tsx`
    - Import `useDeadAirCue` in `frontend/src/app/page.tsx`
    - Destructure `isProcessing` from `useVoiceConversation()` return
    - Call `useDeadAirCue({ isProcessing, isSpeaking, interimText, callStatus: status })`
    - Optionally display a subtle visual indicator when `isPlayingCue` is true (e.g., a small animated dot near the call status)
    - _Requirements: 1.1, 2.1, 4.1_

  - [x] 6.2 Write integration tests for the full signal flow
    - Test that `text_input` send → `isProcessing=true` → hook receives signal
    - Test that `transcript_complete` ai → `isProcessing=false` → cue stops
    - Test that `isSpeaking=true` suppresses cue mid-processing
    - Test that non-empty `interimText` suppresses cue mid-processing
    - _Requirements: 1.1, 1.2, 2.5, 4.3, 4.4_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific timing, configuration, and edge case examples
- Vitest is not currently installed — task 1.1 sets up the test infrastructure
- The `useDeadAirCue` hook is designed as a standalone module with no orchestrator modification beyond the `isProcessing` signal
- All audio errors degrade gracefully to silence; the voice conversation is never interrupted

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3"] },
    { "id": 5, "tasks": ["4.4"] },
    { "id": 6, "tasks": ["4.5", "4.6"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] }
  ]
}
```
