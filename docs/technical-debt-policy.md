# Technical Debt Policy

## Context

This is a 5-day hackathon project. Technical debt is not inherently bad — it's a tool. The goal is to **manage debt consciously**, not eliminate it.

Debt is acceptable when:
- It accelerates the demo timeline
- It's behind a clean interface (can be swapped later)
- It's documented

Debt is unacceptable when:
- It makes the demo unstable
- It spreads to unrelated modules
- It's invisible (no one knows it exists)

---

## Debt Classification

### Severity Levels

| Level | Name | Description | Action |
|-------|------|-------------|--------|
| P0 | **Critical** | Will crash the demo or corrupt data | Fix immediately, block all other work |
| P1 | **High** | Causes visible bugs in demo, security risk | Fix within current sprint |
| P2 | **Medium** | Code smell, maintenance burden, minor UX issue | Fix if time permits, otherwise document |
| P3 | **Low** | Style inconsistency, missing optimization, nice-to-have | Track with TODO, fix post-hackathon |

### Debt Categories

| Category | Example | Typical Severity |
|----------|---------|-----------------|
| **Structural** | Business logic in route handler | P1 |
| **Type safety** | `any` type in TypeScript | P1 |
| **Error handling** | Swallowed exception | P1 |
| **Performance** | Full transcript sent for every intent check | P2 |
| **Duplication** | Same validation logic in two places | P2 |
| **Missing test** | Critical path untested | P2 |
| **Naming** | Unclear variable name | P3 |
| **Documentation** | Missing JSDoc on exported function | P3 |
| **Optimization** | Could use memo but doesn't need to yet | P3 |

---

## Risk Scoring

### Risk Matrix

```
Impact on Demo
        High    Medium    Low
High  │  P0   │   P1   │  P2  │  ← Likelihood
Med   │  P1   │   P2   │  P3  │     of Breaking
Low   │  P2   │   P3   │  P3  │
```

### Scoring Questions

For each piece of debt, ask:

1. **If this breaks, does the demo fail?** → High impact
2. **Is this in the critical path (voice → transcript → intent → summary)?** → High likelihood
3. **Does this affect only edge cases?** → Low likelihood
4. **Is this isolated behind an interface?** → Low impact (contained)
5. **Does this spread (other code depends on the bad pattern)?** → Increase severity by 1 level

---

## Refactor Thresholds

### When Refactoring is Required (Non-Negotiable)

| Condition | Trigger |
|-----------|---------|
| Type violation | `any` type or untyped function in new code |
| Layer violation | Business logic in route handler or component |
| Security violation | Hardcoded secret, unsanitized input |
| Broken abstraction | Service returning raw dicts instead of models |
| Memory leak | WebSocket session not cleaned up on disconnect |

### When Refactoring is Encouraged (If Time Permits)

| Condition | Trigger |
|-----------|---------|
| Duplication | Same pattern appears 3rd time |
| Complexity | Function exceeds 30 lines |
| Coupling | Module imports from 5+ other modules |
| Naming | Variable name requires a comment to understand |

### When Refactoring is Deferred (Acceptable for Hackathon)

| Condition | Acceptable If |
|-----------|--------------|
| Hardcoded mock data | Behind repository interface |
| Missing error handling for edge cases | Happy path works, logged with TODO |
| Suboptimal algorithm | Performance is fine at demo scale |
| Incomplete validation | Only demo inputs are expected |
| Missing accessibility features | Not judged in hackathon |

---

## Temporary Hack Guidelines

### When Hacks Are Allowed

A temporary hack is acceptable when ALL conditions are true:

1. ✅ It unblocks the demo
2. ✅ It's documented with a TODO
3. ✅ It's contained (doesn't leak into other modules)
4. ✅ It has a clear fix path (you know how to do it properly)
5. ✅ It won't crash the demo under normal conditions

### Hack Documentation Format

