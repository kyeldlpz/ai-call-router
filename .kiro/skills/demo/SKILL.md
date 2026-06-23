# Demo Skills — RecoverAi

## Purpose

Enforce demo-first development practices for the hackathon. Every engineering decision serves the demo. If it doesn't improve the demo, it doesn't ship.

---

## Demo-First Development

### Rules

1. Before writing any code, ask: "Will this be visible in the demo?"
2. If the answer is no, deprioritize it aggressively
3. The happy path must work perfectly — edge cases can fail gracefully
4. Visual polish is a feature, not a nice-to-have
5. Build for the 3-minute demo window — not for 3 years of production

### Priority Stack

```
1. Does it work in the demo?         → MUST
2. Does it look good in the demo?    → MUST
3. Does it feel fast?                → MUST
4. Is the code clean?               → SHOULD
5. Does it handle edge cases?       → NICE
6. Is it scalable?                  → IRRELEVANT
7. Is it production-ready?          → IRRELEVANT
```

### Decision Framework

When facing a tradeoff:
- **Demo reliability > Code elegance** — A working hack beats an elegant failure
- **Visual impact > Technical depth** — Judges see the UI, not the architecture
- **Speed of iteration > Perfect implementation** — Ship, demo, iterate
- **Real-time wow factor > Feature breadth** — One impressive feature beats five mediocre ones

---

## Prioritize User Experience

### Rules

1. First impressions happen in 3 seconds — the UI must look professional immediately
2. Animations and transitions signal quality — use them intentionally
3. Status is always visible — the user never wonders "what's happening?"
4. Actions give immediate feedback — no dead clicks, no silent failures
5. The demo tells a story — it has a beginning, middle, and end

### UX Standards for Demo

| Element | Requirement |
|---------|-------------|
| Start Call | Response in under 500ms (button state change) |
| AI Greeting | Audible within 2 seconds |
| Transcript | First words appear within 2 seconds of speech |
| Status Badge | Updates within 500ms of state change |
| End Call | Clean termination, transcript persists |
| Error States | Clear message + recovery action (never blank/frozen) |

---

## Prioritize Wow Moments

### The Wow Moments (in priority order)

1. **AI picks up instantly** — No IVR, no hold music, just immediate intelligent response
2. **Transcript streams live** — Words appearing in real-time as people speak
3. **Natural conversation** — AI doesn't sound robotic or scripted
4. **Professional UI** — Dashboard looks like a real product, not a prototype

### How to Enhance Wow

```tsx
// Streaming text effect: show text appearing character by character
// This is MORE visually impressive than dumping whole sentences

// Pulsing connection indicator during "Connecting..."
<div className="animate-pulse text-yellow-500">● Connecting to AI...</div>

// Smooth transcript scroll
scrollRef.current?.scrollIntoView({ behavior: "smooth" });

// Status transitions with color changes
// idle(gray) → connecting(yellow+pulse) → active(green) → complete(blue)
```

### Anti-Pattern

```tsx
// BAD: Functional but not impressive
<p>{latestMessage}</p>  // Just dumps text, no streaming effect

// BAD: Technical but not visual
console.log("AI connected");  // Nobody sees this in demo

// BAD: Over-engineered but not demo-able
// Implementing circuit breaker pattern for API calls (nobody will notice)
```

---

## Use Mock Data When Necessary

### Rules

1. Mock data is demo data — it should be realistic and impressive
2. Mock scenarios are pre-designed stories that demonstrate capabilities
3. Use real-sounding but fictional names (Sarah Mitchell, Marcus Johnson, Elena Rodriguez)
4. Use realistic dollar amounts ($4,200, $1,850, $6,500)
5. Never use "test", "foo", "bar", or "lorem ipsum" in demo-visible data

### Demo-Ready Mock Data

```python
# This is good mock data — tells a story
DEMO_ACCOUNTS = {
    "ACC-2024-7891": {
        "name": "Sarah Mitchell",
        "balance": 4200.00,
        "days_past_due": 45,
        "scenario": "Wants to settle at 60% — high value recovery opportunity",
    }
}

# This is bad mock data — looks like a test
BAD_MOCK = {
    "test-001": {
        "name": "Test User",
        "balance": 100.00,
        "scenario": "test scenario",
    }
}
```

### When to Use Mock Data vs Real AI

