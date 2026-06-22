# AI Memory Strategy

## Overview

RecoverAi has two distinct AI memory contexts:

1. **Runtime AI** — The voice intake agent and analysis services (OpenAI Realtime API + GPT-4.1)
2. **Development AI** — Kiro, Codex, and other coding agents working on the codebase

This document defines memory strategies for both.

---

## Runtime AI: Voice Intake Memory

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Voice Intake Session                 │
├─────────────────────────────────────────────────┤
│ Layer 1: System Prompt (static, loaded once)     │
│ Layer 2: Account Context (loaded at call start)  │
│ Layer 3: Conversation Buffer (growing)           │
│ Layer 4: Intent/Score State (updated mid-call)   │
└─────────────────────────────────────────────────┘
```

### Short-Term Memory (Single Utterance)

**Scope:** Current audio chunk being processed
**Lifetime:** One Realtime API frame
**Contents:**
- Raw audio → text transcription delta
- Speaker diarization (AI vs caller)

**Rules:**
- Transcription deltas are immediately forwarded to frontend via WebSocket
- No accumulation at this layer — pass through only
- If a frame fails to transcribe, log warning and skip (don't retry individual frames)

### Session Memory (Single Call)

**Scope:** One call session from start to end
**Lifetime:** Duration of the call (minutes)
**Contents:**

```python
class CallSessionMemory:
    """In-memory state for one active call."""
    call_id: str
    scenario: ScenarioConfig
    account: AccountInfo
    transcript: list[TranscriptMessage]  # Full conversation so far
    current_intent: IntentResult | None
    current_score: OpportunityScore | None
    utterance_count: int  # Tracks when to trigger analysis
    started_at: datetime
```

**Rules:**
- The Realtime API manages its own conversation context internally
- Our session memory is a **parallel record** for analysis and handoff
- Transcript accumulates all utterances (no pruning during call)
- Intent detection triggers every 3-5 new utterances (configurable)
- Score updates only when intent changes

### Conversation Memory (For Analysis Services)

**Scope:** Transcript context sent to GPT-4.1 for intent/scoring
**Lifetime:** Duration of one API call
**Contents:** Windowed transcript subset

**Windowing Strategy:**

```python
def get_analysis_window(transcript: list[TranscriptMessage], task: str) -> str:
    """Extract the relevant window for each analysis task.
    
    Intent detection: last 10 utterances (recent context most relevant)
    Scoring: last 15 utterances + account context
    Summary: full transcript (generated once at call end)
    """
    if task == "intent":
        window = transcript[-10:]
    elif task == "scoring":
        window = transcript[-15:]
    elif task == "summary":
        window = transcript  # Full, but only called once
    else:
        window = transcript[-10:]
    
    return "\n".join(f"[{m.speaker}]: {m.text}" for m in window)
```

**Rules:**
- Never send full transcript for intent detection (wasteful)
- Always include speaker labels in transcript window
- Include timestamp only for summary generation (helps with timeline)
- Account context is static — load once, include in every analysis call

### Context Summarization (Call End)

**Scope:** Generating the handoff summary
**Lifetime:** One API call at call end
**Contents:** Full call context compressed into structured briefing

```python
def build_summary_context(session: CallSessionMemory) -> str:
    """Build the full context for summary generation.
    
    This is the ONE time we use the full transcript.
    Budget: ~2000 tokens input.
    """
    return f"""Call ID: {session.call_id}
Caller: {session.account.name}
Account: {session.account.account_number}
Balance: ${session.account.balance}
Days Past Due: {session.account.days_past_due}

Detected Intent: {session.current_intent.intent if session.current_intent else 'unknown'}
Opportunity Score: {session.current_score.value if session.current_score else 'N/A'}/100

Full Transcript:
{format_transcript(session.transcript)}

Duration: {calculate_duration(session.started_at)}"""
```

### Memory Pruning

**When to Prune:**
- Call ends normally → session memory archived to repository, then cleared from active memory
- Call errors out → session memory logged at ERROR level, then cleared
- WebSocket disconnects → session memory preserved for 60s (reconnection window), then cleared

**What to Preserve After Call:**
```python
# Repository stores the final state only
class CompletedCall:
    call_id: str
    transcript: list[TranscriptMessage]  # Full record
    final_intent: IntentResult
    final_score: OpportunityScore
    summary: HandoffSummary
    duration_seconds: int
    completed_at: datetime
