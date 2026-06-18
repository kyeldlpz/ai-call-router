# RecoverAi — Structure Steering Document

## Repository Layout

```
ai-call-router/
├── .kiro/
│   ├── steering/          # Steering documents (product, tech, structure)
│   ├── specs/             # Feature specifications
│   └── settings/          # MCP and other settings
├── frontend/              # Next.js application
├── backend/               # FastAPI application
├── docs/                  # Project documentation, demo scripts
├── .env.example           # Environment variable template
├── .gitignore
└── README.md
```

---

## Frontend Folder Structure

```
frontend/
├── public/
│   └── assets/            # Static images, icons
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Dashboard (main page)
│   │   └── globals.css    # Tailwind base styles
│   ├── components/
│   │   ├── ui/            # shadcn/ui components (auto-generated, do not edit)
│   │   ├── call/          # Call-related components
│   │   │   ├── call-panel.tsx
│   │   │   ├── call-controls.tsx
│   │   │   └── call-status-badge.tsx
│   │   ├── transcript/    # Live transcript components
│   │   │   ├── transcript-panel.tsx
│   │   │   └── transcript-message.tsx
│   │   ├── intent/        # Intent detection display
│   │   │   ├── intent-badge.tsx
│   │   │   └── intent-panel.tsx
│   │   ├── scoring/       # Opportunity scoring display
│   │   │   ├── score-card.tsx
│   │   │   └── score-gauge.tsx
│   │   └── summary/       # Agent handoff summary
│   │       ├── summary-card.tsx
│   │       └── summary-panel.tsx
│   ├── context/
│   │   ├── call-context.tsx       # Global call state
│   │   └── call-reducer.ts        # State reducer logic
│   ├── hooks/
│   │   ├── use-websocket.ts       # WebSocket connection hook
│   │   ├── use-call.ts            # Call management hook
│   │   └── use-audio.ts           # Browser audio capture hook
│   ├── lib/
│   │   ├── api.ts                 # REST API client functions
│   │   ├── websocket.ts           # WebSocket client utilities
│   │   └── utils.ts               # General utilities (cn helper, formatters)
│   └── types/
│       └── index.ts               # ALL shared TypeScript types (single file)
├── components.json        # shadcn/ui configuration
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Backend Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app creation, CORS, startup
│   ├── config.py                  # Settings and environment variables
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py         # Main API router (aggregates all routes)
│   │   │   ├── calls.py          # Call management endpoints
│   │   │   ├── summaries.py      # Handoff summary endpoints
│   │   │   └── health.py         # Health check endpoint
│   │   └── ws/
│   │       ├── __init__.py
│   │       └── call_session.py   # WebSocket call session handler
│   ├── services/
│   │   ├── __init__.py
│   │   ├── voice_intake.py       # OpenAI Realtime API integration
│   │   ├── transcription.py      # Transcript processing
│   │   ├── intent_detection.py   # Intent classification service
│   │   ├── opportunity_scoring.py # Opportunity scoring service
│   │   └── summary_generation.py # Handoff summary generation
│   ├── prompts/
│   │   ├── intake_system.py      # Voice intake system prompt
│   │   ├── intent_system.py      # Intent detection system prompt
│   │   ├── scoring_system.py     # Opportunity scoring system prompt
│   │   └── summary_system.py     # Summary generation system prompt
│   ├── models/
│   │   ├── __init__.py
│   │   ├── call.py               # Call state model
│   │   ├── transcript.py         # Transcript models
│   │   ├── intent.py             # Intent classification models
│   │   ├── score.py              # Opportunity score models
│   │   └── summary.py            # Handoff summary models
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── call_repository.py   # In-memory call data store
│   └── mock/
│       ├── __init__.py
│       ├── accounts.py           # Mock customer account data
│       └── scenarios.py          # Pre-built demo call scenarios
├── requirements.txt
├── .env.example
└── README.md
```

---

## Component Structure

### Frontend Component Rules

Every component file follows this structure:

```tsx
// 1. Imports (external, then internal, then types)
import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { CallStatus } from "@/types";

// 2. Props interface (if component accepts props)
interface TranscriptPanelProps {
  callId: string;
  isActive: boolean;
}

// 3. Component (named export, not default export)
export function TranscriptPanel({ callId, isActive }: TranscriptPanelProps) {
  // hooks first
  // derived state second
  // handlers third
  // return JSX last
}
```

### Rules
- One component per file. No multi-component files.
- Named exports only. No `export default`.
- Props interface defined in the same file, directly above the component.
- Shared types go in `types/index.ts`, NOT in component files.
- No business logic in components. Components call hooks or context; hooks call lib functions.

---

## Naming Conventions

