# Hooks Governance

## Scope

This document governs **React hooks** in the frontend application — custom hooks, hook composition, and state management patterns.

---

## Hook Creation Rules

### When to Create a Custom Hook

Create a custom hook when:
- A component needs side effects (WebSocket, timers, API calls)
- State + logic is reused across 2+ components
- A component's logic exceeds 15 lines (extract to keep component clean)
- You need to compose multiple React hooks into a cohesive unit

Do NOT create a custom hook when:
- The logic is a pure function (make it a utility in `lib/`)
- It's used in exactly one place AND is <10 lines (inline in component)
- It only wraps `useState` with no additional logic (just use `useState` directly)

### Decision Tree

```
Is this stateful logic?
├── NO → Put in lib/ as a utility function
└── YES → Is it used in 2+ components?
    ├── YES → Custom hook in hooks/
    └── NO → Is it >15 lines of logic?
        ├── YES → Custom hook in hooks/
        └── NO → Inline in the component
```

### Hook File Structure

```typescript
// hooks/use-example.ts

// 1. Imports
import { useState, useEffect, useCallback } from "react";
import type { ExampleState } from "@/types";

// 2. Hook configuration interface (if needed)
interface UseExampleOptions {
  autoConnect?: boolean;
  timeout?: number;
}

// 3. Return type interface
interface UseExampleReturn {
  state: ExampleState;
  isLoading: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

// 4. Hook implementation (named export)
export function useExample(options: UseExampleOptions = {}): UseExampleReturn {
  const { autoConnect = true, timeout = 5000 } = options;

  // State declarations
  const [state, setState] = useState<ExampleState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => cleanup();
  }, [autoConnect]);

  // Callbacks (stable references)
  const start = useCallback(() => { ... }, [dependencies]);
  const stop = useCallback(() => { ... }, [dependencies]);

  // Return (explicit object, not array)
  return { state, isLoading, error, start, stop };
}
```

---

## Hook Naming Rules

### Naming Convention

| Pattern | Example | Use |
|---------|---------|-----|
| `use-<noun>` | `use-audio.ts` | Manages a resource (audio, WebSocket) |
| `use-<noun>-<verb>` | `use-audio-recorder.ts` | Specific action on a resource |
| `use-<adjective>-<noun>` | `use-realtime-connection.ts` | Qualified resource |
| `use-<domain>` | `use-call.ts` | Domain orchestration hook |

### Naming Rules

1. **File name matches hook name** — `use-call.ts` exports `useCall`
2. **Kebab-case file, camelCase export** — Always
3. **Descriptive over short** — `useRealtimeConnection` over `useRTC`
4. **No generic names** — `useData`, `useHelper`, `useFetch` are banned
5. **Domain-specific** — `useCall`, `useTranscript`, `useVoiceConversation`

### Anti-Patterns

```typescript
// BAD — too generic
export function useData() { ... }
export function useAsync() { ... }
export function useHelper() { ... }

// BAD — doesn't start with "use"
export function callManager() { ... }
export function createWebSocket() { ... }  // This is a util, not a hook

// GOOD — specific and descriptive
export function useVoiceConversation() { ... }
export function useRealtimeTranscript() { ... }
export function useAudioPlayback() { ... }
```

---

## State Ownership Rules

### Single Owner Principle

Every piece of state has exactly ONE owner:

| State | Owner | Consumers |
|-------|-------|-----------|
| Call status, transcript, intent, score | `CallContext` (via reducer) | All components via `useCallContext` |
| Audio recording state | `useAudioRecorder` | `CallControls` component |
| Audio playback state | `useAudioPlayback` | `CallPanel` component |
| WebSocket connection state | `useRealtimeConnection` | `useVoiceConversation` |
| UI toggle states | Individual components (useState) | That component only |

### Ownership Rules

1. **State lives in the highest component that needs it** — But no higher
2. **Global state = CallContext only** — Everything else is local or hook-scoped
3. **Hooks don't create global state** — They consume context or manage local state
4. **No duplicate state** — If state is in context, don't also store it in a hook's useState
5. **Derived state is computed, not stored** — `isActive = status === "active"` (not a separate useState)

### State Flow

```
CallContext (global truth)
    ↓ dispatch
CallReducer (state transitions)
    ↓ state
useCall (orchestration hook — reads context, exposes actions)
    ↓ return values
Components (render state, trigger actions)
```

### Anti-Patterns

```typescript
// BAD — duplicating context state in local state
function CallPanel() {
  const { state } = useCallContext();
  const [localStatus, setLocalStatus] = useState(state.status); // DUPLICATE!
  
  useEffect(() => {
    setLocalStatus(state.status); // Syncing state = bug factory
  }, [state.status]);
}

// GOOD — derive directly from context
function CallPanel() {
  const { state } = useCallContext();
  const isActive = state.status === "active"; // Derived, not stored
}
```

---

## Side-Effect Management

### Side-Effect Categories