```

---

## Runtime AI: Context Refresh Rules

### Realtime API Session Context

The OpenAI Realtime API maintains its own conversation context. Our responsibilities:

| Our Responsibility | Realtime API's Responsibility |
|-------------------|------------------------------|
| System prompt (sent once at session start) | Conversation turn tracking |
| Account context (injected at start) | Voice memory / context window |
| Function definitions (if using tools) | Audio processing |
| Session termination | Token management |

### When to Refresh Context

| Trigger | Action |
|---------|--------|
| Call starts | Load system prompt + account context into Realtime API session |
| Intent detected | Update internal session state (don't re-inject into Realtime API) |
| Score updated | Update internal session state |
| Reconnection after drop | Start new Realtime API session with same system prompt + account |
| Call ends | Signal Realtime API session to close |

### Context Never Changes Mid-Call

- System prompt is immutable during a call
- Account context is immutable during a call
- We do NOT update the Realtime API's context based on detected intent
- The voice AI's personality and instructions remain fixed from start to end

---

## Development AI: Coding Agent Memory

### Session Memory (One Kiro/Codex Session)

**Loaded automatically:**
- Steering docs (`tech.md`, `structure.md`, `product.md`)
- Active spec tasks (if in spec mode)

**Loaded on demand:**
- Source files being edited
- Type definitions (`types/index.ts`, Pydantic models)
- Related tests

### Context Budget Allocation

```
┌─────────────────────────────────────────────┐
│ AI Coding Agent Context Window              │
├─────────────────────────────────────────────┤
│ 15% — Steering docs (auto-loaded)           │
│ 10% — Spec/task context                     │
│ 40% — Target files (reading + writing)      │
│ 20% — Related files (imports, tests)        │
│ 15% — Conversation + tool output            │
└─────────────────────────────────────────────┘
```

### Memory Optimization for Agents

| Technique | Implementation |
|-----------|---------------|
| Single types file | All shared types in one importable file |
| Compact steering docs | Structured tables over prose |
| Feature isolation | Agent only loads files for the feature it's modifying |
| Spec scoping | Each spec task references only the files it touches |
| Progressive disclosure | Agent reads signatures first, implementations only when needed |

### Context Refresh Rules for Agents

| Situation | Action |
|-----------|--------|
| Starting a new task | Re-read target files (may have changed) |
| After context compaction | Verify current file state before continuing |
| Cross-feature work | Load the new feature's types and interfaces |
| After failing twice | Step back, re-read broader context |

---

## Memory Anti-Patterns

### Runtime AI

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Sending full transcript for every intent check | Wastes tokens, degrades response quality | Window to last 10 utterances |
| Re-injecting system prompt mid-call | Confuses context, wastes tokens | Send system prompt once at session start |
| Accumulating AI analysis in conversation context | Grows unbounded | Keep analysis results in separate state |
| Not clearing session memory after call end | Memory leak | Explicit cleanup on call end |

### Development AI

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Reading entire codebase for every task | Burns context window | Use file search, read only target + deps |
| Pasting steering docs into prompts manually | Duplicates auto-loaded context | Trust Kiro's auto-loading |
| Loading all test files upfront | Wastes context on irrelevant tests | Load only tests for the file being changed |
| Not scoping tasks to specific files | Agent reads too broadly | Specs list exactly which files to touch |

---

## Decision Tree: How Much Context to Load

```
What AI task is this?
├── Voice intake (Realtime API)
│   └── System prompt + account context → DONE (Realtime API manages the rest)
├── Intent detection
│   └── Last 10 utterances + account summary → 500 tokens max
├── Opportunity scoring
│   └── Last 15 utterances + intent result + account details → 800 tokens max
├── Handoff summary
│   └── Full transcript + account + intent + score → 2000 tokens max
├── Coding agent task
│   └── Steering (auto) + target file + types + direct deps → 60% window max
└── Unknown
    └── Start minimal, add context only if quality is insufficient
```

---

## Checklist: Memory Strategy Review

```
□ Session memory is cleared after call ends (no leaks)
□ Transcript windowed appropriately for each AI task
□ System prompt sent exactly once per Realtime API session
□ Account context is immutable during a call
□ Coding agents scoped to feature boundaries
□ No duplicate context between steering docs and manual loads
□ Graceful degradation if context is insufficient (return "unknown", not crash)
□ Reconnection starts a fresh AI session (not resuming corrupted state)
```
