# Requirements Document

## Introduction

Redesign the call/conversation UI panel to resemble an iPhone 16 Pro Max device. The existing simple card-based call interface (header, timer, start button) will be replaced with a realistic phone-shaped frame containing iOS-style call UI elements, calling animations, and an embedded conversation transcript. This is a frontend-only visual redesign — no backend or voice logic changes are required.

## Glossary

- **Phone_Frame**: The outer container component styled to resemble an iPhone 16 Pro Max physical device, including rounded corners, bezel, notch/Dynamic Island, and side buttons
- **Call_Screen**: The inner content area within the Phone_Frame that displays call UI elements (contact info, timer, controls, transcript)
- **Calling_Animation**: Visual feedback elements (pulsing rings, avatar glow) that indicate the call is connecting or ringing
- **Call_Controls_Bar**: The bottom section of the Call_Screen containing circular action buttons styled like iOS native Phone app controls (mute, end call, speaker, etc.)
- **Contact_Avatar**: A circular visual element at the top of the Call_Screen representing the AI agent during a call
- **Dynamic_Island**: The pill-shaped notch area at the top of the Phone_Frame mimicking the iPhone 16 Pro Max hardware feature
- **Call_Panel**: The existing React component at `frontend/src/components/call/call-panel.tsx` that manages call state display and controls
- **CallStatus**: The TypeScript type representing call lifecycle states: idle, connecting, active, ending, complete, error

## Requirements

### Requirement 1: Phone Frame Container

**User Story:** As a user, I want the call interface to be wrapped in a realistic iPhone 16 Pro Max frame, so that the UI feels immersive and modern like using an actual phone.

#### Acceptance Criteria

1. THE Phone_Frame SHALL render a container with rounded corners matching iPhone 16 Pro Max proportions (approximately 2:1 height-to-width aspect ratio)
2. THE Phone_Frame SHALL display a visible bezel border with a dark color (titanium-style) surrounding the Call_Screen content area
3. THE Phone_Frame SHALL include a Dynamic_Island element at the top center of the screen area
4. THE Phone_Frame SHALL include decorative side button elements (volume up, volume down, power) positioned on the frame edges using CSS
5. THE Phone_Frame SHALL be responsive and scale proportionally within its parent grid column without overflowing the viewport
6. THE Phone_Frame SHALL maintain its aspect ratio across viewport widths from 320px to 1920px

### Requirement 2: iOS-Style Idle State

**User Story:** As a user, I want the idle state to show a modern iOS-style call initiation screen, so that starting a call feels like using the native iPhone Phone app.

#### Acceptance Criteria

1. WHILE the CallStatus is idle, THE Call_Screen SHALL display the Contact_Avatar as a centered circular element with a user icon or AI agent identifier
2. WHILE the CallStatus is idle, THE Call_Screen SHALL display the text "RecoverAi" as the contact name below the Contact_Avatar
3. WHILE the CallStatus is idle, THE Call_Screen SHALL display a green circular call button (matching iOS Phone app styling) at the bottom of the screen
4. WHILE the CallStatus is idle, THE Call_Screen SHALL use a dark gradient background resembling the iOS call screen aesthetic

### Requirement 3: Calling/Connecting Animation

**User Story:** As a user, I want to see animated feedback when a call is connecting, so that I know the system is working and the experience feels polished.

#### Acceptance Criteria

1. WHILE the CallStatus is connecting, THE Calling_Animation SHALL display concentric pulsing rings radiating outward from the Contact_Avatar
2. WHILE the CallStatus is connecting, THE Calling_Animation SHALL animate the rings with a smooth CSS pulse animation at 1.5-second intervals
3. WHILE the CallStatus is connecting, THE Call_Screen SHALL display the text "Calling..." below the contact name
4. WHILE the CallStatus is connecting, THE green call button SHALL be replaced with a red circular end-call button to allow cancellation

### Requirement 4: Active Call UI

**User Story:** As a user, I want the active call screen to display call duration, status indicators, and controls like the iOS Phone app, so that managing the call feels intuitive.

#### Acceptance Criteria

