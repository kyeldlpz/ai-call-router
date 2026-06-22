# Design Document: iPhone Call UI

## Overview

This design replaces the existing simple card-based call panel with an immersive iPhone 16 Pro Max-styled call interface. The page layout shifts to a 3-card grid: a phone-frame component (left), a live transcript card (center), and a call info/settings card (right). All changes are frontend-only — no backend modifications are needed.

## Architecture

This is a frontend-only UI redesign. The architecture remains unchanged:

- **Pattern:** Presentational components receive props from a custom hook (`useVoiceConversation`)
- **State management:** Existing React Context + useReducer (no changes)
- **Realtime:** Existing WebSocket connection (no changes)
- **New components:** 5 new presentational components compose the iPhone UI
- **Affected files:** `call-panel.tsx` (rewritten), `page.tsx` (grid layout update), `globals.css` (new keyframes)
- **Unchanged:** All hooks, context, types, services, and backend code

## Components and Interfaces

### Component Structure

```
frontend/src/components/call/
├── iphone-frame.tsx          # Phone bezel/frame container with Dynamic Island
├── iphone-call-screen.tsx    # Inner call screen (avatar, timer, status, controls)
├── iphone-call-controls.tsx  # iOS-style circular button bar
├── calling-animation.tsx     # Pulsing ring animation component
├── contact-avatar.tsx        # Circular avatar with glow animations
├── call-panel.tsx            # REPLACED — now renders iphone-frame + iphone-call-screen
├── call-controls.tsx         # KEPT for reference, superseded by iphone-call-controls
└── call-status-badge.tsx     # KEPT — may be reused in call info card
```

### Page Layout Change

The main page (`frontend/src/app/page.tsx`) grid changes from a 3-12-3 column layout to:
- **Left (col-span-4):** iPhone Phone Frame containing the call screen
- **Center (col-span-5):** Live Transcript card (existing `TranscriptPanel` with minor styling updates)
- **Right (col-span-3):** Call Info + Voice Settings cards (existing right panel, unchanged)

### Data Flow

No data flow changes. The new components receive the same props from `useVoiceConversation()` that the current `CallPanel` receives. The interface boundary stays identical:

```
page.tsx → useVoiceConversation() → props → iphone-frame → iphone-call-screen → iphone-call-controls
                                          → TranscriptPanel (separate card)
                                          → Call Info card (separate card)
```

## Detailed Component Design

### 1. IPhoneFrame (`iphone-frame.tsx`)

**Purpose:** Renders the outer phone hardware (bezel, Dynamic Island, side buttons).

**Props:**
```typescript
interface IPhoneFrameProps {
  children: React.ReactNode;
}
```

**Styling approach:**
- Outer container: `relative`, dark titanium-colored border (~6px), rounded-[3rem] corners, aspect ratio ~19.5:9 (iPhone 16 Pro Max actual ratio), max-height constrained to viewport
- Dynamic Island: absolute-positioned pill shape (`w-28 h-7 rounded-full bg-black`) at top center
- Side buttons: absolute-positioned thin rectangles on left/right edges using `before`/`after` pseudo-elements or additional divs
- Box shadow for depth: `shadow-2xl` with a subtle dark outer glow
- Inner content area: `overflow-hidden rounded-[2.5rem]` to clip the call screen within the phone shape

### 2. IPhoneCallScreen (`iphone-call-screen.tsx`)

**Purpose:** The main call interface that renders different states (idle, connecting, active, complete, error).

**Props:**
```typescript
interface IPhoneCallScreenProps {
  status: CallStatus;
  duration: number;
  error: string | null;
  speechError: string | null;
  isMuted: boolean;
  isSpeaking: boolean;
  isSpeechSupported: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}
```

**State-based rendering:**
- **idle:** Dark gradient bg, centered avatar, "RecoverAi" name, green call button
- **connecting:** Same bg, avatar with pulsing rings, "Calling..." text, red end button
- **active:** Avatar with glow, timer, speaking/listening indicator, full control bar
- **complete:** "Call Ended" text, final duration, green "New Call" button
- **error:** Error banner, retry button

**Background:** `bg-gradient-to-b from-gray-900 via-gray-950 to-black` — consistent dark gradient in all states.

### 3. CallingAnimation (`calling-animation.tsx`)

**Purpose:** Renders concentric pulsing rings around the avatar during the "connecting" state.

**Props:**
```typescript
interface CallingAnimationProps {
  isActive: boolean;
}
```

**Implementation:**
- 3 concentric rings using `absolute` positioning around the avatar
- Each ring: `rounded-full border-2 border-green-400/40`
- Staggered CSS animation using Tailwind's `animate-ping` or a custom keyframe with different `animation-delay` values (0s, 0.5s, 1.0s)
- Rings fade out (opacity 0) at full expansion

**Custom keyframe (added to `globals.css`):**
```css
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

### 4. ContactAvatar (`contact-avatar.tsx`)

**Purpose:** Circular avatar element representing the AI agent.

**Props:**
```typescript
interface ContactAvatarProps {
  isActive: boolean;
  isConnecting: boolean;
}
```

**Implementation:**
- 80-96px circle with `rounded-full bg-gradient-to-br from-blue-500 to-purple-600`
- Contains a headset/phone icon (using Lucide icons already in the project via shadcn/ui)
- When `isActive`: applies a `shadow-lg shadow-blue-500/50` glow + subtle `animate-pulse` at reduced intensity
- When `isConnecting`: serves as the center point for `CallingAnimation` rings

### 5. IPhoneCallControls (`iphone-call-controls.tsx`)

**Purpose:** iOS-style circular button row at the bottom of the call screen.

**Props:**
```typescript
interface IPhoneCallControlsProps {
  status: CallStatus;
  isMuted: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}
