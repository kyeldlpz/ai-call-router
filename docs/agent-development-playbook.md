# Agent Development Playbook

## Purpose

This document governs how AI coding agents (Kiro, Codex, Copilot, etc.) operate within this repository. It defines behavioral rules, quality gates, and human oversight requirements.

AI agents are **tools, not team members.** They produce code. Humans own the code.

---

## Agent Behavioral Rules

### Kiro

**Role:** Primary development agent. Has full context via steering docs.

**Behavior Rules:**

1. **Always read before writing** — Read existing files in the feature area before generating new code
2. **Match existing patterns** — Look at how similar code is already written. Don't invent new patterns.
3. **Respect layer boundaries** — Never put business logic in handlers/components regardless of how "simple" it seems
4. **Use the types** — Import from `types/index.ts` (frontend) or models (backend). Never create ad-hoc types inline.
5. **Follow the spec** — If a task is defined in a spec, implement exactly what the task describes. Don't add extras.
6. **Prompt files are sacred** — Never inline AI prompts. Always create/update files in `backend/app/prompts/`
7. **Ask when ambiguous** — If the task is unclear, ask. Don't guess and implement two possible interpretations.
8. **Complete implementations only** — Never leave a function as a stub with `// TODO: implement`. Either implement it fully or don't create it.

**Forbidden Actions:**

- Adding new dependencies without checking if existing stack handles it
- Creating new patterns when an existing pattern exists
- Generating test files unless explicitly requested
- Modifying steering docs without explicit instruction
- Using `any` type or untyped functions under any circumstances
- Creating "helper" or "util" abstractions for one-time-use code

### Codex

**Role:** Secondary development agent. Used for specific, well-scoped tasks.

**Behavior Rules:**

1. **Scope strictly to the prompt** — Do only what's asked. No cleanup, no refactoring, no "improvements"
2. **Produce mergeable code** — Output must compile, follow types, match patterns
3. **No architectural decisions** — If the task requires an architectural choice, stop and note the decision needed
4. **Respect existing imports** — Use the same libraries already in the project
5. **Match naming conventions** — Check the naming conventions doc before generating names
6. **Include error handling** — Every async operation has try/catch. Every AI call has graceful degradation.

**Forbidden Actions:**

- Changing project structure
- Adding dependencies
- Modifying configuration files
- Creating new folders
- Altering existing function signatures without explicit instruction

---

## Code Generation Rules

### When AI May Generate Code

| Scenario | Allowed | Conditions |
|----------|---------|-----------|
| New feature implementation (from spec task) | ✅ | Spec task exists, types defined |
| Bug fix (specific error, clear reproduction) | ✅ | Error message or failing test provided |
| Refactoring (explicit instruction) | ✅ | Scope defined, before/after clear |
| Boilerplate (Pydantic models, route stubs) | ✅ | Schema defined in spec |
| Prompt writing (AI system prompts) | ✅ | Task specifies the AI behavior |
| Tests (explicitly requested) | ✅ | Target code exists first |
| "Make it better" (vague improvement) | ❌ | Too ambiguous, ask for specifics |
| Speculative features (might need later) | ❌ | YAGNI violation |
| Alternative implementations (for comparison) | ❌ | Pick one approach, implement it |

### AI Code Quality Gate

Before committing AI-generated code, verify:

```
□ Compiles without errors
□ No any types
□ All functions have type hints (Python) / return types (TypeScript)
□ Follows naming conventions
□ Correct layer (services for logic, components for UI, etc.)
□ Error states handled
□ Matches existing patterns in the same folder
□ No new dependencies introduced
□ No hardcoded values that should be config
□ Prompt text in prompt files (not inline)
```

---

## Human Review Requirements

### Always Requires Human Review

| Change Type | Why |
|-------------|-----|
| New AI prompt | Prompt quality affects demo quality directly |
| Architecture decisions (new folder, new pattern) | Must match steering docs |
| WebSocket message format changes | Cross-cuts frontend and backend |
| State machine transitions | Core correctness |
| Error handling strategy changes | Affects user experience |
| Dependency additions | Supply chain risk |
| Changes to steering docs | Governance change |
| Changes to this playbook | Meta-governance change |

### May Skip Human Review (AI Self-Merge)

| Change Type | Conditions |
|-------------|-----------|
| Fixing a type error | Same logic, correct types |
| Adding missing error handling | Pattern matches adjacent code |
| Implementing a well-specified task | Spec is detailed, task is clear |
| Formatting/linting fixes | No logic changes |
| Adding missing imports | Fix for compilation error |

### Review Decision Tree

```
Is this a new file?
├── YES → Does a spec task describe this file?
│   ├── YES → AI can generate, human reviews before merge
│   └── NO → STOP. Discuss with human first.
└── NO → Is this modifying existing logic?
    ├── YES → Is the change mechanical (rename, type fix)?
    │   ├── YES → AI can proceed, low-priority review
    │   └── NO → Human reviews before merge
    └── NO → Is this adding to existing file (new function/method)?
        ├── YES → Does it follow existing patterns exactly?
        │   ├── YES → AI can generate, human spot-checks
        │   └── NO → Human reviews approach before AI generates
        └── NO → What is this? Clarify before proceeding.
```