1. WHILE the CallStatus is active, THE Call_Screen SHALL display the call duration timer in MM:SS format centered below the contact name
2. WHILE the CallStatus is active, THE Contact_Avatar SHALL display a subtle animated glow or breathing animation to indicate the call is live
3. WHILE the CallStatus is active, THE Call_Controls_Bar SHALL display a row of circular control buttons: mute, keypad (decorative/disabled), speaker (decorative/disabled), and end call
4. WHILE the CallStatus is active, THE mute button in the Call_Controls_Bar SHALL toggle between muted and unmuted states with visual feedback (filled vs outlined icon)
5. WHILE the CallStatus is active, THE end call button SHALL be styled as a red circular button matching iOS Phone app design
6. WHILE the CallStatus is active AND the AI is speaking, THE Call_Screen SHALL display a "Speaking..." indicator near the contact name
7. WHILE the CallStatus is active AND the user is speaking, THE Call_Screen SHALL display a "Listening..." indicator near the contact name

### Requirement 5: Three-Card Layout

**User Story:** As a user, I want the page to display three distinct cards — the iPhone call UI, a live transcript panel, and a call info panel — so that each piece of information has its own dedicated space and is easy to scan.

#### Acceptance Criteria

1. THE page layout SHALL display three cards arranged in a responsive grid: the Phone_Frame card (left), the Live Transcript card (center), and the Call Info card (right)
2. THE Phone_Frame card SHALL contain only the iPhone-styled call interface (avatar, timer, controls, status indicators)
3. THE Live Transcript card SHALL display the scrollable conversation transcript as a separate standalone card outside the Phone_Frame
4. THE Live Transcript card SHALL auto-scroll to the most recent message as new messages arrive
5. THE Live Transcript card SHALL display messages with visual differentiation between AI messages and caller messages (different alignment or bubble color)
6. THE Call Info card SHALL display call metadata (status, duration, message count, microphone state) and voice settings controls
7. IF the transcript is empty, THEN THE Live Transcript card SHALL display placeholder text indicating the conversation will appear during the call

### Requirement 6: Call Complete State

**User Story:** As a user, I want the call complete state to clearly indicate the call has ended and allow me to start a new call, so that the lifecycle is visually clear.

#### Acceptance Criteria

1. WHEN the CallStatus transitions to complete, THE Call_Screen SHALL display "Call Ended" text below the contact name
2. WHEN the CallStatus is complete, THE Call_Screen SHALL display the final call duration
3. WHEN the CallStatus is complete, THE Call_Controls_Bar SHALL display a single "Call Back" or "New Call" button styled as a green circular call button
4. WHEN the CallStatus is complete, THE Calling_Animation SHALL not be displayed

### Requirement 7: Error State Display

**User Story:** As a user, I want errors to be clearly visible within the phone frame UI, so that I can understand what went wrong without the design breaking.

#### Acceptance Criteria

1. IF the CallStatus is error, THEN THE Call_Screen SHALL display an error message in a visually distinct area (e.g., red-tinted banner) within the phone frame
2. IF the CallStatus is error, THEN THE Call_Controls_Bar SHALL display a "Retry" or "New Call" green circular button to allow recovery
3. IF a speech recognition error occurs during an active call, THEN THE Call_Screen SHALL display a non-blocking warning indicator without interrupting the call UI layout

### Requirement 8: Visual Design Consistency

**User Story:** As a user, I want the phone UI to use consistent iOS-inspired visual styling throughout all states, so that the experience feels cohesive and premium.

#### Acceptance Criteria

1. THE Call_Screen SHALL use a dark background gradient (dark gray to black) across all call states to match iOS Phone app aesthetics
2. THE Call_Screen SHALL use white or light-colored text for all labels and the timer to ensure readability against the dark background
3. THE Call_Controls_Bar circular buttons SHALL have a consistent size (approximately 56-64px diameter) with semi-transparent dark backgrounds and white icons
4. THE Contact_Avatar SHALL be a consistent size (approximately 80-100px diameter) with a circular shape and a subtle border or shadow
5. THE Phone_Frame SHALL apply a subtle box shadow to create depth and separation from the page background
6. THE Call_Screen SHALL use smooth CSS transitions (200-300ms duration) for all state changes to avoid jarring visual jumps