```

**Button styling:**
- Circular buttons: `w-14 h-14 rounded-full` (56px)
- Default bg: `bg-white/10 backdrop-blur-sm`
- Muted state: `bg-white text-gray-900` (filled, like iOS)
- End call: `bg-red-500 w-16 h-16` (slightly larger, prominent)
- Start call / New call: `bg-green-500 w-16 h-16`
- Icons: Lucide React icons (Phone, PhoneOff, Mic, MicOff, Volume2, Grid3X3)

**Layout per state:**
- **idle:** Single centered green call button
- **connecting:** Single centered red end button
- **active:** Row of 4 buttons — mute | keypad (disabled) | speaker (disabled) | end
- **complete/error:** Single centered green call/retry button

## Data Models

This feature is frontend-only and does not introduce new data models. It consumes the existing `CallStatus`, `TranscriptMessage`, and related types from `frontend/src/types/index.ts`. No new types are added to the shared type file.

### New Component Props Interfaces

These are defined locally in each component file per project conventions:

| Interface | File | Purpose |
|-----------|------|---------|
| `IPhoneFrameProps` | `iphone-frame.tsx` | Wraps children in phone bezel |
| `IPhoneCallScreenProps` | `iphone-call-screen.tsx` | Receives all call state and callbacks |
| `IPhoneCallControlsProps` | `iphone-call-controls.tsx` | Receives status, mute state, callbacks |
| `CallingAnimationProps` | `calling-animation.tsx` | Controls animation visibility |
| `ContactAvatarProps` | `contact-avatar.tsx` | Controls avatar glow/animation state |

## CSS Additions

Add to `frontend/src/app/globals.css`:

```css
@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

@keyframes avatar-glow {
  0%, 100% {
    box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 30px 8px rgba(59, 130, 246, 0.5);
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-avatar-glow {
  animation: avatar-glow 2s ease-in-out infinite;
}
```

## Migration Path

1. Create new components (`iphone-frame`, `iphone-call-screen`, `iphone-call-controls`, `calling-animation`, `contact-avatar`)
2. Update `call-panel.tsx` to compose the new components instead of the old Card-based layout
3. Update `page.tsx` grid layout to accommodate the phone frame's larger width
4. Keep old `call-controls.tsx` and `call-status-badge.tsx` for potential reuse in the info card
5. No changes to hooks, context, types, or any backend code

## Error Handling

- **Browser not supported (no speech recognition):** Renders a warning banner inside the phone screen (below Dynamic Island area) with guidance to use Chrome/Edge. Does not break phone frame layout.
- **Microphone permission denied:** Renders a non-blocking indicator below the contact name. The call UI remains interactive (user can still see the phone frame and retry).
- **AI service error (status=error):** Renders a red-tinted error message inside the phone screen with a green retry button in the controls bar. The phone frame container remains stable.
- **WebSocket disconnection during call:** The existing connection indicator in the page header remains. Inside the phone screen, the status text updates to reflect the disconnect. No modal or toast — inline only.

All error states are handled within the phone frame's content area. The phone bezel/frame itself is never disrupted by error states.

## Testing Strategy

Since this is a purely visual/presentational feature, testing focuses on:

1. **Component render tests (Vitest + React Testing Library):** Verify correct elements render for each CallStatus value
2. **Property-based tests:** Duration formatting and control-button-set correctness across all states
3. **Manual visual testing:** The primary quality gate for animations, responsiveness, and iOS-fidelity is running the demo (per project testing philosophy)

No backend tests needed. No integration tests needed.

## Correctness Properties

### Property 1: Duration format consistency

For all non-negative integer duration values, the formatted timer string SHALL match the pattern `M:SS` or `MM:SS` (minutes colon two-digit seconds).

**Validates: Requirements 4.1**

**Tested by:** Property-based test generating random duration values (0 to 7200) and asserting regex match against `/^\d+:\d{2}$/`.

### Property 2: Call screen always renders dark gradient background

For all valid CallStatus values (idle, connecting, active, ending, complete, error), the Call_Screen root element SHALL contain the dark gradient background classes.

**Validates: Requirements 8.1**

**Tested by:** Property-based test iterating over all CallStatus enum values and asserting the gradient class is present in the rendered output.

### Property 3: Control button set matches call status

For each CallStatus value, the set of rendered control buttons SHALL match the expected set defined in the design:
- idle → green call button only
- connecting → red end button only
- active → mute + keypad + speaker + end
- complete → green new-call button only
- error → green retry button only

**Validates: Requirements 2.3, 3.4, 4.3, 6.3, 7.2**

**Tested by:** Property-based test iterating over all CallStatus values and asserting exact button counts and types.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phone frame overflow on small screens | Broken layout | Use max-h-[80vh] with aspect-ratio CSS, test at 320px width |
| Animation jank on low-end devices | Poor demo impression | Use `will-change: transform` and GPU-accelerated properties only (transform, opacity) |
| Tailwind class conflicts with existing styles | Visual regressions | Scope phone-frame styles with specific class prefix, test in isolation |
| Dynamic Island obscuring content | Content hidden at top | Add top padding to call screen content area equal to Dynamic Island height + 12px |
