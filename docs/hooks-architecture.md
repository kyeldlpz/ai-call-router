# Hooks Architecture Guide — RecoverAi

## Hook Design Principles

1. **Hooks own behavior, components own rendering.** A component should never contain fetch logic, WebSocket management, or audio processing. That lives in hooks.
2. **One concern per hook.** `useAudioRecorder` handles microphone capture. It does not also handle playback or WebSocket messaging.
3. **Hooks are composable.** Higher-level hooks compose lower-level hooks. `useVoiceConversation` composes `useAudioRecorder`, `useRealtimeConnection`, and `useConversationState`.
4. **Hooks manage their own cleanup.** Every `useEffect` that allocates resources has a cleanup return. No orphaned connections, timers, or streams.
5. **Hooks return typed objects.** Never return arrays with more than 2 elements. Return a named object with clear properties.
6. **Hooks never render JSX.** If you need conditional rendering, return state and let the component decide.
7. **Hooks are testable in isolation.** They depend on interfaces, not concrete implementations.

---

## Folder Structure

```
frontend/src/hooks/
├── use-voice-conversation.ts       # Top-level orchestrator hook
├── use-realtime-transcript.ts      # Transcript accumulation from WS events
├── use-audio-recorder.ts           # Microphone capture (PCM16)
├── use-conversation-state.ts       # Call lifecycle state machine
├── use-transcript-history.ts       # Post-call transcript persistence
├── use-realtime-connection.ts      # WebSocket connection management
└── use-voice-controls.ts           # UI control state (mute, volume, etc.)
```

---

## Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `use-{domain}.ts` | `use-audio-recorder.ts` | File name (kebab-case) |
| `use{Domain}` | `useAudioRecorder` | Function name (camelCase) |
| `{Domain}State` | `AudioRecorderState` | State type |
| `{Domain}Actions` | `AudioRecorderActions` | Action methods returned |
| `{Domain}Options` | `AudioRecorderOptions` | Input configuration |

---

## Hook Responsibilities Matrix

| Hook | Creates Resources | Manages State | Handles Events | Calls APIs |
|------|-------------------|---------------|----------------|------------|
| `useVoiceConversation` | No | Composes others | Orchestrates | Yes (REST) |
| `useRealtimeTranscript` | No | Transcript array | WS transcript events | No |
| `useAudioRecorder` | AudioWorklet, MediaStream | Recording state | Audio chunks | No |
| `useConversationState` | Timer interval | Call status, duration | State transitions | No |
| `useTranscriptHistory` | No | History array | None | Yes (REST) |
| `useRealtimeConnection` | WebSocket | Connection state | WS events | No |
| `useVoiceControls` | No | Mute, volume | User interactions | No |

---

## Reusable Hook Strategy

### Layer 1: Primitive Hooks (Reusable across features)

These handle a single technical concern and can be reused anywhere:

- `useRealtimeConnection` — Generic WebSocket connection with reconnection
- `useAudioRecorder` — Browser microphone capture

### Layer 2: Domain Hooks (Feature-specific)

These combine primitives with domain logic:

- `useRealtimeTranscript` — Processes transcript-specific WebSocket messages
- `useConversationState` — Manages call lifecycle state machine
- `useVoiceControls` — UI control state for voice features
- `useTranscriptHistory` — Fetches/stores completed transcripts

### Layer 3: Orchestrator Hooks (Page-level)

These compose domain hooks into a complete feature:

- `useVoiceConversation` — Everything needed to run a voice conversation

### Dependency Graph

```
useVoiceConversation (Layer 3 - Orchestrator)
├── useRealtimeConnection (Layer 1 - Primitive)
├── useAudioRecorder (Layer 1 - Primitive)
├── useRealtimeTranscript (Layer 2 - Domain)
├── useConversationState (Layer 2 - Domain)
└── useVoiceControls (Layer 2 - Domain)

useTranscriptHistory (Layer 2 - Domain, used separately)
```

