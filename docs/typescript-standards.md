# TypeScript Standards

## Strict Typing

### Compiler Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Zero Tolerance Rules

| Rule | Enforcement |
|------|-------------|
| No `any` | Compile error. Use `unknown` + type guard if type is truly unknown |
| No `as` type assertions | Except for DOM element refs (`as HTMLInputElement`) |
| No `!` non-null assertions | Use optional chaining + nullish coalescing instead |
| No implicit `any` in callbacks | Always type callback parameters |

### When `unknown` is Acceptable

```typescript
// GOOD — unknown with type guard
function handleWsMessage(raw: unknown): WsMessage | null {
  if (!isWsMessage(raw)) return null;
  return raw;
}

// BAD — any to skip validation
function handleWsMessage(raw: any): WsMessage {
  return raw as WsMessage;
}
```

---

## Interface Standards

### Interface vs Type

| Use Case | Use |
|----------|-----|
| Object shapes (props, state, API responses) | `interface` |
| Unions, intersections, mapped types | `type` |
| Extending/implementing | `interface` |
| Function signatures (standalone) | `type` |

### Props Interfaces

```typescript
// GOOD — interface named ComponentNameProps, in same file, above component
interface TranscriptPanelProps {
  callId: string;
  isActive: boolean;
  onMessageReceived?: (msg: TranscriptMessage) => void;
}

export function TranscriptPanel({ callId, isActive, onMessageReceived }: TranscriptPanelProps) {
  ...
}
```

### Shared Types

All shared types live in `src/types/index.ts`. A type is "shared" if:
- It's used in 2+ files
- It represents an API contract
- It represents state shape

Types used in only one file stay in that file.

---

## Type Safety Rules

### API Response Typing

```typescript
// GOOD — validate at the boundary, trust internally
async function fetchCallDetails(callId: string): Promise<CallState> {
  const response = await fetch(`/api/v1/calls/${callId}`);
  const json: unknown = await response.json();
  return parseApiResponse<CallState>(json, callStateSchema);
}

// BAD — trust the network blindly
async function fetchCallDetails(callId: string): Promise<CallState> {
  const response = await fetch(`/api/v1/calls/${callId}`);
  return response.json(); // implicitly any
}
```

### WebSocket Message Typing

```typescript
// Type guard for incoming WebSocket messages
function isWsMessage(data: unknown): data is WsMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "data" in data &&
    "timestamp" in data &&
    "sequence" in data
  );
}
```

### Discriminated Unions for State

```typescript
// GOOD — exhaustive pattern matching
type CallState =
  | { status: "idle" }
  | { status: "connecting"; callId: string }
  | { status: "active"; callId: string; transcript: TranscriptMessage[] }
  | { status: "complete"; callId: string; summary: HandoffSummary }
  | { status: "error"; error: string };

function renderStatus(state: CallState) {
  switch (state.status) {
    case "idle": return <IdleView />;
    case "connecting": return <ConnectingView callId={state.callId} />;
    case "active": return <ActiveView transcript={state.transcript} />;
    case "complete": return <SummaryView summary={state.summary} />;
    case "error": return <ErrorView error={state.error} />;
  }
}
```

---

## Generic Usage Rules

### When to Use Generics

- API response wrappers: `ApiResponse<T>`
- WebSocket message payloads: `WsMessage<T>`
- Collection utilities that operate on any type
- Hook factories that return typed state

### When NOT to Use Generics

- If the type parameter is always the same concrete type
- If it makes the code harder to read without adding safety
- If you're using it to avoid writing a specific type

### Examples

```typescript
// GOOD — generic API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

// GOOD — constrained generic
function getLatestMessage<T extends { timestamp: string }>(messages: T[]): T | undefined {
  return messages.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

// BAD — unnecessary generic (always used with one type)
function formatScore<T extends OpportunityScore>(score: T): string {
  return `${score.value}/100`;
}
// Just use: function formatScore(score: OpportunityScore): string
```

---

## Import Ordering

