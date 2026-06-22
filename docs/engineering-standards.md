# Engineering Standards

## Clean Architecture Rules

### Dependency Direction

Dependencies flow inward only:

```
UI Components → Hooks → Services → Repositories → Data
```

Never:
- A service imports from a component
- A repository imports from a route handler
- A model imports from a service

### Layer Responsibilities

| Layer | Owns | Never Does |
|-------|------|-----------|
| UI Components | Rendering, user interaction | Business logic, API calls, data transformation |
| Hooks/Context | State orchestration, side effects | Direct DOM manipulation, raw fetch calls |
| Services | Business logic, AI orchestration | HTTP response formatting, UI state |
| Repositories | Data access, storage abstraction | Business decisions, validation |
| Models | Data shape, validation | Logic, side effects |

### Boundary Enforcement

```python
# GOOD — service receives typed data, returns typed result
async def detect_intent(transcript: str, context: AccountContext) -> IntentResult:
    ...

# BAD — service receives raw request object
async def detect_intent(request: Request) -> dict:
    ...
```

```typescript
// GOOD — hook encapsulates logic, component renders
export function useCall() {
  const { state, dispatch } = useCallContext();
  const startCall = async () => { /* orchestration */ };
  return { state, startCall };
}

// BAD — component contains business logic
export function CallPanel() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  // 50 lines of WebSocket management...
}
```

---

## SOLID Principles (Adapted for This Stack)

### Single Responsibility

- One service per AI task (intent detection, scoring, summary generation)
- One hook per concern (useAudio, useWebSocket, useCall)
- One component per visual unit
- One prompt file per AI behavior

**Decision Tree:**
```
Does this module do more than one thing?
├── YES → Split it
└── NO → Is it >200 lines?
    ├── YES → Consider splitting by sub-concern
    └── NO → Leave it alone
```

### Open/Closed

- Services are open for extension (new intent types) but closed for modification (existing intent logic doesn't change when adding new types)
- Use Pydantic discriminated unions for extensible message types
- Use TypeScript union types for extensible state

### Liskov Substitution

- Repository layer must be swappable (in-memory → Supabase) without touching services
- AI service must be mockable without touching route handlers

### Interface Segregation

- Hooks expose only what components need (not the entire context state)
- Services accept only the parameters they use (not entire call objects)

### Dependency Inversion

- Services depend on abstractions (repository interface), not concrete storage
- Components depend on hook interfaces, not implementation details

---

## DRY Rules

### When to Deduplicate

Deduplicate when:
- The same logic appears **3+ times** (Rule of Three)
- The duplicated code **changes for the same reason**
- The duplication is **identical in intent**, not just appearance

Do NOT deduplicate when:
- Two pieces of code look similar but serve different domains
- Deduplication would create a function with >3 parameters
- The "shared" code is <5 lines and self-explanatory

### Anti-Patterns

```python
# BAD — premature abstraction for two similar but distinct operations
def process_ai_response(response, mode):
    if mode == "intent":
        # 20 lines of intent-specific logic
    elif mode == "scoring":
        # 20 lines of scoring-specific logic

# GOOD — separate functions, clear responsibility
async def process_intent_response(response: ChatCompletion) -> IntentResult:
    ...

async def process_scoring_response(response: ChatCompletion) -> ScoreResult:
    ...
```

---

## KISS Rules

### Simplicity Checklist

Before merging any code, verify:

- [ ] Could a new team member understand this in under 2 minutes?
- [ ] Is there a simpler stdlib/built-in way to do this?
- [ ] Does this abstraction earn its complexity?
- [ ] Are there fewer than 3 levels of nesting?

### Complexity Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Function length | >30 lines | Split into sub-functions |
| Nesting depth | >3 levels | Extract early returns or helper |
| Parameters | >4 | Use a config/options object |
| Cyclomatic complexity | >10 | Refactor |

---

## YAGNI Rules

### What NOT to Build

- Authentication (single-user demo)
- Rate limiting (local only)
- Database migrations (in-memory storage)
- i18n/l10n (English only)
- Abstract factory patterns (nothing is used more than once yet)
- Plugin systems (fixed feature set)

### Decision Tree

```
Is this feature in the current spec?
├── NO → Don't build it
└── YES → Is there a simpler way that works for the demo?
    ├── YES → Use the simpler way
    └── NO → Build the full solution
```

---

## Feature-Based Architecture

### Frontend Feature Boundaries

Each feature folder (`components/call/`, `components/transcript/`, etc.) is:
- Self-contained for presentation
- Driven by a corresponding hook or context slice
- Never imports from another feature's internals

### Backend Feature Boundaries

Each service module is:
- Self-contained for its AI/business logic
- Driven by typed inputs from the API layer
- Never directly accessed by another service's route handler

### Cross-Cutting Concerns

Shared utilities live in:
- Frontend: `src/lib/` (api client, formatters, websocket utils)
- Backend: `app/config.py`, shared Pydantic base models

---

## Separation of Concerns

| Concern | Frontend Owner | Backend Owner |
|---------|---------------|---------------|
| UI rendering | Components | — |
| State management | Context + Reducer | — |
| API communication | `lib/api.ts` | Route handlers |
| WebSocket transport | `hooks/use-realtime-connection.ts` | `api/ws/call_session.py` |
| Business logic | Hooks | Services |
| AI orchestration | — | Services |
| Data access | — | Repositories |
| Validation | TypeScript types | Pydantic models |

---

## Code Review Standards

### Required for Merge

- [ ] No `any` types in TypeScript
- [ ] All Python functions have type hints
- [ ] No business logic in route handlers or components
- [ ] No raw OpenAI calls outside service modules
- [ ] No hardcoded API keys or secrets
- [ ] Error states handled (not swallowed)
- [ ] Matches existing naming conventions

### Review Response Time

- PRs reviewed within 4 hours during active sprint
- Blocking feedback must include a proposed fix, not just "this is wrong"

---

## Refactoring Rules

### When to Refactor

- Before adding a feature to a module that violates these standards
- When a module exceeds complexity thresholds
- When a pattern appears for the third time (extract shared utility)
- Never during a demo-critical path unless the code is broken

### When NOT to Refactor

- Code that works and won't be touched again this sprint
- Code within 24 hours of a demo
- "Ugly but correct" code that's behind a clean interface

---

## Technical Debt Rules

### Acceptable Debt

- Hardcoded mock data (behind repository interface)
- Missing edge-case error handling (happy path works)
- Inline styles for one-off UI tweaks
- `// TODO` comments with ticket/issue reference

### Unacceptable Debt

- Business logic in route handlers or components
- Untyped function signatures
- Swallowed errors (empty catch blocks)
- AI calls outside service modules
- Duplicated prompt text across files

### Tracking

Every `// TODO` or `# TODO` must follow format:
```
// TODO(owner): description — [sprint-N]
```

---

## Checklist: Before Every PR

```
□ Code compiles/runs without errors
□ Happy path manually tested
□ No new lint warnings
□ No hardcoded secrets
□ Types are strict (no any, no untyped dicts)
□ Follows layer boundaries
□ Error states surface to UI
□ Naming matches conventions
```