### Files and Folders
| Item | Convention | Example |
|------|-----------|---------|
| React components | kebab-case | `call-panel.tsx` |
| Hooks | kebab-case with `use-` prefix | `use-websocket.ts` |
| Utility modules | kebab-case | `api.ts`, `utils.ts` |
| Type files | kebab-case | `index.ts` |
| Python modules | snake_case | `intent_detection.py` |
| Python models | snake_case | `call.py` |
| Folders | kebab-case (frontend), snake_case (backend) | `transcript/`, `intent_detection/` |

### Code
| Item | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `TranscriptPanel` |
| TypeScript functions | camelCase | `formatTimestamp` |
| TypeScript variables | camelCase | `callStatus` |
| TypeScript interfaces/types | PascalCase | `CallState`, `IntentType` |
| TypeScript enums | PascalCase members | `CallStatus.Active` |
| Python functions | snake_case | `detect_intent` |
| Python classes | PascalCase | `CallSession` |
| Python variables | snake_case | `call_id` |
| Python constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| API endpoints | snake_case in URL | `/api/v1/call_sessions` |
| WebSocket message types | snake_case | `transcript_delta` |
| Environment variables | UPPER_SNAKE_CASE | `OPENAI_API_KEY` |

---

## Service Layer Rules

### Backend Services (`backend/app/services/`)

1. Each service is a single Python module with functions (not classes, unless state is needed)
2. All service functions are `async`
3. Services never import from `api/` — dependency flows downward only
4. Services receive data as typed parameters, never raw request objects
5. Services return Pydantic models, never raw dictionaries
6. Each service handles its own errors and raises domain-specific exceptions

```python
# Good
async def detect_intent(transcript: str, account_context: AccountContext) -> IntentResult:
    ...

# Bad - raw dict return, no type hints
def detect_intent(data):
    return {"intent": "payment"}
```

---

## AI Layer Rules

### Prompts (`backend/app/prompts/`)

1. Each prompt is a Python file exporting a string constant
2. Prompt files contain ONLY the prompt text and a version comment
3. No logic, no functions, no imports (except typing if needed for templates)
4. Prompts are referenced by import in service modules

```python
# backend/app/prompts/intent_system.py
# v1.0 - Intent classification for collections calls

INTENT_SYSTEM_PROMPT = """You are a collections call intent classifier.
Given a transcript excerpt from an inbound collections call, classify the caller's primary intent.

Valid intents:
- payment_inquiry: Caller wants to know their balance or payment options
- dispute: Caller disputes the debt or charges
- hardship: Caller reports financial hardship
- settlement_offer: Caller wants to negotiate a reduced payoff
- information_request: Caller needs general account information
- callback_request: Caller wants an agent to call them back

Respond with JSON only."""
```

### AI Service Rules
1. All OpenAI API calls happen in service modules under `services/`
2. API key is loaded from config, never hardcoded
3. Structured outputs use Pydantic model schemas passed to the API
4. Every AI call has a timeout (30 seconds for completions, 60 seconds for realtime)
5. AI responses are validated against Pydantic models before returning

---

## API Layer Rules

### Route Handlers (`backend/app/api/`)

1. Route handlers are thin — validate input, call service, return response
2. No business logic in route handlers
3. No direct AI calls in route handlers
4. All routes use dependency injection for shared resources
5. Route handlers catch service exceptions and map them to HTTP responses

```python
# Good - thin handler
@router.post("/calls/{call_id}/end")
async def end_call(call_id: str) -> ApiResponse[SummaryResponse]:
    summary = await summary_generation.generate_handoff_summary(call_id)
    return ApiResponse(success=True, data=summary)

# Bad - logic in handler
@router.post("/calls/{call_id}/end")
async def end_call(call_id: str):
    call = calls_db[call_id]
    transcript = call["transcript"]
    response = await openai.chat.completions.create(...)  # NO!
```

---

## Shared Types Rules

### Frontend (`frontend/src/types/index.ts`)

ALL shared types in a single file. This is intentional for a hackathon — avoids import path confusion when multiple developers work simultaneously.

```typescript
// Call types
export type CallStatus = "idle" | "connecting" | "active" | "processing" | "complete" | "error";

export interface CallState {
  callId: string | null;
  status: CallStatus;
  transcript: TranscriptMessage[];
  intent: IntentResult | null;
  score: OpportunityScore | null;
  summary: HandoffSummary | null;
}

// Transcript types
export interface TranscriptMessage {
  id: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: string;
}

// Intent types
export type IntentType = "payment_inquiry" | "dispute" | "hardship" | "settlement_offer" | "information_request" | "callback_request";

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  signals: string[];
}

// Score types
export type ScoreLevel = "high" | "medium" | "low";

export interface OpportunityScore {
  level: ScoreLevel;
  value: number; // 0-100
  factors: string[];
}

// Summary types
export interface HandoffSummary {
  callId: string;
  callerName: string;
  accountNumber: string;
  intent: IntentType;
  score: OpportunityScore;
  keyPoints: string[];
  recommendedAction: string;
  generatedAt: string;
}

// WebSocket message types
export type WsMessageType = "transcript_delta" | "intent_update" | "score_update" | "call_status" | "error";

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  data: T;
  timestamp: string;
  sequence: number;
}
```

