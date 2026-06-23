# Design Document

## Overview

The Dead Air Audio Cue feature fills the silence gap between user speech ending and AI response arriving during a voice intake call. A subtle programmatic tone (generated via Web Audio API) plays during this "processing state" to reassure callers that the system is actively working. The hook integrates with the existing `use-voice-conversation` orchestrator by observing when `text_input` is sent and when `transcript_complete` arrives, without modifying the orchestrator's internal logic.

The design follows a standalone hook pattern (`useDeadAirCue`) that receives signals from the orchestrator and manages its own AudioContext lifecycle. This keeps the feature isolated, testable, and removable without side effects.

## Architecture

### Integration Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    use-voice-conversation (Orchestrator)           │
│                                                                   │
│  send({ type: "text_input" })  ──► isProcessing = true           │
│  onMessage("transcript_complete") ──► isProcessing = false        │
│  isSpeaking (TTS active)                                          │
│  interimText (partial STT result)                                 │
│  status (call lifecycle)                                          │
└────────────────────────────────────┬──────────────────────────────┘
                                     │ signals passed as hook params
                                     ▼
┌───────────────────────────────────────────────────────────────────┐
│                    useDeadAirCue (Audio Cue Manager)               │
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐   │
│  │ State Logic │──►│ AudioContext  │──►│ OscillatorNode      │   │
│  │ (processing │   │ (lifecycle)  │   │ + GainNode (fade)   │   │
│  │  detection) │   └──────────────┘   └─────────────────────┘   │
│  └─────────────┘                                                  │
└───────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Standalone hook, no orchestrator modification**: The `useDeadAirCue` hook receives state from the orchestrator as parameters. The orchestrator exposes a new `isProcessing` boolean signal — set true after `text_input` send, set false on `transcript_complete` receipt. This is a minimal, additive change.

2. **Web Audio API programmatic generation**: A sine wave oscillator at 440–600 Hz generates the tone. No external audio files, no network requests, no additional dependencies.

3. **GainNode for volume/fade control**: A GainNode between the OscillatorNode and AudioContext destination handles volume capping (≤0.15) and smooth fade-out (≤200ms via `linearRampToValueAtTime`).

4. **Defensive lifecycle management**: The AudioContext is created once per call, resumed on user gesture (call-start click satisfies autoplay policy), and closed when the call ends. All playback operations check state before acting.

5. **Signal priority**: TTS playback and user interim speech both suppress the cue. The hook uses a priority system: `isSpeaking || hasInterimText → suppress`, `isProcessing && callActive → play`.

### State Machine

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
┌───────┐   text_input sent   ┌────────────┐         │
│ IDLE  │ ──────────────────► │ PROCESSING │         │
└───────┘                     └─────┬──────┘         │
    ▲                               │                │
    │   transcript_complete /       │  isSpeaking /  │
    │   timeout (30s) /             │  interimText / │
    │   connection drop /           │  call not      │
    │   call ends                   │  active        │
    │                               ▼                │
    │                         ┌────────────┐         │
    └─────────────────────────┤ SUPPRESSED │─────────┘
                              └────────────┘
                              (still processing,
                               but cue is paused)
```

## Components and Interfaces

### Hook: useDeadAirCue

```typescript
interface UseDeadAirCueOptions {
  isProcessing: boolean;       // true between text_input send and transcript_complete receive
  isSpeaking: boolean;         // true while TTS is playing AI speech
  interimText: string;         // current interim STT text (non-empty = user speaking)
  callStatus: CallStatus;      // current call lifecycle status
}

interface UseDeadAirCueReturn {
  isPlayingCue: boolean;       // whether the audio cue is currently audible
  isSupported: boolean;        // whether Web Audio API is available
}

function useDeadAirCue(options: UseDeadAirCueOptions): UseDeadAirCueReturn;
```

### Orchestrator Change: isProcessing signal

The `use-voice-conversation` hook adds a single `isProcessing` state boolean:
- Set `true` immediately before `send({ type: "text_input", ... })`
- Set `false` when `handleWsMessage` processes a `transcript_complete` with `speaker: "ai"`
- Set `false` when WebSocket connection state becomes `"disconnected"` or `"failed"`

This is exposed in the hook return value for `useDeadAirCue` to consume.

### Audio Engine (internal to useDeadAirCue)

The hook internally manages:
- **AudioContext**: Created lazily on first processing state, resumed via user gesture
- **OscillatorNode**: Sine wave, 440 Hz, created/started when cue begins, stopped on cue end
- **GainNode**: Fixed gain ≤0.15, with `linearRampToValueAtTime` for fade-out

Each play/stop cycle creates a fresh OscillatorNode (OscillatorNodes are single-use per Web Audio API spec). The GainNode and AudioContext persist across cycles within a single call.

## Data Models

### New Types (added to `src/types/index.ts`)

```typescript
// No new shared types required — the hook uses CallStatus already defined.
// Internal types are co-located in the hook file.
```

### Internal Hook Types (in `use-dead-air-cue.ts`)

```typescript
interface AudioCueState {
  isPlaying: boolean;
  audioContext: AudioContext | null;
  gainNode: GainNode | null;
  oscillator: OscillatorNode | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
}
```

### Orchestrator State Addition

```typescript
// In use-voice-conversation.ts, add:
const [isProcessing, setIsProcessing] = useState(false);
```

No changes to `CallState`, `CallAction`, or `call-reducer.ts` — the processing state is local to the orchestrator hook since it does not need to persist across component boundaries or be part of the global call state.

### Configuration Constants

```typescript
const CUE_FREQUENCY_HZ = 440;          // Sine wave frequency
const CUE_GAIN = 0.12;                 // Output volume (0.0–1.0 scale, ≤0.15)
const CUE_FADE_OUT_MS = 150;           // Fade-out duration (≤200ms)
const CUE_START_DELAY_MS = 200;        // Delay before tone starts (≤300ms)
const CUE_LOOP_DURATION_MS = 1800;     // Loop cycle length (≤2000ms)
const CUE_TIMEOUT_MS = 30_000;         // Max processing state duration
const CUE_STOP_ON_INTERIM_MS = 80;     // Stop delay on interim speech (≤100ms)
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Processing state entry is idempotent

