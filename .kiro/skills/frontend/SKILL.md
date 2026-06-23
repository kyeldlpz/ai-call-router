# Frontend Skills — RecoverAi

## Purpose

Enforce consistent frontend development patterns for all developers and AI agents working on the Next.js application.

---

## Next.js Standards

### Rules

1. Use App Router exclusively (no Pages Router)
2. All pages in `src/app/` directory
3. Single page application for MVP — only `page.tsx` at the root
4. `layout.tsx` wraps the app with providers (CallProvider)
5. No server components that fetch data — this is a client-heavy real-time app
6. Use `"use client"` directive on all components that use hooks or browser APIs
7. No `getServerSideProps` or `getStaticProps` — those are Pages Router

### Example

```tsx
// src/app/layout.tsx
import { CallProvider } from "@/context/call-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
```

---

## React Standards

### Rules

1. Functional components only — no class components
2. Named exports only — no `export default` on components
3. Hooks at the top of the component, before any logic
4. Memoize expensive computations with `useMemo`
5. Memoize callbacks passed to children with `useCallback` only when necessary (child uses React.memo)
6. Never mutate state directly
7. No `useEffect` for derived state — compute inline

### Component Template

```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { TranscriptMessage } from "@/types";

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  isActive: boolean;
}

export function TranscriptPanel({ messages, isActive }: TranscriptPanelProps) {
  // 1. Hooks
  const scrollRef = useRef<HTMLDivElement>(null);

  // 2. Derived state
  const hasMessages = messages.length > 0;

  // 3. Effects (minimal)
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // 4. Handlers
  // (none for this component)

  // 5. Render
  return (
    <Card>
      {hasMessages ? (
        messages.map(m => <TranscriptMessage key={m.id} message={m} />)
      ) : (
        <EmptyState />
      )}
      <div ref={scrollRef} />
    </Card>
  );
}
```

---

## Component Composition

### Rules

1. Components are small and focused — one visual concern per component
2. Parent components compose children — no god components
3. Props flow down, events flow up
4. No prop drilling beyond 2 levels — use context for deeper sharing
5. Presentational components receive data as props, never fetch it themselves
6. Container pattern: hooks provide data, components render it

### Hierarchy Pattern

```
page.tsx (layout, grid)
├── CallPanel (call controls, status)
│   ├── CallStatusBadge (visual indicator)
│   ├── CallControls (buttons)
│   └── CallDuration (timer)
└── TranscriptPanel (message list)
    └── TranscriptMessage (single message)
```

### Anti-Pattern

```tsx
// BAD: God component doing everything
export function Dashboard() {
  const [callState, setCallState] = useState(...);
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);
  // 200 lines of mixed concerns
  return <div>/* everything inline */</div>;
}
```

---

## Custom Hook Strategy

### Rules

1. Hooks encapsulate behavior, not UI
2. One hook per concern: `useCall`, `useWebSocket`, `useAudio`
3. Hooks return typed objects — never tuples with more than 2 items
4. Hooks handle cleanup in their own `useEffect` return
5. Hooks do NOT render JSX
6. Name format: `use-{concern}.ts` (file), `use{Concern}` (function)

### Hook Template

```tsx
// hooks/use-websocket.ts
export function useWebSocket(url: string | null) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed" | "error">("closed");
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => { /* ... */ }, [url]);
  const send = useCallback((message: object) => { /* ... */ }, []);
  const disconnect = useCallback(() => { /* ... */ }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return { status, connect, send, disconnect };
}
```

---

## UI Consistency

### Rules

1. All spacing uses Tailwind spacing scale (multiples of 4px: `p-2`, `p-4`, `p-6`)
2. All colors use Tailwind/shadcn theme tokens — never hex codes inline
3. Border radius: `rounded-lg` for cards, `rounded-md` for buttons, `rounded-full` for badges
4. Shadows: `shadow-sm` for subtle depth, `shadow-md` for elevated elements
5. Font sizes: use Tailwind scale (`text-sm`, `text-base`, `text-lg`). No custom px values.
6. Consistent icon library: Lucide React (installed with shadcn/ui)

### Color Semantics

| Element | Color Token |
|---------|-------------|
| AI messages | `bg-muted` (subtle background) |
| Caller messages | `bg-primary/10` (tinted) |
| Active status | `text-green-500` |
| Error status | `text-destructive` |
| Connecting | `text-yellow-500` with `animate-pulse` |