---

## State Management Strategy

### Call State Machine

```
idle → connecting → active → processing → complete
  ↑                    ↓
  └──────── error ←────┘
```

### Context Shape

```typescript
interface CallContextValue {
  state: CallState;
  dispatch: React.Dispatch<CallAction>;
  startCall: () => void;
  endCall: () => void;
}
```

### Reducer Actions

```typescript
type CallAction =
  | { type: "CALL_START"; callId: string }
  | { type: "CALL_CONNECTED" }
  | { type: "TRANSCRIPT_DELTA"; message: TranscriptMessage }
  | { type: "INTENT_UPDATE"; intent: IntentResult }
  | { type: "SCORE_UPDATE"; score: OpportunityScore }
  | { type: "CALL_END" }
  | { type: "SUMMARY_RECEIVED"; summary: HandoffSummary }
  | { type: "CALL_ERROR"; error: string }
  | { type: "CALL_RESET" };
```

---

## Frontend Feature Organization

Features are grouped by domain, not by type:

```
components/
├── call/          → Everything about starting/stopping/status of a call
├── transcript/    → Everything about displaying the live transcript
├── intent/        → Everything about showing detected intent
├── scoring/       → Everything about the opportunity score display
└── summary/       → Everything about the handoff summary
```

Each feature folder contains ONLY presentational components. Logic lives in `hooks/` and `context/`.

---

## Backend Feature Organization

Features are organized by architectural layer, with each service owning its domain:

```
services/
├── voice_intake.py         → Owns the OpenAI Realtime API session
├── transcription.py        → Owns transcript processing and formatting
├── intent_detection.py     → Owns intent classification
├── opportunity_scoring.py  → Owns opportunity scoring
└── summary_generation.py   → Owns handoff summary creation
```

Each service is self-contained. Services may call other services (e.g., `summary_generation` reads from `intent_detection` results), but never in a circular fashion.

---

## Testing Strategy

### Hackathon Testing Philosophy
- No unit test requirement. Demo reliability is tested by running the demo.
- Manual testing of the happy path is the primary quality gate.
- If you write a test, it must be for a critical path that's easy to break (e.g., WebSocket message parsing).

### What Gets Tested (If Time Permits)
| Layer | Tool | What to test |
|-------|------|--------------|
| Backend services | pytest | Intent detection returns valid enum, scoring returns 0-100 |
| API endpoints | httpx + pytest | Status codes, response envelope shape |
| WebSocket | pytest-asyncio | Message format, connection lifecycle |
| Frontend | Vitest | Reducer logic (pure functions only) |

### What Does NOT Get Tested
- UI rendering (visual testing is the demo itself)
- AI prompt quality (tested by running the demo with real prompts)
- Integration between frontend and backend (tested manually)

---

## Mock Data Strategy

### Design Principles
1. Mock data is realistic enough to demo convincingly
2. All mock data lives in `backend/app/mock/`
3. Mock data is deterministic — same call scenario produces same results every time
4. At least 3 distinct call scenarios for demo variety

### Required Scenarios

```python
# backend/app/mock/scenarios.py

SCENARIOS = {
    "settlement_sarah": {
        "caller_name": "Sarah Mitchell",
        "account_number": "ACC-2024-7891",
        "balance": 4200.00,
        "intent": "settlement_offer",
        "scenario_description": "Caller wants to settle for 60% of balance"
    },
    "dispute_marcus": {
        "caller_name": "Marcus Johnson",
        "account_number": "ACC-2024-3456",
        "balance": 1850.00,
        "intent": "dispute",
        "scenario_description": "Caller disputes charges, claims already paid"
    },
    "hardship_elena": {
        "caller_name": "Elena Rodriguez",
        "account_number": "ACC-2024-9012",
        "balance": 6500.00,
        "intent": "hardship",
        "scenario_description": "Caller reports job loss, requests payment plan"
    }
}
```

### Mock Account Data

```python
# backend/app/mock/accounts.py

ACCOUNTS = {
    "ACC-2024-7891": {
        "name": "Sarah Mitchell",
        "balance": 4200.00,
        "days_past_due": 45,
        "last_payment": "2025-03-15",
        "payment_history": "irregular",
        "risk_tier": "medium"
    },
    # ... additional accounts
}
```

### Rules
- Mock data uses realistic but obviously fictional names and numbers
- Account numbers follow a consistent format: `ACC-YYYY-NNNN`
- Balances range from $500 to $15,000 (realistic collections range)
- Never use real names, real SSNs, real phone numbers, or real addresses
