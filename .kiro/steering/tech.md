# RecoverAi — Technical Steering Document

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS 3.4+
- **Components:** shadcn/ui (do not use other component libraries)
- **State:** React Context + useReducer for global state, useState for local
- **Realtime:** WebSocket via native browser API or Socket.io client

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Language:** Python with type hints on all functions
- **WebSocket:** FastAPI WebSocket endpoints
- **Validation:** Pydantic v2 models for all request/response schemas
- **Async:** All I/O operations must be async

### AI
- **Voice:** OpenAI Realtime API (WebSocket-based voice-to-voice)
- **Text Processing:** GPT-4.1 via OpenAI Chat Completions API
- **Intent & Scoring:** GPT-4.1 with structured outputs (JSON mode)

### Storage
- **Primary:** In-memory mock data (Python dictionaries/lists)
- **Optional:** Supabase for persistence if time permits
- **Rule:** All data access goes through a repository layer so storage can be swapped without touching business logic

---

## Architecture Principles

1. **Vertical slices over horizontal layers.** Each feature owns its full stack: UI component, API route, service logic, AI prompts.
2. **Real-time first.** Every data flow that touches the UI during a call must use WebSockets. No polling.
3. **Mock everything external.** No real phone numbers, no real customer data, no real payment systems. Mock data is first-class.
4. **AI is a service, not inline code.** All AI calls go through dedicated service modules. No raw OpenAI SDK calls in route handlers or components.
5. **Fail visually, not silently.** Every error must surface in the UI. No swallowed exceptions. Toast notifications for transient errors, inline messages for persistent ones.
6. **Demo-quality UI is non-negotiable.** If it looks ugly, it's a bug. Polish is a feature.
7. **No premature abstraction.** Do not create abstractions for things that exist only once. If a pattern appears three times, then abstract.

---

## API Standards

### Endpoints
- All endpoints prefixed with `/api/v1/`
- Use plural nouns: `/api/v1/calls`, `/api/v1/summaries`
- WebSocket endpoints: `/ws/v1/call/{call_id}`
- Health check: `GET /api/v1/health`

### Request/Response
- All request bodies validated with Pydantic models
- All responses wrapped in a standard envelope:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2025-01-01T00:00:00Z"
}
```
- Error responses use the same envelope with `success: false` and `error` populated
- HTTP status codes: 200 (success), 201 (created), 400 (bad request), 422 (validation), 500 (server error)

### Naming
- Snake_case for all Python (endpoints, fields, variables)
- camelCase for all TypeScript/JSON response fields (FastAPI response model aliases handle conversion)

---

## Data Flow Standards

```
Browser Mic → WebSocket → FastAPI → OpenAI Realtime API
                                   ↓
                            Transcript Stream → WebSocket → Frontend (Live Transcript)
                                   ↓
                            Intent Detection → WebSocket → Frontend (Intent Badge)
                                   ↓
                            Opportunity Score → WebSocket → Frontend (Score Display)
                                   ↓
                            Call End → Handoff Summary → REST API → Frontend (Summary Card)
```

### Rules
- Transcription events flow over WebSocket as they arrive (no batching)
- Intent detection runs after every 3-5 utterances (not every word)
- Opportunity scoring runs when intent is detected or updated
- Handoff summary is generated once on call end via REST (not WebSocket)

---

## AI Usage Standards

### Model Selection
| Task | Model | Mode |
|------|-------|------|
| Voice conversation | OpenAI Realtime API | Streaming WebSocket |
| Intent classification | GPT-4.1 | Structured output (JSON) |
| Opportunity scoring | GPT-4.1 | Structured output (JSON) |
| Handoff summary | GPT-4.1 | Standard completion |

### Output Format
- Intent detection and opportunity scoring MUST use OpenAI structured outputs (response_format with JSON schema)
- Never parse free-text AI responses with regex. Use structured outputs or function calling.

### Token Budget
- Intent detection: max 500 tokens input, 200 tokens output
- Opportunity scoring: max 800 tokens input, 300 tokens output
- Handoff summary: max 2000 tokens input, 800 tokens output

---

## Prompting Standards

1. **All prompts live in dedicated files** — never inline in business logic. Location: `backend/app/prompts/`
2. **System prompts are constants** — loaded at startup, not generated dynamically
3. **Every prompt has a version comment** at the top: `# v1.0 - Initial intake prompt`
4. **Prompts use explicit role framing:**
   - System: defines who the AI is and constraints
   - User: provides the dynamic context (transcript, account info)
