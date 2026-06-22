# Code Review Checklist

## How to Use

Every PR must pass all applicable sections. Reviewer checks each item. If any Critical item fails, the PR is blocked until fixed. Warning items should be fixed but don't block merge if demo timeline is tight.

---

## Architecture

### Critical

- [ ] **Layer boundaries respected** — No business logic in route handlers or components
- [ ] **Dependency direction correct** — Dependencies flow inward (UI → Hooks → Services → Repos)
- [ ] **AI calls in services only** — No raw OpenAI SDK calls in handlers, components, or hooks
- [ ] **Single responsibility** — Each module/function does one thing
- [ ] **Feature isolation** — No cross-feature imports between component folders

### Warning

- [ ] **File in correct location** — Matches structure steering doc
- [ ] **No premature abstraction** — No factory patterns, no base classes for single implementations
- [ ] **Module size reasonable** — No file >300 lines without good reason

### Questions to Ask

```
- Could this service be swapped without touching route handlers?
- If I delete this module, how many other modules break?
- Does this component know about data fetching details it shouldn't?
```

---

## Security

### Critical

- [ ] **No hardcoded secrets** — No API keys, tokens, or credentials in code
- [ ] **Env vars used for configuration** — All secrets from `.env`
- [ ] **No PII in mock data** — Fictional names, numbers, accounts only
- [ ] **No user input passed to shell** — No `os.system()`, no `subprocess` with user strings
- [ ] **CORS properly scoped** — Only localhost origins allowed

### Warning

- [ ] **Input validated** — Pydantic models for all API inputs
- [ ] **Error messages don't leak internals** — No stack traces in API responses
- [ ] **WebSocket messages validated** — Type field checked before processing

### Questions to Ask

```
- If this went to production accidentally, what's the worst case?
- Does any error message reveal system internals?
- Could a malformed WebSocket message crash the server?
```

---

## Maintainability

### Critical

- [ ] **Typed completely** — No `any` in TS, all Python functions have type hints
- [ ] **Named clearly** — Variables/functions describe what they are/do
- [ ] **No dead code** — No commented-out blocks, no unused imports
- [ ] **TODOs are formatted** — `// TODO(owner): description — [sprint-N]`
- [ ] **Consistent with existing patterns** — Matches how similar code is already written

### Warning

- [ ] **Comments explain WHY not WHAT** — Code is self-documenting for what, comments for why
- [ ] **No magic numbers** — Named constants for all non-obvious values
- [ ] **Imports organized** — Following the import ordering standard
- [ ] **Error messages are actionable** — Tell the user/developer what to do, not just what failed

### Questions to Ask

```
- Could a new developer understand this in 2 minutes?
- If this breaks at 2 AM, can someone debug it from the error message alone?
- Is there a simpler way to achieve the same result?
```

---

## Performance

### Critical

- [ ] **No blocking I/O in async paths** — All I/O operations use `await`
- [ ] **No unbounded growth** — Collections have size limits or are pruned
- [ ] **WebSocket messages are small** — No full transcript in every delta message
- [ ] **No N+1 patterns** — Not making separate API calls in a loop

### Warning

- [ ] **Appropriate data structures** — Dict for lookups, list for ordered data
- [ ] **No unnecessary re-renders** — React state updates are minimal and targeted
- [ ] **Token budgets respected** — AI calls use windowed context, not full history
- [ ] **Timeouts on all external calls** — OpenAI calls have explicit timeout

### Questions to Ask

```
- What happens if this runs 1000 times? Does it scale linearly?
- Could this WebSocket message grow unbounded?
- Is this AI call using the minimum context it needs?
```

---

## Readability

### Critical

- [ ] **Function length ≤30 lines** — Split if longer
- [ ] **Nesting depth ≤3 levels** — Extract early returns or helpers
- [ ] **Parameters ≤4** — Use options object for more
- [ ] **No nested ternaries** — Use if/else or switch

### Warning

- [ ] **Consistent formatting** — Matches linter/prettier output
- [ ] **Logical grouping** — Related code is adjacent
- [ ] **Blank lines separate concepts** — Not one massive wall of code
- [ ] **File structure follows standard** — Imports → types → logic → exports

### Questions to Ask

```
- Can I understand this function without scrolling?
- Are the variable names precise enough to remove the need for comments?
- Is the control flow obvious on first read?
```

---

## Testing

### Critical (when tests exist)

- [ ] **Tests actually test behavior** — Not just checking code runs without errors
- [ ] **No testing implementation details** — Tests survive refactoring
- [ ] **Mock boundaries are correct** — Mocking external APIs, not internal logic
- [ ] **Happy path covered** — The demo scenario passes

### Warning

- [ ] **Edge cases noted** — If not tested, at least documented with TODO
- [ ] **Test names describe behavior** — `test_detect_intent_returns_payment_for_balance_question`
- [ ] **No flaky patterns** — No sleep-based waits, no order-dependent tests

### Questions to Ask

```
- If someone breaks this code, will a test catch it?
- Does this test tell me WHY it failed, or just THAT it failed?
- Is this testing the contract or the implementation?
```

---

## AI-Related Concerns

### Critical

- [ ] **Prompts in dedicated files** — Not inline in services or handlers
- [ ] **Structured outputs used** — Intent and scoring use JSON schema, not free-text parsing
- [ ] **AI failures degrade gracefully** — Returns "unknown"/"N/A", doesn't crash
- [ ] **Token budgets enforced** — `max_tokens` set on every completion call
- [ ] **Temperature appropriate** — 0.0 for classification, 0.3 for summaries, 0.7 for conversation

### Warning

- [ ] **Prompt is versioned** — Comment at top: `# v1.0 - description`
- [ ] **Transcript windowed** — Not sending full history for every analysis
- [ ] **AI response validated** — Parsed into Pydantic model, not trusted raw
- [ ] **Timeout configured** — 30s for completions, 60s for realtime
- [ ] **No prompt injection vectors** — User transcript is clearly delineated from instructions

### Questions to Ask

```
- What happens if OpenAI returns garbage? Does the system crash or degrade?
- Is this prompt as concise as it can be while maintaining quality?
- Could a caller's words be interpreted as instructions to the AI?
- Is the AI being asked to do more than one thing in this call?
```

---

## WebSocket-Specific Concerns

### Critical

- [ ] **Messages have `type` field** — Discriminated by type for routing
- [ ] **Connection cleanup on error** — No zombie connections
- [ ] **Server-side state cleared on disconnect** — No memory leaks

### Warning

- [ ] **Sequence numbers included** — For message ordering
- [ ] **Heartbeat implemented** — Ping/pong for connection health
- [ ] **Reconnection bounded** — Max 3 retries with backoff
- [ ] **Error messages sent before close** — Client knows why connection dropped

---

## Quick Decision: Merge or Block?

```
Any Critical item failed?
├── YES → BLOCK. Must fix before merge.
└── NO → All Warning items passed?
    ├── YES → APPROVE.
    └── NO → Is this blocking the demo?
        ├── YES → APPROVE with TODOs filed for warnings.
        └── NO → REQUEST CHANGES. Fix warnings first.
```

---

## Review Response Template

```markdown
## Review: [PR Title]

### Verdict: APPROVE / REQUEST CHANGES / BLOCK

### Critical Issues (must fix):
- [ ] Issue 1: description + proposed fix

### Warnings (should fix):
- [ ] Warning 1: description

### Positive Notes:
- Good: [what was done well]

### Questions:
- Q: [anything unclear about intent or approach]
```
