# Documentation Governance

## Core Principle

Documentation is a dependency. If the docs say one thing and the code does another, **the docs are a bug**.

---

## When Specs Must Be Updated

| Trigger | Required Update | Owner |
|---------|----------------|-------|
| Requirement changes (scope added/removed) | Update `requirements.md` in the relevant spec | Feature owner |
| API contract changes (new field, removed endpoint) | Update `design.md` in the relevant spec | Implementer |
| Task is blocked or re-scoped | Update task status + add blocking note | Task assignee |
| New dependency added to a feature | Update design doc with dependency rationale | Implementer |
| Feature is cancelled or deferred | Mark spec as `DEFERRED` with reason | Product lead |

### Spec Update Rules

1. Specs are updated **before or during** implementation, never retroactively
2. If a task deviates from its spec during implementation, update the spec **immediately** (not after the PR)
3. Completed tasks are marked `[x]` with a one-line completion note
4. Blocked tasks are marked `[~]` with blocker description

---

## When Tasks Must Be Updated

| Event | Task State Change |
|-------|------------------|
| Work begins | `[ ]` → `[>]` (in progress) |
| Work completes | `[>]` → `[x]` (done) |
| Blocker discovered | `[>]` → `[~]` (blocked) + blocker note |
| Task is invalid/unnecessary | `[ ]` → `[-]` (cancelled) + reason |
| Scope expands mid-task | Split into sub-tasks, mark original as parent |

### Task Format

```markdown
- [x] Task 1: Implement WebSocket connection handler — completed, tested manually
- [>] Task 2: Add intent detection service — in progress
- [~] Task 3: Integrate scoring model — blocked: waiting on prompt finalization
- [-] Task 4: Add Redis caching — cancelled: in-memory sufficient for demo
- [ ] Task 5: Generate handoff summary
```

---

## When Design Docs Must Be Updated

| Change Type | Design Doc Section to Update |
|-------------|------------------------------|
| New API endpoint added | API contract section |
| WebSocket message type added | Message schema section |
| Data model field added/removed | Data model section |
| Service interface changed | Service layer section |
| New dependency on external service | Architecture diagram |
| Error handling strategy changed | Error handling section |

### Design Doc Rules

1. Design docs are **living documents** — they reflect current implementation, not initial plans
2. If design diverges from implementation, the design doc is wrong (update it)
3. Design changes that affect multiple features require cross-referencing in both specs
4. Deprecated designs are marked `~~strikethrough~~` with date and reason

---

## Documentation Ownership

| Document | Owner | Reviewer |
|----------|-------|----------|
| `product.md` (steering) | Product lead | Engineering lead |
| `tech.md` (steering) | Engineering lead | All developers |
| `structure.md` (steering) | Architecture lead | Engineering lead |
| Feature specs (requirements) | Product lead | Feature developer |
| Feature specs (design) | Feature developer | Architecture lead |
| Feature specs (tasks) | Feature developer | Self-managed |
| `docs/*.md` (engineering) | Engineering lead | All developers |
| `README.md` | Engineering lead | Product lead |
| Code comments | Code author | Code reviewer |

### Ownership Rules

1. Owner is responsible for accuracy and timeliness
2. Reviewer must approve changes to steering docs before merge
3. Any developer can propose changes to any doc (PR-based)
4. Stale docs are the owner's responsibility to fix within 24 hours of discovery

---

## Change Tracking Process

### For Steering Docs

```
1. Identify change needed
2. Create branch: docs/update-<document>-<what>
3. Make changes with inline comment: <!-- Updated YYYY-MM-DD: reason -->
4. PR with "DOCS:" prefix in title
5. Reviewer approves
6. Merge to main
```

### For Spec Docs

```
1. During implementation, discover spec deviation
2. Update spec inline (same branch as code change)
3. PR includes both code and spec changes
4. Reviewer verifies spec matches implementation
```

### For Engineering Docs

```
1. Standard is violated or needs update
2. Update doc with rationale for change
3. If change affects existing code, create follow-up task for compliance
4. Notify team in standup
```

---

## Staleness Detection

### Signals That a Doc Is Stale

| Signal | Severity | Action |
|--------|----------|--------|
| Code references a file/function that doesn't exist in the doc | High | Update immediately |
| Doc references a dependency that's been removed | High | Update immediately |
| Doc describes a flow that differs from actual behavior | Critical | Update + verify code is correct |
| Doc uses outdated version numbers | Low | Update in next doc sweep |
| Doc references "TODO" items that are complete | Low | Clean up in next doc sweep |

### Doc Sweep Schedule

- **Daily:** Task statuses updated at end of work session
- **Per-sprint:** Spec accuracy verified against implemented code
- **Per-feature:** Design doc reviewed before marking feature complete

---

## Documentation Quality Standards

### Required Elements

Every technical doc must include:
- **Purpose statement** (first paragraph — what and why)
- **Audience** (who this doc is for)
- **Last verified date** (when was this confirmed accurate)
- **Examples** (at least one per major concept)
- **Anti-patterns** (what NOT to do)

### Formatting Rules

- Use tables for reference information (not prose)
- Use code blocks for all code examples (with language tag)
- Use checklists for process steps
- Use decision trees for conditional logic
- Keep paragraphs under 4 sentences
- Prefer concrete examples over abstract descriptions

---

## Checklist: Documentation Health

```
□ All spec tasks reflect current status (not outdated)
□ Design docs match implemented API contracts
□ Steering docs match current tech stack decisions
□ No references to removed files or functions
□ All TODO items in docs have a corresponding task
□ README quick start instructions actually work
□ No contradictions between docs
□ Examples in docs compile/run correctly
```