---

## Error States

### Rules

1. Every async operation has an error state
2. Errors are user-friendly messages — no raw error codes or stack traces
3. Transient errors → Toast notification (auto-dismiss in 5s)
4. Persistent errors → Inline Alert component with action button
5. Connection loss → Top banner that persists until reconnected
6. All error states are recoverable — provide a retry or reset action

### Pattern

```tsx
if (state.status === "error") {
  return (
    <Alert variant="destructive">
      <AlertTitle>Connection Failed</AlertTitle>
      <AlertDescription>
        {state.error}
        <Button variant="outline" size="sm" onClick={resetCall}>
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Loading States

### Rules

1. Use Skeleton loaders for content that will appear (shadcn/ui Skeleton)
2. Use pulsing indicators for status that is in progress
3. Never show a blank screen — always show something
4. Disable buttons during loading — do not allow double-clicks
5. Show status text during connection: "Connecting to AI..."

### Anti-Pattern

```tsx
// BAD: Blank screen while loading
if (loading) return null;

// BAD: Generic spinner with no context
if (loading) return <Spinner />;

// GOOD: Contextual loading
if (state.status === "connecting") {
  return (
    <Card className="animate-pulse">
      <p className="text-muted-foreground">Connecting to AI agent...</p>
    </Card>
  );
}
```

---

## Accessibility Requirements

### Rules

1. All interactive elements must be keyboard accessible
2. Buttons have descriptive text (not just icons)
3. Status changes announced via `aria-live="polite"` regions
4. Color is never the only indicator — pair with text or icons
5. Focus management: after state transitions, focus moves to the relevant element
6. Minimum touch target: 44x44px for mobile (even though primary demo is desktop)

### Examples

```tsx
// Status badge with aria
<Badge aria-label={`Call status: ${status}`} role="status">{status}</Badge>

// Transcript region
<div role="log" aria-label="Live transcript" aria-live="polite">
  {messages.map(m => <TranscriptMessage key={m.id} message={m} />)}
</div>
```

---

## Tailwind Standards

### Rules

1. Use utility classes directly — no `@apply` in CSS files (except for base styles in `globals.css`)
2. No inline styles (`style={{}}`) — everything through Tailwind
3. Use `cn()` utility (from `lib/utils.ts`) for conditional classes
4. Group related utilities: layout → spacing → sizing → typography → colors → effects
5. Max 8 utilities per element. If more, extract to a component or use `cn()` with variables.

### Class Ordering Convention

```tsx
// Order: position, display, flex/grid, spacing, sizing, typography, colors, borders, effects
<div className="relative flex items-center gap-4 p-4 w-full text-sm text-muted-foreground bg-card rounded-lg shadow-sm">
```

### Anti-Pattern

```tsx
// BAD: Inline styles
<div style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>

// BAD: @apply in component CSS modules
.panel { @apply flex flex-col gap-4 p-4 bg-card rounded-lg; }
```

---

## shadcn/ui Usage Standards

### Rules

1. Always use shadcn/ui components before building custom ones
2. Do NOT modify files in `components/ui/` — they are auto-generated
3. Extend shadcn components by wrapping them in domain components
4. Use the shadcn/ui CLI to add new components: `npx shadcn-ui@latest add [component]`
5. Required components for MVP: Button, Card, Badge, ScrollArea, Alert, Toast, Skeleton

### Wrapping Pattern

```tsx
// components/call/call-status-badge.tsx
import { Badge } from "@/components/ui/badge";
import type { CallStatus } from "@/types";

const STATUS_VARIANTS: Record<CallStatus, string> = {
  idle: "bg-gray-100 text-gray-600",
  connecting: "bg-yellow-100 text-yellow-700 animate-pulse",
  active: "bg-green-100 text-green-700",
  ending: "bg-orange-100 text-orange-700",
  complete: "bg-blue-100 text-blue-700",
  error: "bg-red-100 text-red-700",
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return <Badge className={STATUS_VARIANTS[status]}>{status}</Badge>;
}
```

### Anti-Pattern

```tsx
// BAD: Editing shadcn component directly
// components/ui/badge.tsx — DO NOT EDIT

// BAD: Building custom button when shadcn has one
<button className="px-4 py-2 bg-blue-500 text-white rounded">Click</button>
// GOOD:
<Button variant="default">Click</Button>
```