| Layer | Mock or Real? | Rationale |
|-------|---------------|-----------|
| Voice conversation | Real (OpenAI Realtime API) | This IS the demo |
| Customer account data | Mock (in-memory) | No real integration needed |
| Transcript display | Real (from OpenAI) | This IS the demo |
| Call metadata | Generated (UUID, timestamps) | Simple code generation |

---

## Build for Judges

### What Judges Care About

1. **Does it solve a real problem?** → Demo the pain point first, then the solution
2. **Is the tech impressive?** → Real-time AI voice is inherently impressive — lean into it
3. **Does it work?** → Smooth, error-free demo matters more than feature count
4. **Can I understand it in 60 seconds?** → Clear visual hierarchy, obvious flow
5. **What's the business impact?** → "60 seconds of AI intake replacing 5 minutes of agent discovery"

### Demo Structure (3 minutes)

```
0:00 - 0:30  → Set the problem (fragmented channels, no context, missed calls)
0:30 - 0:45  → "Watch what happens when a call comes in"
0:45 - 2:00  → Live demo (start call → converse → show transcript streaming)
2:00 - 2:30  → Show the result (complete transcript, call summary)
2:30 - 3:00  → "Imagine this for every inbound call" (vision statement)
```

### What to Show vs What to Say

| Show (Visual) | Say (Narrate) |
|---------------|---------------|
| Click Start Call | "A debtor calls in..." |
| AI greeting plays | "AI answers in under 1 second, no IVR" |
| Transcript streaming | "Real-time transcription as they speak" |
| Multi-turn conversation | "Natural conversation, not a script" |
| Call ends, transcript persists | "The agent gets a complete record" |

---

## Avoid Overengineering

### Rules

1. No abstraction for things used once
2. No configuration system — hardcode for the demo
3. No multi-tenancy — one user, one dashboard
4. No authentication — anyone can access the demo
5. No caching layer — in-memory state is fast enough
6. No message queue — direct function calls are fine
7. No database migrations — mock data resets on restart
8. No feature flags — everything is always on
9. No internationalization — English only
10. No analytics tracking — the demo IS the metric

### "Would I Build This at Stripe?" Test

Ask yourself: "Is this something I'd do in a production system?" If yes, then ask: "Does the hackathon demo need it?" If no, skip it.

| Engineering Best Practice | Hackathon Decision |
|--------------------------|-------------------|
| Database with migrations | ❌ In-memory dict |
| JWT authentication | ❌ No auth |
| Rate limiting | ❌ Skip |
| Input sanitization | ❌ Trust demo operator |
| Horizontal scaling | ❌ Single process |
| CI/CD pipeline | ❌ Manual deploy |
| Load testing | ❌ One user |
| Logging aggregation | ❌ Console.log is fine |
| API versioning strategy | ✅ /v1/ (costs nothing) |
| Type safety | ✅ Prevents bugs during rapid dev |
| Clean architecture | ✅ Prevents confusion with multiple devs |

---

## Demo Reliability Checklist

### Before Every Demo Run

```markdown
- [ ] Backend running: http://localhost:8000/api/v1/health returns 200
- [ ] Frontend running: http://localhost:3000 loads dashboard
- [ ] OPENAI_API_KEY is set and valid
- [ ] Browser microphone works (test in another app first)
- [ ] Speaker/headphone volume is up
- [ ] Chrome browser (not Firefox/Safari for WebAudio reliability)
- [ ] No other apps using microphone
- [ ] WiFi is stable (for OpenAI API calls)
- [ ] Browser console clear of errors
- [ ] Fresh page load (no stale state)
```

### Known Failure Modes and Mitigations

| Failure | Mitigation |
|---------|------------|
| OpenAI API down | Have a recorded video backup |
| Slow network | Run demo on wired connection if possible |
| Microphone not working | Test 5 minutes before demo |
| Browser permission blocked | Reset permissions before demo |
| Audio feedback loop | Use headphones, not speakers |
| AI responds slowly | Narrate while waiting: "The AI is processing..." |

---

## Demo Day Preparation

### Night Before

1. Run full demo 3 times end-to-end
2. Charge laptop to 100%
3. Test on the actual presentation hardware (projector, external mic if any)
4. Prepare 30-second verbal fallback if tech fails
5. Clear browser history and notifications

### Day Of

1. Arrive early, test AV setup
2. Run demo once in practice mode
3. Keep terminal visible but minimized (restart quickly if needed)
4. Have the demo script memorized — don't read from notes
5. If something breaks mid-demo: acknowledge it, restart quickly, keep talking
