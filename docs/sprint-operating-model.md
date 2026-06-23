# Sprint Operating Model

## Sprint Parameters

| Parameter | Value |
|-----------|-------|
| Sprint length | 1 day (hackathon pace) |
| Total sprints | 5 (matching 5-day hackathon budget) |
| Max features per sprint | 1 major, 1-2 minor |
| Planning time | 15 minutes max |
| Standup time | 5 minutes max |

---

## Daily Standup Format

### Structure (5 minutes)

```
1. DONE — What shipped since last standup (< 2 sentences per item)
2. DOING — What's in progress right now (specific task ID)
3. BLOCKED — What's stuck and what unblocks it
4. DEMO STATUS — Can we demo the happy path right now? Yes/No/Partial
```

### Example

```
DONE: Task 2.1 (WebSocket handler) — tested, merged
DOING: Task 2.3 (intent detection service)
BLOCKED: None
DEMO STATUS: Partial — voice intake works, transcript streams, intent not wired yet
```

### Rules

- No status reports longer than 3 sentences
- "Blocked" requires a specific unblocking action, not a vague description
- Demo status is binary: if you can't show it working, it's not done
- Skip standup if you're mid-flow and will lose momentum (async update is fine)

---

## Sprint Planning Format

### Structure (15 minutes max)

```
1. GOAL — One sentence describing what will be demoable after this sprint
2. TASKS — Ordered list of tasks (from spec) to complete
3. RISKS — Anything that could block the goal
4. DONE CRITERIA — What "done" looks like (demo script)
```

### Example

```
GOAL: Live transcript streams to dashboard during voice call

TASKS:
1. [T2.1] WebSocket connection between frontend and backend
2. [T2.2] Transcript delta messages flowing over WebSocket  
3. [T2.3] Transcript panel rendering messages in real-time
4. [T2.4] Manual test of full flow

RISKS:
- OpenAI Realtime API latency might exceed 2s target
- WebSocket reconnection logic untested

DONE CRITERIA:
- Start call → speak → see words appear on dashboard within 2s
- End call → transcript preserved on screen
```

---

## Task Ownership Rules

### Assignment

- Each task has exactly ONE owner
- Owner is responsible for implementation AND manual testing
- Owner can delegate sub-work to AI agents but owns the output
- If a task is unowned for >2 hours, the tech lead assigns it

### Accountability

| Scenario | Owner's Responsibility |
|----------|----------------------|
| Task is completed | Mark `[x]`, note what was tested |
| Task is blocked | Mark `[~]`, describe blocker, propose workaround |
| Task scope expanded | Split task, update spec, communicate new timeline |
| Task is taking too long (>4 hours) | Escalate: simplify scope or get help |
| AI agent produced broken code | Owner fixes it (don't merge broken code) |

### Handoff Protocol

If task ownership changes:
1. Current owner documents current state (what's done, what's left)
2. New owner reads the task spec and current state
3. New owner confirms understanding before old owner moves on

---

## Progress Tracking

### Task States

```
[ ] — Not started
[>] — In progress (actively being worked on)
[x] — Complete (tested, merged)
[~] — Blocked (cannot proceed without external action)
[-] — Cancelled (no longer needed, reason documented)
```

### Sprint Board (Maintained in Spec Tasks)

```markdown
## Sprint 2 — Live Transcript

### Done
- [x] T2.1: WebSocket handler — manual test passed
- [x] T2.2: Transcript delta messages — streams correctly

### In Progress  
- [>] T2.3: Transcript panel component — rendering works, styling WIP

### Blocked
- [~] T2.5: Reconnection logic — blocked on understanding Realtime API reconnect behavior

### Not Started
- [ ] T2.4: End-to-end manual test
```

### Daily Progress Update

At end of each work session, update:
1. Task states in spec tasks file
2. Any new blockers or risks discovered
3. Revised estimate for sprint completion

---

## Blocker Tracking

### Blocker Format

```markdown
**Blocker:** [Brief description]
**Impact:** [Which tasks are affected]
**Unblock action:** [Specific action needed]
**Workaround:** [Temporary alternative, if any]
**Escalation:** [Who to escalate to if unresolved in 2 hours]
```

### Blocker Categories

| Category | Example | Response Time |
|----------|---------|---------------|
| Technical unknown | "Don't know how Realtime API handles reconnection" | Research for 30 min, then simplify or skip |
| Dependency | "Waiting for intent prompt to be finalized" | Unblock within 2 hours or use placeholder |
| Environment | "API key rate limited" | Switch to mock mode, continue without AI |
| Scope creep | "This feature is bigger than estimated" | Cut scope to demo-minimum, defer rest |

### Blocker Decision Tree

```
Is this blocking the demo happy path?
├── NO → Park it, continue with other tasks
└── YES → Can it be worked around in <30 min?
    ├── YES → Implement workaround, add TODO for proper fix
    └── NO → Escalate immediately, consider scope cut
```

---

## Definition of Ready

A task is **ready to start** when:

```
□ Task is described in a spec with clear acceptance criteria
□ All dependencies (other tasks) are complete
□ Required API contracts / interfaces are defined
□ Required data models exist (or are in the same task)
□ No open questions that require product decisions
□ Developer understands the task without needing a meeting
```

### If a task isn't ready:
- Don't start it
- Identify what's missing
- Make it ready (answer questions, define interfaces) before coding

---

## Definition of Done

A task is **done** when:

```
□ Code is implemented and compiles without errors
□ Happy path works when manually tested
□ Code follows engineering standards (typed, layered, no any)
□ Error states are handled (not swallowed)
□ UI looks polished (not broken layout, responsive at demo resolution)
□ Code is committed to feature branch
□ Spec task is marked [x] with completion note
□ No new lint warnings introduced
```

### A task is NOT done when:
- "It works on my machine but I haven't tested the integration"
- "The logic works but the UI is ugly"
- "It works but throws console errors"
- "It works but I hardcoded a value that should come from config"

---

## Sprint Ceremonies

### Hackathon-Adapted Schedule

| Time | Ceremony | Duration |
|------|----------|----------|
| Start of day | Sprint planning | 15 min |
| Mid-day | Quick sync (standup format) | 5 min |
| End of day | Demo rehearsal + retrospective | 15 min |

### Demo Rehearsal (End of Sprint)

```
1. Run the full demo scenario end-to-end
2. Note any failures or rough spots
3. Decide: fix tonight or defer?
4. Update demo script if flow changed
5. Commit demo-ready state to main
```

### Retrospective Questions (3 min)

```
1. What worked well today?
2. What slowed us down?
3. What should we change tomorrow?
```

---

## Velocity Tracking

### Estimation

Tasks are sized in t-shirt sizes:

| Size | Time Budget | Example |
|------|-------------|---------|
| S | 1-2 hours | Add a new badge component |
| M | 2-4 hours | Implement intent detection service |
| L | 4-8 hours | Full WebSocket session handler |
| XL | >8 hours | **Too big — split it** |

### Tracking

```
Sprint 1: Planned 4M tasks, Completed 3M + 1S → velocity = 3.25M equivalent
Sprint 2: Plan based on velocity (don't overcommit)
```

---

## Checklist: Sprint Health

```
□ Sprint goal is one sentence (clear, demoable outcome)
□ All tasks have single owners
□ No task is >4 hours estimated without being split
□ Blockers have documented unblock actions
□ Task states are current (updated today)
□ Demo path is tested at end of each sprint
□ No "in progress" tasks sitting for >1 day without update
```