---

## Anti-Patterns

### 1. Business Logic in Components

```tsx
// ❌ BAD: Component contains orchestration logic
export function CallPanel() {
  const [status, setStatus] = useState("idle");
  const wsRef = useRef<WebSocket | null>(null);

  const startCall = async () => {
    const res = await fetch("/api/v1/calls", { method: "POST" });
    const { data } = await res.json();
    wsRef.current = new WebSocket(`ws://localhost:8000/ws/v1/call/${data.callId}`);
    wsRef.current.onopen = () => setStatus("active");
    // ... 30 more lines of logic
  };
}

// ✅ GOOD: Component uses hook
export function CallPanel() {
  const { status, startCall, endCall } = useVoiceConversation();
  return <Button onClick={startCall}>Start Call</Button>;
}
```

### 2. Hooks That Return Too Much

```tsx
// ❌ BAD: Returning a tuple with 7 items
const [status, transcript, start, end, mute, unmute, error] = useCall();

// ✅ GOOD: Named object
const { status, transcript, actions, error } = useVoiceConversation();
```

### 3. Hooks That Do Too Much

```tsx
// ❌ BAD: One hook managing audio, WebSocket, state, and UI
function useEverything() {
  // 200 lines handling all concerns
}

// ✅ GOOD: Composed from focused hooks
function useVoiceConversation() {
  const connection = useRealtimeConnection(wsUrl);
  const audio = useAudioRecorder();
  const state = useConversationState();
  const transcript = useRealtimeTranscript(connection);
  // Orchestration logic only
}
```

### 4. Missing Cleanup

```tsx
// ❌ BAD: WebSocket never closed
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handler;
  // Missing cleanup!
}, []);

// ✅ GOOD: Cleanup included
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handler;
  return () => { ws.close(); };
}, [url]);
```

### 5. State Duplication

```tsx
// ❌ BAD: Derived state stored separately
const [messages, setMessages] = useState([]);
const [messageCount, setMessageCount] = useState(0);
// messageCount is ALWAYS messages.length — don't store it

// ✅ GOOD: Derive it
const messageCount = messages.length;
```

---

## State Ownership Rules

| State | Owner Hook | Who Reads It | Who Writes It |
|-------|-----------|--------------|---------------|
| Call status | `useConversationState` | Components, other hooks | Only `useConversationState` |
| Transcript messages | `useRealtimeTranscript` | TranscriptPanel | Only `useRealtimeTranscript` |
| WebSocket connection state | `useRealtimeConnection` | Status indicators | Only `useRealtimeConnection` |
| Audio recording state | `useAudioRecorder` | VoiceControls | Only `useAudioRecorder` |
| Mute/volume state | `useVoiceControls` | CallPanel | Only `useVoiceControls` |
| Call duration | `useConversationState` | CallPanel | Only `useConversationState` |
| Error state | `useVoiceConversation` | Error components | Aggregated from child hooks |

**Rule:** State is written by exactly one hook. Multiple components may read it via the hook's return value or via context.

---

## Hook Specifications

---

### useVoiceConversation

**Purpose:** Top-level orchestrator that composes all voice conversation hooks into a single interface for the page component.

**Inputs:**
```typescript
interface UseVoiceConversationOptions {
  backendUrl: string;        // Base URL for REST API (default: "http://localhost:8000")
  wsBaseUrl: string;         // Base URL for WebSocket (default: "ws://localhost:8000")
}
```

**Outputs:**
```typescript
interface VoiceConversationReturn {
  // State
  status: CallStatus;                  // "idle" | "connecting" | "active" | "ending" | "complete" | "error"
  transcript: TranscriptMessage[];     // Live transcript messages
  duration: number;                    // Call duration in seconds
  error: string | null;               // Current error message

  // Actions
  startCall: () => Promise<void>;      // Initiate a new call
  endCall: () => void;                 // End the current call
  resetCall: () => void;               // Reset to idle state