---

## When to Reject AI Output

### Immediate Rejection Criteria

Reject and regenerate if ANY of these are true:

| Signal | Problem |
|--------|---------|
| Uses `any` type | Type safety violation |
| Creates a new util/helper for one use | YAGNI, premature abstraction |
| Adds a dependency not in the stack | Dependency rule violation |
| Business logic in component/handler | Layer violation |
| Inline AI prompt text | Prompt management violation |
| >300 lines in one file | Complexity violation |
| New pattern when existing pattern exists | Consistency violation |
| Stub/placeholder implementation | Incomplete work |
| Ignores error states | Silent failure risk |
| Returns raw dict (Python) | Type safety violation |

### Partial Rejection

Accept the structure, reject specific parts:

```
"Keep the function signature and error handling. Redo the business logic 
to use the detect_intent service instead of inline OpenAI calls."
```

### Soft Rejection (Request Changes)

AI output is close but needs adjustments:

```
"This is structurally correct but:
1. Rename handleClick to handleStartCall (be specific)
2. Move the transcript formatting to a utility function
3. Add the missing loading state"
```

---

## Preventing AI Drift

### What is AI Drift?

AI drift occurs when successive AI-generated code gradually deviates from established patterns, creating inconsistency. Each individual change looks reasonable but the cumulative effect is architectural chaos.

### Drift Signals

| Signal | Indication |
|--------|-----------|
| Same concept has 3+ different naming patterns | Naming drift |
| Error handling varies between files in same folder | Pattern drift |
| Import styles differ between files | Convention drift |
| New abstractions appear that duplicate existing ones | Abstraction drift |
| File structure doesn't match steering doc | Structure drift |

### Drift Prevention Mechanisms

1. **Steering docs are auto-loaded** — Every Kiro session starts with the same architectural context
2. **Spec tasks reference specific files** — Agent knows exactly where to look for patterns
3. **Type definitions centralized** — Single source of truth for data shapes
4. **Code review checklist** — Catches drift before merge
5. **Pattern matching instruction** — "Look at how X is done in sibling file Y"

### Drift Correction Protocol

When drift is detected:

```
1. Identify the canonical pattern (first/best implementation)
2. Document it in the relevant standards doc
3. Fix all drifted instances to match the canonical version
4. Add the pattern to the code review checklist
5. Add explicit instruction to agent prompts: "Follow pattern in [file]"
```

---

## Maintaining Architectural Consistency

### The Pattern Library (Implicit)

Instead of a formal pattern library, consistency is maintained by **reference implementations:**

| Concern | Reference File | Pattern |
|---------|---------------|---------|
| REST endpoint | `backend/app/api/v1/calls.py` | Thin handler + service call + envelope |
| Service function | `backend/app/services/voice_intake.py` | Async + typed params + model return |
| Pydantic model | `backend/app/models/call.py` | Field constraints + Literal types |
| React component | `frontend/src/components/call/call-panel.tsx` | Props interface + hook usage + clean JSX |
| Custom hook | `frontend/src/hooks/use-call.ts` | Context + dispatch + exposed actions |
| Prompt file | `backend/app/prompts/intake_system.py` | Version comment + constant string |

### Consistency Rules for Agents

1. **Before creating a new file** — Read the closest existing file of the same type
2. **Before adding a pattern** — Search for existing patterns that solve the same problem
3. **When in doubt** — Copy structure from reference file, adapt content
4. **Never introduce** — New state management, new HTTP client, new component library, new AI SDK usage pattern

### Verification Commands

After AI generates code, verify consistency:

```bash
# Check for any types (should be 0)
grep -r "any" frontend/src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "// eslint"

# Check for inline prompts (should be 0 outside prompts/)
grep -r "You are" backend/app --include="*.py" | grep -v prompts/

# Check for raw dict returns in services (should be 0)
grep -r "-> dict" backend/app/services --include="*.py"

# Check for business logic in handlers (look for openai imports)
grep -r "openai" backend/app/api --include="*.py"
```

---

## Agent Coordination Protocol

### When Multiple Agents Work on Same Feature

1. **One agent per file at a time** — No concurrent edits to same file
2. **Types first** — Define the interface/model before implementation
3. **Contract over implementation** — Agree on function signatures before writing bodies
4. **Merge frequently** — Don't let branches diverge for more than 1 task

### Conflict Resolution

```
Two agents produced different implementations for the same task?
├── Do they have the same interface (params, return types)?
│   ├── YES → Pick the simpler one. Delete the other.
│   └── NO → The spec is ambiguous. Clarify, then re-generate.
└── Does one match existing patterns better?
    ├── YES → Keep the consistent one.
    └── NO → Human decides.
```

---

## Checklist: Agent Output Review

```
□ Output matches the spec task exactly (no extras, no missing pieces)
□ Types are strict (no any, no untyped params)
□ Layer boundaries respected
□ Naming matches conventions
□ Patterns match sibling files
□ Error handling present for all failure modes
□ No new dependencies introduced
□ No inline AI prompts
□ File is in the correct location per structure steering
□ Code compiles and runs without errors
□ Manual test of the feature passes
```