Enforce this order with a blank line between groups:

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { clsx } from "clsx";

// 3. Internal UI components (shadcn/ui first, then custom)
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 4. Internal feature components
import { TranscriptMessage } from "@/components/transcript/transcript-message";

// 5. Hooks and context
import { useCall } from "@/hooks/use-call";
import { useCallContext } from "@/context/call-context";

// 6. Lib utilities
import { formatTimestamp } from "@/lib/utils";

// 7. Types (always last, always with `type` keyword)
import type { CallStatus, TranscriptMessage as TranscriptMessageType } from "@/types";
```

---

## Naming Conventions

### Variables and Functions

```typescript
// camelCase for variables and functions
const callStatus = "active";
const isRecording = true;
function formatTimestamp(ts: string): string { ... }

// PascalCase for components, interfaces, types, enums
function TranscriptPanel() { ... }
interface CallState { ... }
type IntentType = "payment_inquiry" | "dispute";
enum CallStatus { Idle, Active, Complete }

// UPPER_CASE for true constants (not derived values)
const MAX_RECONNECT_ATTEMPTS = 3;
const WS_HEARTBEAT_INTERVAL_MS = 30_000;
```

### Boolean Naming

```typescript
// Prefix with is/has/should/can
const isActive = true;
const hasTranscript = messages.length > 0;
const shouldReconnect = attempts < MAX_RECONNECT_ATTEMPTS;
const canEndCall = status === "active";

// NOT
const active = true; // ambiguous
const transcript = messages.length > 0; // confusing
```

### Event Handlers

```typescript
// Prefix with on (props) or handle (internal)
interface Props {
  onCallStart: () => void;      // prop callback
  onMessageReceived: (msg: TranscriptMessage) => void;
}

function CallPanel({ onCallStart }: Props) {
  const handleStartClick = () => {  // internal handler
    onCallStart();
  };
}
```

---

## Function Design Rules

### Maximum Parameters: 3

```typescript
// GOOD — options object for 4+ params
interface StartCallOptions {
  scenarioId: string;
  audioEnabled: boolean;
  autoTranscribe: boolean;
  onError: (err: string) => void;
}

function startCall(options: StartCallOptions): void { ... }

// BAD — too many positional params
function startCall(
  scenarioId: string,
  audioEnabled: boolean,
  autoTranscribe: boolean,
  onError: (err: string) => void
): void { ... }
```

### Return Types

- Always explicit on exported functions
- Inferred is acceptable for internal/private helpers <10 lines
- Never return `void` from async functions that can fail — return a result type

```typescript
// GOOD — explicit return, result type for fallible operations
export async function connectWebSocket(url: string): Promise<{ ws: WebSocket } | { error: string }> {
  ...
}

// BAD — void async that swallows errors
export async function connectWebSocket(url: string): Promise<void> {
  try { ... } catch { /* silent */ }
}
```

### Pure Functions First

Prefer pure functions (no side effects) for:
- Data transformation
- Formatting
- Validation
- Reducers

Side effects belong in:
- Hooks (useEffect)
- Event handlers
- Service calls

---

## Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| `obj as any` | Type the object correctly or use `unknown` + guard |
| `// @ts-ignore` | Fix the type error. If genuinely unfixable, use `// @ts-expect-error` with explanation |
| `useState<any>` | Provide the concrete type: `useState<CallState \| null>(null)` |
| Barrel exports (`index.ts` re-exporting everything) | Direct imports to specific files |
| String enums for internal state | Use union literal types |
| `useEffect` for derived state | Use `useMemo` or compute inline |
| Prop drilling >2 levels | Use context |

---

## Checklist: TypeScript File Review

```
□ No `any` types
□ No type assertions (except DOM refs)
□ All exported functions have explicit return types
□ Props interface defined and named correctly
□ Imports follow ordering convention
□ Booleans use is/has/should/can prefix
□ No more than 3 positional parameters
□ Discriminated unions for state with exhaustive matching
□ Type guards at data boundaries (API, WebSocket)
```