| Category | Where It Lives | Cleanup Required |
|----------|---------------|-----------------|
| WebSocket connection | `useRealtimeConnection` | YES — close on unmount |
| Audio stream (MediaRecorder) | `useAudioRecorder` | YES — stop tracks on unmount |
| Audio playback | `useAudioPlayback` | YES — pause/stop on unmount |
| Timers (heartbeat, reconnect) | Owning hook | YES — clearTimeout/clearInterval |
| API calls (REST) | Event handlers (not useEffect) | NO — fire and forget |
| State updates from WebSocket | `useRealtimeTranscript` | YES — unsubscribe on unmount |

### Cleanup Rules

1. **Every `useEffect` with a side-effect has a cleanup function**
2. **WebSocket: close connection in cleanup**
3. **Timers: clear in cleanup**
4. **Audio: stop all tracks in cleanup**
5. **Subscriptions: unsubscribe in cleanup**
6. **Abort controllers: abort in cleanup** (for cancellable fetches)

```typescript
// GOOD — complete cleanup
export function useRealtimeConnection(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    heartbeatRef.current = setInterval(() => {
      ws.send(JSON.stringify({ type: "ping" }));
    }, 30_000);

    return () => {
      // Cleanup: close WebSocket + clear heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [url]);
}
```

### Effect Dependency Rules

1. **List all dependencies** — Never suppress the exhaustive-deps lint rule
2. **Stabilize callbacks with useCallback** — If a callback is an effect dependency
3. **Use refs for values that shouldn't trigger re-effects** — Connection instance, timers
4. **Never put objects/arrays directly in deps** — Destructure to primitives or use refs

```typescript
// BAD — object in deps causes infinite re-render
useEffect(() => {
  connect(options); // options is a new object every render
}, [options]); // Runs every render!

// GOOD — destructure to primitives
const { autoConnect, timeout } = options;
useEffect(() => {
  if (autoConnect) connect(timeout);
}, [autoConnect, timeout]); // Stable primitives
```

---

## Reusability Standards

### Composable Hooks

Hooks should compose, not monolith:

```
useVoiceConversation (orchestration)
├── useRealtimeConnection (WebSocket management)
├── useAudioRecorder (mic capture)
├── useAudioPlayback (AI audio output)
└── useRealtimeTranscript (message parsing → context dispatch)
```

### Reusability Rules

1. **Single concern per hook** — `useAudioRecorder` doesn't know about WebSockets
2. **Configuration via options object** — Not hardcoded behavior
3. **Return values over callbacks** — Let the consumer decide what to do with state
4. **No UI concerns** — Hooks never return JSX, never reference DOM elements (except refs)
5. **Testable in isolation** — Each hook can be tested without its consumers

### When NOT to Reuse

- Don't extract a hook just because two components share `useState(false)`
- Don't make a hook "generic" when it only serves one feature
- Don't add options for hypothetical future needs (YAGNI)

---

## Hook Testing Requirements

### What to Test

| Hook Type | Test Approach | Priority |
|-----------|---------------|----------|
| State management (reducer) | Unit test pure reducer function | HIGH |
| WebSocket hooks | Integration test with mock WS | MEDIUM |
| Audio hooks | Manual testing only (browser API) | LOW (demo validates) |
| Orchestration hooks | Test through component behavior | LOW |

### Testing Pattern

```typescript
// For pure reducers (highest value, easiest to test)
import { callReducer, initialState } from "@/context/call-reducer";

describe("callReducer", () => {
  it("handles TRANSCRIPT_DELTA by appending message", () => {
    const state = { ...initialState, status: "active" as const, transcript: [] };
    const action = { type: "TRANSCRIPT_DELTA" as const, message: mockMessage };
    const next = callReducer(state, action);
    expect(next.transcript).toHaveLength(1);
  });
});
```

### What NOT to Test

- React hook lifecycle mechanics (trust React)
- Browser API behavior (MediaRecorder, WebSocket constructor)
- Third-party library internals
- Visual rendering triggered by hook state changes

---

## Existing Hooks Inventory

| Hook | Concern | Owner |
|------|---------|-------|
| `use-call.ts` | Call lifecycle orchestration | CallContext |
| `use-audio.ts` | Audio coordination (recorder + playback) | Local |
| `use-audio-recorder.ts` | MediaRecorder management | Local |
| `use-audio-playback.ts` | Audio output playback | Local |
| `use-realtime-connection.ts` | WebSocket to backend | Local |
| `use-realtime-transcript.ts` | WS message → transcript dispatch | CallContext |
| `use-voice-conversation.ts` | Orchestrates full voice flow | Composition |

---

## Checklist: Hook Review

```
□ Hook has a single, clear responsibility
□ Named with use- prefix, kebab-case file, camelCase export
□ All side-effects have cleanup in useEffect return
□ No duplicate state (state exists in one place only)
□ Dependencies array is complete (no suppressions)
□ Callbacks stabilized with useCallback where needed
□ Returns typed object (not array)
□ Options object for >2 parameters
□ Does not return JSX or reference DOM
□ Composition is possible (no circular dependencies between hooks)
```