5. **No prompt chaining** — each AI call is self-contained with full context
6. **Temperature settings:**
   - Intent detection: 0.0 (deterministic)
   - Opportunity scoring: 0.0 (deterministic)
   - Handoff summary: 0.3 (slight creativity for readability)
   - Voice conversation: 0.7 (natural conversational tone)

---

## State Management Rules

### Frontend
- **Global state (React Context):** Call status, current transcript, detected intent, opportunity score
- **Local state (useState):** UI toggles, form inputs, animation states
- **No Redux, no Zustand, no Jotai.** Context + useReducer is sufficient for this scope.
- **State shape is defined in a single `types.ts` file** shared across the app

### Backend
- **In-memory state:** Active calls stored in a Python dictionary keyed by `call_id`
- **No ORM.** Direct dictionary access via repository functions.
- **State transitions are explicit:** `idle → active → processing → complete`

---

## Realtime Communication Rules

1. **One WebSocket connection per call session.** Do not multiplex unrelated data.
2. **All WebSocket messages have a `type` field:**
```json
{
  "type": "transcript_delta" | "intent_update" | "score_update" | "call_status" | "error",
  "data": {},
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```
3. **Client reconnection:** If WebSocket drops, client retries 3 times with exponential backoff (1s, 2s, 4s), then shows error.
4. **Heartbeat:** Server sends `ping` every 30 seconds. Client responds with `pong`. No response in 10s = connection dead.
5. **Message ordering:** All messages include a monotonically increasing `sequence` number. Client discards out-of-order messages.

---

## Error Handling Standards

### Frontend
- All async operations wrapped in try/catch
- Errors display via shadcn/ui Toast component (transient) or Alert component (persistent)
- Loading states shown for all async operations (skeleton loaders, not spinners)
- WebSocket disconnection shows a banner, not a modal

### Backend
- All exceptions caught by FastAPI exception handlers (no unhandled 500s)
- Custom exception classes: `CallNotFoundError`, `AIServiceError`, `WebSocketError`
- All errors logged with structured logging (JSON format)
- AI API failures return graceful degradation response (not a raw error)

### AI Failures
- If OpenAI Realtime API disconnects mid-call: surface to UI, allow retry
- If intent detection fails: show "Unknown" intent, do not block the flow
- If scoring fails: show "N/A" score, do not block the flow
- If summary generation fails: show partial data with "Summary generation failed" message

---

## Security Assumptions

This is a hackathon demo. Security is minimal but not absent:

- API keys stored in `.env` files, never committed
- `.env` is in `.gitignore`
- No authentication required for the dashboard (single-user demo)
- No PII in mock data (all fictional names, numbers, accounts)
- CORS configured to allow localhost origins only
- WebSocket connections are unauthenticated (acceptable for demo)
- No rate limiting required

---

## Hackathon Development Constraints

1. **Time budget:** 5 days total. No feature takes more than 1 day to implement.
2. **No yak-shaving.** If something takes more than 30 minutes to configure, find a simpler approach.
3. **Demo path is sacred.** The happy path must work flawlessly. Edge cases are acceptable failures.
4. **One branch per feature.** Merge to main when the feature demos correctly.
5. **No CI/CD pipeline.** Manual testing, manual deployment.
6. **Environment:** Local development only. No cloud deployment required for judging.
7. **Dependency rule:** Before adding any package, check if the existing stack already handles it. shadcn/ui covers UI. FastAPI covers API. OpenAI SDK covers AI. Do not add alternatives.
8. **AI agent coordination:** Multiple AI tools (Kiro, Codex, etc.) will generate code. This document and the structure document are the authority. If generated code violates these standards, fix the code, not the standards.
