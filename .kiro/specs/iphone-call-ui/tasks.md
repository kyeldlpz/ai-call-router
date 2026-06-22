# Implementation Plan: iPhone Call UI

## Overview

Redesign the call panel into an iPhone 16 Pro Max-styled UI with iOS call screen aesthetics, calling animations, and a 3-card page layout (phone frame, transcript, info). All work is frontend-only.

## Tasks

- [x] 1. Add custom CSS keyframe animations to `frontend/src/app/globals.css` — pulse-ring (scale 1→2.2, opacity 0.5→0, 1.5s) and avatar-glow (box-shadow pulsing blue, 2s), plus `.animate-pulse-ring` and `.animate-avatar-glow` utility classes
- [x] 2. Create `frontend/src/components/call/contact-avatar.tsx` — 80-96px gradient circle (blue-500 to purple-600) with Lucide headset icon, applies `.animate-avatar-glow` and blue shadow when `isActive`, relative positioning for ring animation center
- [x] 3. Create `frontend/src/components/call/calling-animation.tsx` — 3 concentric absolutely-positioned rings with `rounded-full border-2 border-green-400/40`, staggered `.animate-pulse-ring` delays (0s, 0.5s, 1.0s), renders only when `isActive` is true
- [x] 4. Create `frontend/src/components/call/iphone-call-controls.tsx` — iOS-style circular button bar: idle→green call button, connecting→red end button, active→row of mute/keypad/speaker/end with labels, complete/error→green retry button. Buttons are w-14/w-16 h-14/h-16 rounded-full with appropriate backgrounds and Lucide icons
- [x] 5. Create `frontend/src/components/call/iphone-call-screen.tsx` — main call screen with dark gradient background for all states, renders ContactAvatar + CallingAnimation + IPhoneCallControls + status text/timer per CallStatus, includes smooth CSS transitions (duration-300), error banner for error state, speech error as non-blocking warning
- [x] 6. Create `frontend/src/components/call/iphone-frame.tsx` — outer phone hardware frame with titanium-dark border (~6px), rounded-[3rem], shadow-2xl, max-h-[80vh], aspect-[9/19.5], Dynamic Island pill at top center, decorative side buttons, inner content area with overflow-hidden rounded-[2.5rem] and top padding for Dynamic Island clearance
- [x] 7. Update `frontend/src/components/call/call-panel.tsx` to compose IPhoneFrame wrapping IPhoneCallScreen, passing all existing props through, removing old Card/CardHeader/CardContent structure
- [x] 8. Update `frontend/src/app/page.tsx` grid layout to 4-5-3 column split (Phone Frame left, Transcript center, Info right), center phone frame vertically, ensure responsive stacking below lg breakpoint
- [x] 9. Visual polish and responsive testing — verify phone frame at 320px-1920px widths, animation smoothness, dark gradient contrast, full call lifecycle transitions, and error state rendering within the phone frame

## Notes

- No backend changes required
- No new dependencies needed — uses existing Tailwind CSS, Lucide React icons (via shadcn/ui), and React
- Old `call-controls.tsx` and `call-status-badge.tsx` are kept for potential reuse in the info card
- The existing `TranscriptPanel` component is reused as-is in the center card

## Task Dependency Graph

```json
{
  "waves": [
    {"wave": 1, "tasks": ["1", "4", "6"]},
    {"wave": 2, "tasks": ["2", "3"]},
    {"wave": 3, "tasks": ["5"]},
    {"wave": 4, "tasks": ["7"]},
    {"wave": 5, "tasks": ["8"]},
    {"wave": 6, "tasks": ["9"]}
  ]
}
```