  // Audio controls
  isMuted: boolean;
  toggleMute: () => void;

  // Connection info
  isConnected: boolean;                // WebSocket connected
}
```

**State Managed:** None directly — delegates to composed hooks.

**Side Effects:**
- Creates REST API call on `startCall()`
- Opens WebSocket connection
- Starts microphone capture
- Starts duration timer
- Cleans up all resources on `endCall()` or unmount

**Usage Example:**
```tsx
export function DashboardPage() {
  const {
    status,
    transcript,
    duration,
    error,
    startCall,
    endCall,
    resetCall,
    isMuted,
    toggleMute,
  } = useVoiceConversation({
    backendUrl: "http://localhost:8000",
    wsBaseUrl: "ws://localhost:8000",
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      <CallPanel
        status={status}
        duration={duration}
        onStart={startCall}
        onEnd={endCall}
        onReset={resetCall}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
      <TranscriptPanel messages={transcript} isActive={status === "active"} />
      {error && <ErrorBanner message={error} onDismiss={resetCall} />}
    </div>
  );
}
```

---

### useRealtimeTranscript

**Purpose:** Accumulates transcript messages from WebSocket events. Handles both complete messages (caller) and streaming deltas (AI).

**Inputs:**
```typescript
interface UseRealtimeTranscriptOptions {
  onMessage?: (message: WsMessage) => void;  // Raw WS message (from useRealtimeConnection)
}
```

**Outputs:**
```typescript
interface RealtimeTranscriptReturn {
  transcript: TranscriptMessage[];    // All messages in order
  isStreaming: boolean;               // AI is currently generating text
  clearTranscript: () => void;        // Reset transcript (for new call)
}
```

**State Managed:**
- `transcript: TranscriptMessage[]` — accumulated messages
- `currentStreamingText: string` — AI message being built from deltas

**Side Effects:** None (pure state accumulation from events).

**Usage Example:**
```typescript
const { transcript, isStreaming, clearTranscript } = useRealtimeTranscript({
  onMessage: wsMessage, // Passed from useRealtimeConnection
});
```

**Logic:**
```typescript
function useRealtimeTranscript() {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleWsMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case "transcript_complete":
        setTranscript(prev => [...prev, message.data as TranscriptMessage]);
        if ((message.data as TranscriptMessage).speaker === "ai") {
          setIsStreaming(false);
        }
        break;
      case "transcript_delta":
        setIsStreaming(true);
        setTranscript(prev => {
          const last = prev[prev.length - 1];
          if (last?.isStreaming && last.speaker === "ai") {
            return [...prev.slice(0, -1), { ...last, text: last.text + message.data.text }];
          }
          return [...prev, { id: crypto.randomUUID(), speaker: "ai", text: message.data.text, timestamp: message.timestamp, isStreaming: true }];
        });
        break;
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setIsStreaming(false);
  }, []);

  return { transcript, isStreaming, clearTranscript, handleWsMessage };
}
```

---

### useAudioRecorder

**Purpose:** Captures microphone audio as PCM16 chunks at 24kHz mono. Provides start/stop control and audio data via callback.

**Inputs:**
```typescript
interface UseAudioRecorderOptions {
  sampleRate?: number;            // Default: 24000
  onAudioChunk: (base64Pcm: string) => void;  // Called with each audio chunk
}
```

**Outputs:**
```typescript
interface AudioRecorderReturn {
  isRecording: boolean;
  isPermissionGranted: boolean;
  permissionError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}
