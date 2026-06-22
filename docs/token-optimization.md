# Token Optimization Guide

## Purpose

Every AI call in RecoverAi costs tokens. Every context window load for AI coding agents costs tokens. This guide minimizes consumption while maximizing quality and consistency.

---

## Reducing Prompt Size

### Principles

1. **Say it once** — Never repeat instructions the model already has in its system prompt
2. **Use structured data** — JSON/tables are more token-efficient than prose for facts
3. **Strip noise** — Remove pleasantries, filler words, redundant context from prompts
4. **Reference, don't repeat** — Point to shared definitions instead of inlining them

### Before/After Examples

```python
# BAD — verbose, redundant (87 tokens)
INTENT_PROMPT = """
You are an AI assistant that helps classify intents. Your job is to look at the
transcript of a phone call and determine what the caller's primary intent is.
The caller might want to make a payment inquiry, dispute a charge, report hardship,
make a settlement offer, request information, or request a callback. Please analyze
the transcript carefully and provide your classification in JSON format. Make sure
to include the intent, your confidence level from 0 to 1, and any signals you detected.
"""

# GOOD — concise, structured (41 tokens)
INTENT_PROMPT = """Classify the caller's primary intent from this collections call transcript.

Valid intents: payment_inquiry | dispute | hardship | settlement_offer | information_request | callback_request

Respond with JSON: {"intent": str, "confidence": float 0-1, "signals": [str]}"""
```

### Token Budget Enforcement

| AI Task | Max Input Tokens | Max Output Tokens | Enforcement |
|---------|-----------------|-------------------|-------------|
| Intent detection | 500 | 200 | Truncate transcript to last 10 utterances |
| Opportunity scoring | 800 | 300 | Include only intent + account summary |
| Handoff summary | 2000 | 800 | Full transcript, but no raw audio metadata |
| Voice conversation | Streaming | Streaming | Managed by Realtime API |

---

## Reusable Prompts

### Prompt Architecture

```
backend/app/prompts/
├── intake_system.py      # Voice intake personality + rules
├── intent_system.py      # Intent classification instructions
├── scoring_system.py     # Opportunity scoring instructions
└── summary_system.py     # Summary generation instructions
```

### Reuse Strategy

- System prompts are **loaded once at startup** and reused across all calls
- Dynamic context (transcript, account info) is injected into the **user message only**
- Never generate system prompts dynamically — they're constants

```python
# GOOD — static system prompt, dynamic user context
messages = [
    {"role": "system", "content": INTENT_SYSTEM_PROMPT},  # constant, loaded once
    {"role": "user", "content": f"Transcript:\n{transcript}\n\nAccount: {account_summary}"},
]

# BAD — dynamically building system prompt
system = f"You are a classifier for {company_name} handling {call_type} calls..."
```

---

## Shared Context Strategy

### For AI Coding Agents (Kiro/Codex)

Steering documents serve as shared context:
- `tech.md` — Technical decisions (avoids re-explaining stack choices)
- `structure.md` — File locations (avoids searching)
- `product.md` — Feature scope (avoids scope creep)

### For Runtime AI (OpenAI API)

Shared context is injected via structured user messages:

```python
# Context builder — assembles only what's needed for each task
def build_intent_context(transcript: list[str], account: AccountInfo) -> str:
    """Build minimal context for intent detection.
    
    Only includes last 10 utterances and account summary (not full history).
    """
    recent = transcript[-10:]  # Token budget: ~500 tokens
    return f"""Recent transcript:
{chr(10).join(recent)}

Account: {account.name}, Balance: ${account.balance}, DPD: {account.days_past_due}"""
```

---

## Avoiding Context Duplication

### Problem

AI coding agents load the same files repeatedly, burning context window:
- Reading `types/index.ts` in every session
- Re-reading steering docs for every task
- Loading entire files when only a function signature is needed

### Solutions

| Duplication Type | Mitigation |
|-----------------|------------|
| Type definitions read repeatedly | Single `types/index.ts` file — read once, reference by name |
| Steering docs re-read | Kiro auto-loads them — never manually paste |
| Full file read for one function | Use code search tools, not full file reads |
| Same prompt text in multiple services | Single prompt file, imported by reference |
| Repeated error handling boilerplate | Base exception class + FastAPI handlers |

### Anti-Pattern