*For any* active call state (callStatus="active"), after a `text_input` send event, `isProcessing` SHALL be true — regardless of whether it was already true or false before the event.

**Validates: Requirements 1.1, 1.4**

### Property 2: AI transcript completes processing

*For any* state where `isProcessing` is true, receiving a `transcript_complete` message with `speaker: "ai"` SHALL result in `isProcessing` becoming false.

**Validates: Requirements 1.2**

### Property 3: Audio cue playback predicate

*For any* combination of signals (`isProcessing`, `isSpeaking`, `interimText`, `callStatus`), the audio cue SHALL be playing if and only if ALL of the following hold: `isProcessing === true` AND `isSpeaking === false` AND `interimText === ""` AND `callStatus === "active"`. In all other signal combinations, the cue SHALL be silent.

**Validates: Requirements 2.5, 4.1, 4.3, 4.4**

## Error Handling

### Graceful Degradation Strategy

The audio cue is a non-critical UX enhancement. All failure modes degrade to silence — the voice conversation continues unaffected.

| Error Scenario | Detection | Behavior |
|---------------|-----------|----------|
| Web Audio API not supported | Feature detection on hook init | `isSupported=false`, no playback attempted |
| AudioContext creation fails | try/catch around `new AudioContext()` | `isSupported=false`, silent operation |
| AudioContext suspended (autoplay) | `audioContext.state === "suspended"` | Call `resume()` on call start; if rejected, skip cue for entire call |
| OscillatorNode start fails | try/catch around `oscillator.start()` | Log warning, remain in processing state without audio |
| Processing timeout (30s) | setTimeout watchdog | Exit processing state, stop cue |
| WebSocket disconnection during processing | Connection state observation | Exit processing state, stop cue |

### Error Principles

1. **Never throw to caller**: All audio errors are caught internally. The hook never throws.
2. **Never block conversation flow**: Audio failures don't prevent `transcript_complete` from being processed.
3. **No console errors in production**: Unsupported browsers see no error output. Failed operations log at `warn` level only in development.
4. **Resource cleanup on all paths**: AudioContext is closed and nulled on call end, error, or component unmount.

## Testing Strategy

### Property-Based Tests (Vitest + fast-check)

The core state logic (when to play, when to stop) is a pure function of input signals. This makes it an excellent candidate for property-based testing.

- **Library**: fast-check (TypeScript PBT library)
- **Runner**: Vitest
- **Iterations**: Minimum 100 per property
- **Tag format**: `Feature: dead-air-audio-cue, Property {N}: {description}`

Each correctness property maps to exactly one property-based test:

| Property | Test Description |
|----------|-----------------|
| Property 1 | Generate random active states, apply text_input event, assert isProcessing=true |
| Property 2 | Generate random processing=true states, apply transcript_complete ai, assert isProcessing=false |
| Property 3 | Generate all combinations of (isProcessing, isSpeaking, interimText, callStatus), assert cue plays ↔ predicate |

### Unit Tests (Vitest)

Example-based tests for specific timing, configuration, and edge cases:

- Audio cue starts within 300ms of entering processing state (mock timers)
- Fade-out duration is ≤200ms (verify GainNode ramp call)
- OscillatorNode uses sine waveform at correct frequency
- Gain value is ≤0.15
- Loop duration is ≤2000ms
- 30s timeout exits processing state
- WebSocket disconnect exits processing state
- Unsupported browser returns `isSupported=false` with no errors
- AudioContext resume failure results in silent degradation
- Call status "ending"/"complete"/"idle" stops playback and closes AudioContext

### Manual Tests (Demo Validation)

- Start call → speak → hear subtle tone during wait → AI responds → tone stops
- Verify tone is noticeably quieter than AI speech
- Verify tone stops immediately when AI starts speaking
- Verify tone stops if you start speaking again (interim text)
- Verify no tone plays when call is idle or connecting
- Test in Chrome and Edge