```

**State Managed:**
- `isRecording: boolean`
- `isPermissionGranted: boolean`
- `permissionError: string | null`

**Side Effects:**
- Requests `navigator.mediaDevices.getUserMedia`
- Creates `AudioContext` and `AudioWorkletNode`
- Captures raw PCM audio from microphone
- Releases MediaStream tracks on stop

**Usage Example:**
```typescript
const { isRecording, startRecording, stopRecording, permissionError } = useAudioRecorder({
  sampleRate: 24000,
  onAudioChunk: (chunk) => {
    websocket.send(JSON.stringify({ type: "audio_input", data: { audio: chunk } }));
  },
});
```

**Critical Implementation Notes:**
- AudioContext MUST be created from a user gesture (button click) to satisfy browser autoplay policy
- AudioWorklet processes audio on a separate thread — no jank
- Chunks are base64-encoded PCM16 at 24kHz mono
- Stop recording releases ALL tracks on the MediaStream

---

### useConversationState

**Purpose:** Manages the call lifecycle state machine and duration timer.

**Inputs:**
```typescript
interface UseConversationStateOptions {
  onStatusChange?: (status: CallStatus) => void;  // Callback on transitions
}
```

**Outputs:**
```typescript
interface ConversationStateReturn {
  status: CallStatus;
  duration: number;                    // Seconds since call connected
  callId: string | null;
  transition: (action: StateAction) => void;
  reset: () => void;
}

type StateAction =
  | "INIT"           // idle → connecting
  | "CONNECTED"      // connecting → active
  | "ENDING"         // active → ending
  | "COMPLETE"       // ending → complete
  | "ERROR"          // any → error
  | "RESET";         // any → idle
```

**State Managed:**
- `status: CallStatus`
- `callId: string | null`
- `duration: number`
- Internal: `timerRef` for duration counting

**Side Effects:**
- Starts `setInterval` (1 second) when status becomes `active`
- Clears interval when status leaves `active`
- Calls `onStatusChange` on transitions

**Usage Example:**
```typescript
const { status, duration, callId, transition, reset } = useConversationState({
  onStatusChange: (newStatus) => {
    if (newStatus === "error") showToast("Connection error");
  },
});

// In orchestrator:
transition("INIT");      // User clicked Start
transition("CONNECTED"); // WS confirmed active
transition("ENDING");    // User clicked End
transition("COMPLETE");  // Cleanup done
```

---

### useTranscriptHistory

**Purpose:** Fetches completed call transcripts from the REST API. Used for reviewing past calls (post-call view).

**Inputs:**
```typescript
interface UseTranscriptHistoryOptions {
  callId: string | null;
  enabled?: boolean;  // Only fetch when true
}
```

**Outputs:**
```typescript
interface TranscriptHistoryReturn {
  transcript: TranscriptMessage[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**State Managed:**
- `transcript: TranscriptMessage[] | null`
- `isLoading: boolean`
- `error: string | null`

**Side Effects:**
- Fetches `GET /api/v1/calls/{callId}` when `enabled` and `callId` are set

**Usage Example:**
```typescript
const { transcript, isLoading } = useTranscriptHistory({
  callId: completedCallId,
  enabled: status === "complete",
});
```

---

### useRealtimeConnection

**Purpose:** Manages WebSocket connection lifecycle with reconnection logic, heartbeat, and message parsing.

**Inputs:**
```typescript
interface UseRealtimeConnectionOptions {
  url: string | null;               // Connect when non-null, disconnect when null
  onMessage: (message: WsMessage) => void;
  maxRetries?: number;              // Default: 3
}
```

**Outputs:**
```typescript
interface RealtimeConnectionReturn {
  isConnected: boolean;
  connectionState: "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";
  send: (message: object) => void;
  disconnect: () => void;
}
```

**State Managed:**
- `connectionState`
- Internal: `WebSocket` instance, retry counter, heartbeat interval

**Side Effects:**
- Opens WebSocket connection when `url` becomes non-null
- Handles reconnection with exponential backoff (1s, 2s, 4s)
- Sends heartbeat ping every 30s
- Closes WebSocket and clears intervals on disconnect or unmount

**Usage Example:**
```typescript
const { isConnected, send, disconnect, connectionState } = useRealtimeConnection({
  url: callId ? `ws://localhost:8000/ws/v1/call/${callId}` : null,
  onMessage: handleWsMessage,
  maxRetries: 3,
});