```python
# HACK(owner): Brief description of what this does wrong
# WHY: Explanation of why it's acceptable right now
# FIX: What the proper solution would be
# REMOVE BY: [sprint-N] or [post-hackathon]
hardcoded_response = IntentResult(intent="payment_inquiry", confidence=0.8, signals=[])
```

```typescript
// HACK(owner): Using setTimeout instead of proper WebSocket heartbeat
// WHY: Heartbeat protocol not implemented yet, need to detect dead connections
// FIX: Implement ping/pong protocol per realtime-communication spec
// REMOVE BY: sprint-3
setTimeout(() => checkConnection(), 30_000);
```

### Hack Registry

Maintain a quick-reference list in the spec tasks:

```markdown
## Active Hacks
| Location | Description | Severity | Remove By |
|----------|-------------|----------|-----------|
| `voice_intake.py:45` | Hardcoded system prompt version | P3 | post-hackathon |
| `call-reducer.ts:23` | No sequence validation on WS messages | P2 | sprint-4 |
```

---

## Hackathon-Specific Debt Management

### Acceptable Debt for Demo

| Debt Item | Why It's OK | Containment Strategy |
|-----------|-------------|---------------------|
| In-memory storage (no persistence) | Demo doesn't need persistence | Behind repository interface |
| No authentication | Single-user demo | CORS restricts to localhost |
| No rate limiting | Local environment only | Documented in security assumptions |
| Hardcoded scenario data | Demo uses fixed scenarios | In `mock/` folder, clearly labeled |
| No retry logic on AI calls | Demo assumes stable connection | Graceful degradation (show "N/A") |
| No input sanitization | Mock data only, no real users | Pydantic validates shape |
| Minimal error UI | Demo follows happy path | Errors logged to console |

### Unacceptable Debt Even for Hackathon

| Debt Item | Why It's Never OK |
|-----------|-------------------|
| Untyped function signatures | Makes AI agents produce worse code |
| Business logic in wrong layer | Spreads to every new feature |
| Swallowed exceptions | Demo fails silently, can't debug |
| AI calls outside services | Violates every refactoring path |
| Inline prompts | Impossible to maintain or version |
| Uncommitted changes | Risk of losing work |

---

## Debt Tracking

### In Code

```python
# TODO(gio): Add retry logic for OpenAI timeouts — [sprint-4]
# TODO(gio): Replace hardcoded prompt with template system — [post-hackathon]
```

### In Spec Tasks

Each sprint's task list includes a "Tech Debt" section:

```markdown
## Tech Debt (Sprint 2)
- [ ] P2: Add sequence number validation to WS message handler
- [ ] P3: Extract OpenAI client into shared module
- [-] P3: Add JSDoc to all exported hooks — deferred to post-hackathon
```

### Debt Budget

- **Per sprint:** No more than 3 new P2+ debt items introduced
- **Per sprint:** At least 1 existing P2 debt item resolved
- **Total:** No more than 10 unresolved P2+ items at any time
- **Violation:** If budget exceeded, next sprint starts with debt reduction (no new features)

---

## Decision Tree: Debt vs. Fix

```
Is this in the demo critical path?
├── YES → Does it work correctly for the demo scenario?
│   ├── YES → Is it a layer/type violation?
│   │   ├── YES → Fix now (takes <30 min) or document for next sprint
│   │   └── NO → Document as P3, defer
│   └── NO → Fix now (P0/P1)
└── NO → Is it a layer/type violation?
    ├── YES → Fix now if <15 min, else document as P2
    └── NO → Document as P3, defer to post-hackathon
```

---

## Checklist: Debt Review

```
□ All new TODOs follow format: TODO(owner): description — [sprint-N]
□ No P0 debt exists in codebase
□ All P1 debt has a fix planned for current sprint
□ Hack comments include WHY and FIX sections
□ Debt budget not exceeded (≤3 new P2+ per sprint)
□ At least 1 P2 debt resolved per sprint
□ No hacks leaked outside their containment boundary
□ Spec tasks include Tech Debt section with current inventory
```
