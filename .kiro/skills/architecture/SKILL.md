# Architecture Skills — RecoverAi

## Purpose

Enforce consistent architectural decisions across all developers and AI agents. Prevent drift from the established patterns in the steering documents.

---

## Separation of Concerns

### Rules

1. **UI components** render UI. They do NOT fetch data, call APIs, or contain business logic.
2. **Hooks** orchestrate behavior. They call services, manage state, and provide data to components.
3. **Services** (backend) contain business logic. They do NOT import from API routes.
4. **API routes** are thin wrappers. They validate input, call a service, and return a response.
5. **Prompts** are pure text. They do NOT contain logic, imports, or function definitions.

### Example (Correct)

```tsx
// Component: renders only
export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  return <div>{messages.map(m => <TranscriptMessage key={m.id} message={m} />)}</div>;
}

// Hook: orchestrates
export function useCall() {
  const { state, dispatch } = useCallContext();
  const startCall = async () => { /* calls API, connects WS */ };
  return { state, startCall, endCall };
}
```

### Anti-Pattern

```tsx
// BAD: Component fetching data directly
export function TranscriptPanel() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    fetch('/api/v1/calls/123').then(r => r.json()).then(d => setMessages(d.transcript));
  }, []);
}
```

---

## Service Layer Rules

### Rules

1. Each service is a single Python module with async functions
2. Services receive typed parameters, never raw request objects
3. Services return Pydantic models, never raw dictionaries
4. Services handle their own errors and raise domain-specific exceptions
5. Services never import from `app.api` — dependency flows downward only
6. One service per domain: `voice_intake`, `transcription`, `intent_detection`, etc.

### Example (Correct)

```python
# services/voice_intake.py
async def create_realtime_session(system_prompt: str) -> RealtimeSession:
    """Connect to OpenAI Realtime API and configure session."""
    ws = await websockets.connect(OPENAI_REALTIME_URL, extra_headers={"Authorization": f"Bearer {settings.openai_api_key}"})
    await ws.send(json.dumps({"type": "session.update", "session": {...}}))
    return RealtimeSession(ws=ws, session_id=...)
```

### Anti-Pattern

```python
# BAD: Service importing from routes
from app.api.v1.calls import get_current_request  # NEVER

# BAD: Returning raw dict
async def create_session():
    return {"ws": ws, "id": "abc"}  # Use a Pydantic model
```

---

## API Layer Rules

### Rules

1. Route handlers validate input (Pydantic does this automatically)
2. Route handlers call exactly one service function
3. Route handlers map service exceptions to HTTP status codes
4. Route handlers return the standard API envelope
5. No business logic in route handlers — zero conditional logic beyond error mapping

### Example (Correct)

```python
@router.post("/calls", status_code=201)
async def create_call(body: CallCreate) -> ApiResponse[CallCreatedResponse]:
    call = await call_service.create_call(scenario=body.scenario)
    return ApiResponse(success=True, data=CallCreatedResponse.from_session(call))
```

### Anti-Pattern

```python
# BAD: Logic in route handler
@router.post("/calls")
async def create_call(body: CallCreate):
    if body.scenario:
        account = ACCOUNTS[body.scenario]  # Business logic leaked
        prompt = INTAKE_PROMPT + f"\nContext: {account}"  # Prompt construction leaked
    call_id = str(uuid4())
    active_calls[call_id] = {...}  # Direct store access
```

---

## Component Design Rules

### Rules

1. One component per file
2. Named exports only (`export function X`, not `export default`)
3. Props interface defined in the same file, above the component
4. Shared types live in `types/index.ts`, not in component files
5. Components under 150 lines. If longer, extract sub-components.
6. No `useEffect` for data fetching in components — use hooks

### Enforcement

If a component exceeds 150 lines, split it. If it has more than 5 props, consider whether it's doing too much.

---

## State Management Rules

### Rules

1. Global state: React Context + useReducer (call state, transcript)
2. Local state: useState (UI toggles, form inputs, animations)
3. No Redux, Zustand, Jotai, or other state libraries
4. State shape defined in `types/index.ts`
5. All state mutations go through the reducer — no direct mutation
6. Derived data computed inline or with useMemo, never stored as separate state

### Anti-Pattern

```tsx
// BAD: Storing derived state
const [messageCount, setMessageCount] = useState(0);
useEffect(() => setMessageCount(messages.length), [messages]);

// GOOD: Derive it
const messageCount = messages.length;
```

---

## Reusable Code Rules

### Rules

1. Do NOT abstract until a pattern appears 3 times
2. Utility functions go in `lib/utils.ts` (frontend) or `app/utils.py` (backend)
3. Shared constants go in `lib/constants.ts` or `app/config.py`
4. Never create a "common" or "shared" folder with mixed concerns
5. If two components share logic, extract a hook. If two services share logic, extract a utility function.

---

## Dependency Rules

### Rules

1. Before adding a package, check if the existing stack handles it
2. shadcn/ui covers all UI components — do not add Material UI, Chakra, Ant Design, etc.
3. FastAPI covers all API needs — do not add Flask, Django, or Express
4. OpenAI SDK covers all AI needs — do not add LangChain, LlamaIndex, etc.
5. Pin exact versions in `requirements.txt` and `package.json`
6. No devDependencies in production code paths

---

## File Size Limits

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| React component | 150 | Extract sub-components |
| Custom hook | 100 | Split into focused hooks |
| Service module | 200 | Extract helper functions |
| Route handler file | 100 | One route per function, split files |
| Prompt file | 50 | Keep prompts concise |
| Type definition file | 200 | This is the one exception — types can be dense |

---

## Function Complexity Limits

### Rules

1. Max 3 levels of nesting (if/for/try)
2. Max 20 lines per function (excluding type annotations)
3. Max 4 parameters per function (use an object/model for more)
4. Every function has a single responsibility
5. If a function has "and" in its description, split it

### Example

```python
# BAD: Does too much
async def handle_call(call_id, audio, transcript, intent):
    # 50 lines of mixed logic

# GOOD: Single responsibility
async def forward_audio_to_openai(call_id: str, audio_chunk: bytes) -> None:
    ...
async def process_transcript_event(call_id: str, event: TranscriptEvent) -> TranscriptEntry:
    ...
```

---

## Avoiding Technical Debt

### Rules

1. No TODO comments without a linked task ID
2. No commented-out code — delete it (git has history)
3. No `any` types in TypeScript — ever
4. No bare `except:` in Python — always catch specific exceptions
5. No hardcoded strings that should be constants
6. No copy-paste code — if you paste it, refactor it
7. Fix warnings immediately — do not accumulate

### Enforcement

Every PR should have zero new linter warnings. If you introduce a `# type: ignore` or `// @ts-ignore`, add a comment explaining why.