// Send audio
send({ type: "audio_input", data: { audio: base64Chunk } });

// End call
send({ type: "call_end", data: {} });
```

---

### useVoiceControls

**Purpose:** Manages UI-level voice control state: mute toggle, volume level. Thin wrapper over audio-related actions.

**Inputs:**
```typescript
interface UseVoiceControlsOptions {
  audioRecorder: AudioRecorderReturn;  // From useAudioRecorder
}
```

**Outputs:**
```typescript
interface VoiceControlsReturn {
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;            // 0-100 (playback volume)
  setVolume: (v: number) => void;
}
```

**State Managed:**
- `isMuted: boolean`
- `volume: number`

**Side Effects:**
- When muted: stops sending audio chunks (does NOT release microphone)
- Volume changes adjust AudioContext gain node

**Usage Example:**
```typescript
const controls = useVoiceControls({ audioRecorder });

<Button onClick={controls.toggleMute}>
  {controls.isMuted ? <MicOff /> : <Mic />}
</Button>
```

---

## Composition Example (Full Picture)

```typescript
// hooks/use-voice-conversation.ts
export function useVoiceConversation(options: UseVoiceConversationOptions): VoiceConversationReturn {
  const { backendUrl, wsBaseUrl } = options;

  // Layer 2: Domain state
  const conversationState = useConversationState();
  const { status, callId, duration, transition, reset } = conversationState;

  // Layer 1: WebSocket (connects when callId is set)
  const wsUrl = callId ? `${wsBaseUrl}/ws/v1/call/${callId}` : null;

  // Layer 2: Transcript (processes WS messages)
  const { transcript, isStreaming, clearTranscript, handleWsMessage } = useRealtimeTranscript();

  // Layer 1: Connection
  const connection = useRealtimeConnection({
    url: wsUrl,
    onMessage: (msg) => {
      handleWsMessage(msg);
      if (msg.type === "call_status" && msg.data.status === "active") {
        transition("CONNECTED");
      }
    },
  });

  // Layer 1: Audio
  const audioRecorder = useAudioRecorder({
    sampleRate: 24000,
    onAudioChunk: (chunk) => {
      if (!controls.isMuted) {
        connection.send({ type: "audio_input", data: { audio: chunk } });
      }
    },
  });

  // Layer 2: Controls
  const controls = useVoiceControls({ audioRecorder });

  // Orchestration: startCall
  const startCall = useCallback(async () => {
    transition("INIT");
    try {
      const res = await fetch(`${backendUrl}/api/v1/calls`, { method: "POST" });
      const { data } = await res.json();
      conversationState.setCallId(data.callId);
      await audioRecorder.startRecording();
    } catch (e) {
      transition("ERROR");
    }
  }, [backendUrl]);

  // Orchestration: endCall
  const endCall = useCallback(() => {
    transition("ENDING");
    connection.send({ type: "call_end", data: {} });
    audioRecorder.stopRecording();
    connection.disconnect();
    transition("COMPLETE");
  }, []);

  // Orchestration: reset
  const resetCall = useCallback(() => {
    clearTranscript();
    reset();
  }, []);

  return {
    status,
    transcript,
    duration,
    error: audioRecorder.permissionError,
    startCall,
    endCall,
    resetCall,
    isMuted: controls.isMuted,
    toggleMute: controls.toggleMute,
    isConnected: connection.isConnected,
  };
}
```

---

## Summary

| Principle | Enforcement |
|-----------|-------------|
| No business logic in components | Code review: if a component has `fetch`, `WebSocket`, or `await`, it's wrong |
| One concern per hook | If a hook file exceeds 100 lines, it likely does too much |
| Hooks compose, not inherit | No hook should import another hook's internal state |
| Cleanup is mandatory | Every `useEffect` that allocates must have a cleanup return |
| State has one owner | Grep for `useState` — each piece of state should appear in exactly one hook |
| Typed returns | No `any` in hook return types — ever |