```python
# BAD — every service file repeats the same OpenAI setup
import openai
client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# GOOD — shared client setup, imported once
# app/services/ai_client.py
from app.config import get_settings

_client: openai.AsyncOpenAI | None = None

def get_ai_client() -> openai.AsyncOpenAI:
    global _client
    if _client is None:
        _client = openai.AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client
```

---

## Prompt Compression Techniques

### 1. Abbreviation Tables

For recurring terms in prompts, define abbreviations:

```python
# In scoring prompt
"""Abbreviations: DPD=Days Past Due, PMT=Payment, STLMT=Settlement, HDSHP=Hardship

Scoring factors (use abbreviations in response):
- DPD < 30: +20 pts
- PMT history regular: +15 pts
- STLMT offer > 50%: +25 pts
- HDSHP with documentation: +10 pts"""
```

### 2. Enumerated Instructions (Not Prose)

```python
# BAD — prose (expensive)
"""Please analyze the transcript and determine the intent. Consider whether the
caller is asking about making a payment, disputing charges, reporting financial
hardship, offering to settle their account, requesting general information, or
asking for someone to call them back."""

# GOOD — enumerated (cheap)
"""Classify intent. Options:
1. payment_inquiry
2. dispute
3. hardship
4. settlement_offer
5. information_request
6. callback_request"""
```

### 3. Transcript Windowing

```python
# Only send relevant transcript window, not full history
def window_transcript(messages: list[str], task: str) -> list[str]:
    """Return minimal transcript window for each AI task."""
    if task == "intent":
        return messages[-10:]  # Last 10 utterances sufficient
    elif task == "scoring":
        return messages[-15:]  # Slightly more context for scoring
    elif task == "summary":
        return messages  # Full transcript needed for summary
```

---

## Structured Outputs

### Why

Structured outputs (JSON mode with schema) are more token-efficient than free-text because:
- No parsing logic needed in prompts ("respond with JSON" vs explaining format)
- Responses are predictable length
- No post-processing or regex extraction

### Implementation

```python
# Define output schema as Pydantic model
class IntentOutput(BaseModel):
    intent: Literal["payment_inquiry", "dispute", "hardship", "settlement_offer", "information_request", "callback_request"]
    confidence: float = Field(ge=0.0, le=1.0)
    signals: list[str] = Field(max_length=5)

# Use structured output in API call
response = await client.chat.completions.create(
    model="gpt-4.1",
    messages=messages,
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "intent_classification",
            "schema": IntentOutput.model_json_schema(),
        }
    },
    max_tokens=200,  # Enforce budget
    temperature=0.0,  # Deterministic
)
```

---

## Context Loading Priorities

### For AI Coding Agents

When an agent loads context, prioritize in this order:

| Priority | Content | Reason |
|----------|---------|--------|
| 1 | Steering docs (auto-loaded) | Prevent architectural violations |
| 2 | Types/interfaces of the file being modified | Prevent type errors |
| 3 | The specific file being modified | Required for accurate edits |
| 4 | Direct imports of that file | Understand dependencies |
| 5 | Related test files | Understand expected behavior |
| 6 | Sibling files in same feature folder | Understand patterns |

### For Runtime AI Prompts

| Priority | Content | Max Tokens |
|----------|---------|-----------|
| 1 | System prompt (static) | 200-400 |
| 2 | Account context (structured) | 50-100 |
| 3 | Recent transcript (windowed) | 200-500 |
| 4 | Previous AI outputs (if chaining) | 100-200 |

---

## Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Intent detection input tokens | <500 | Log `usage.prompt_tokens` from API response |
| Scoring input tokens | <800 | Log `usage.prompt_tokens` |
| Summary input tokens | <2000 | Log `usage.prompt_tokens` |
| Agent context window utilization | <60% per task | Monitor steering doc + file sizes |
| Prompt reuse rate | 100% for system prompts | Verify no dynamic system prompt generation |

---

## Checklist: Token Efficiency Review

```
□ System prompts are static constants (not generated)
□ Transcript is windowed for each AI task (not full history always)
□ Structured outputs used for intent and scoring (not free-text)
□ max_tokens set on every API call
□ Temperature 0.0 for classification tasks (no wasted tokens on variety)
□ Account context is summarized (not full raw data)
□ No duplicate information between system and user messages
□ Prompt files use enumeration over prose where possible
□ AI coding agent context prioritized (steering > types > target file)
```
