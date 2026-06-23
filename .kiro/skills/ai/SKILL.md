# AI Engineering Skills — RecoverAi

## Purpose

Enforce consistent AI engineering patterns across all developers and AI agents. Prevent unreliable AI behavior, hallucinations, and brittle prompt engineering.

---

## Prompt Management

### Rules

1. All prompts live in `backend/app/prompts/` as Python files
2. Each file exports a single string constant (e.g., `INTAKE_SYSTEM_PROMPT`)
3. Prompts are versioned with a comment at the top: `# v1.0 - Collections intake agent`
4. Prompts are NEVER constructed dynamically with string concatenation in service code
5. Variable injection uses clear placeholders: `{account_name}`, `{balance}`
6. Prompt files contain ONLY the prompt text — no logic, no functions
7. Prompt updates are treated as meaningful changes — review carefully

### Example (Correct)

```python
# prompts/intake_system.py
# v1.0 - Collections intake voice agent

INTAKE_SYSTEM_PROMPT = """You are a professional collections intake specialist at RecoverAi.
You answer inbound calls from customers who have outstanding accounts.

Your role:
- Greet callers warmly and professionally
- Ask how you can help them today
- Listen to their situation with empathy
- Ask clarifying questions about their account
- Acknowledge their concerns
- Let them know an agent will follow up with next steps

Your tone: Professional, empathetic, helpful. Never threatening or aggressive.

Keep responses concise (2-3 sentences max per turn).
Do not make promises about payment plans or settlements.
Do not ask for sensitive information like SSN or full credit card numbers."""
```

### Anti-Pattern

```python
# BAD: Prompt constructed inline
async def create_session(scenario):
    prompt = "You are an AI agent. "
    if scenario == "settlement":
        prompt += "The caller wants to settle. "
    prompt += "Be nice. "  # Fragile, unversioned, untestable
```

---

## Structured Outputs

### Rules

1. All AI text completions (non-voice) MUST use structured outputs
2. Define response schemas as Pydantic models
3. Pass the JSON schema to OpenAI via `response_format`
4. Never parse free-text AI responses with regex or string splitting
5. Validate AI responses against the Pydantic model before using them

### Example (Correct)

```python
from pydantic import BaseModel
from typing import Literal

class IntentClassification(BaseModel):
    intent: Literal["payment_inquiry", "dispute", "hardship", "settlement_offer", "information_request", "callback_request"]
    confidence: float
    signals: list[str]

# Usage with OpenAI
response = await client.chat.completions.create(
    model="gpt-4.1",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "intent_classification",
            "strict": True,
            "schema": IntentClassification.model_json_schema(),
        },
    },
)
result = IntentClassification.model_validate_json(response.choices[0].message.content)
```

### Anti-Pattern

```python
# BAD: Parsing free text
response_text = completion.choices[0].message.content
intent = response_text.split("Intent:")[1].strip()  # Fragile!

# BAD: No validation
data = json.loads(response_text)  # Could be anything
return data["intent"]  # KeyError waiting to happen
```

---

## JSON Response Requirements

### Rules

1. Every AI call that returns structured data must specify a JSON schema
2. Use `"strict": True` in the response_format to enforce schema adherence
3. All enum fields use `Literal` types — never open strings
4. All numeric fields have documented ranges (e.g., confidence: 0.0-1.0)
5. Response models include all fields the consuming code needs — no optional "extras"

### Schema Design Pattern

```python
class OpportunityScore(BaseModel):
    """AI-generated opportunity scoring result."""
    level: Literal["high", "medium", "low"]
    value: int = Field(ge=0, le=100, description="Score from 0-100")
    factors: list[str] = Field(min_length=1, max_length=5, description="Key scoring factors")
    reasoning: str = Field(max_length=200, description="One-sentence explanation")
```

---

## AI Reliability Rules

### Rules

1. Every AI call has a timeout: 30 seconds for completions, 60 seconds for realtime
2. AI failures NEVER crash the application — they degrade gracefully
3. Always have a fallback value for when AI fails:
   - Intent: `"unknown"`
   - Score: `null` with "Scoring unavailable" message
   - Summary: Partial data with "Generation failed" note
4. Log all AI call durations for performance monitoring
5. AI responses are validated before being used — invalid responses treated as failures

### Example

```python
import asyncio

async def detect_intent(transcript: str) -> IntentResult:
    try:
        response = await asyncio.wait_for(
            _call_openai_intent(transcript),
            timeout=30.0,
        )
        return IntentResult.model_validate_json(response)
    except asyncio.TimeoutError:
        logger.warning("Intent detection timed out")
        return IntentResult(intent="unknown", confidence=0.0, signals=["timeout"])
    except Exception as e:
        logger.error(f"Intent detection failed: {e}")
        return IntentResult(intent="unknown", confidence=0.0, signals=["error"])
```

---

## Hallucination Prevention

### Rules

1. Prompts include explicit constraints: "Only use the following categories..."
2. Prompts include negative instructions: "Do NOT invent account numbers"
3. Structured outputs with `Literal` types prevent invalid categories
4. AI is never asked to generate IDs, timestamps, or system data — those come from code
5. When AI references account data, it must come from injected context, not "memory"
6. Voice agent prompt explicitly prohibits making promises or commitments

### Constraint Patterns

```python
# Good: Explicit enumeration prevents hallucination
INTENT_PROMPT = """Classify into EXACTLY one of these categories:
- payment_inquiry
- dispute
- hardship
- settlement_offer
- information_request
- callback_request

Do NOT create new categories. If unsure, use 'information_request'."""

# Good: Prevent invention
VOICE_PROMPT = """Do not make promises about:
- Specific payment plan amounts
- Settlement percentages
- Account balance reductions
- Timeline for resolution

Instead say: 'An agent will follow up with specific options.'"""
```

### Anti-Pattern

```python
# BAD: Open-ended prompt inviting hallucination
INTENT_PROMPT = """What is the caller's intent? Describe it."""
# AI might return: "The caller wants a 50% discount" (invented)
```

---

## Retry Strategy

### Rules

1. Retry on transient failures: network timeout, 429 (rate limit), 500 (server error)
2. Do NOT retry on: 400 (bad request), 401 (auth), 403 (forbidden)
3. Max 2 retries (3 total attempts)
4. Exponential backoff: 1 second, 2 seconds
5. Log each retry attempt
6. After all retries exhausted, return graceful fallback

### Implementation

```python
import asyncio

MAX_RETRIES = 2
RETRY_DELAYS = [1.0, 2.0]

async def with_retry(coro_factory, fallback):
    """Execute an async operation with retry logic."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await coro_factory()
        except (asyncio.TimeoutError, ConnectionError) as e:
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAYS[attempt]
                logger.warning(f"Retry {attempt + 1}/{MAX_RETRIES} after {delay}s: {e}")
                await asyncio.sleep(delay)
            else:
                logger.error(f"All retries exhausted: {e}")
                return fallback
```

---

## Conversation State Management

### Rules

1. OpenAI Realtime API maintains its own conversation context — do NOT re-send history
2. System prompt is sent once at session creation via `session.update`
3. Additional context (account info) injected at session start, not mid-conversation
4. Transcript is accumulated locally in the backend for storage — OpenAI handles context internally
5. If session disconnects mid-call, context is lost — start fresh or inform user
6. Server VAD handles turn detection — do NOT implement custom silence detection

### State Boundaries

```
┌─────────────────────────────────────────┐
│ OpenAI Realtime API (their state)       │
│ - Conversation history                  │
│ - Turn detection                        │
│ - Audio processing                      │
│ We do NOT manage this.                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Our Backend (our state)                 │
│ - Call status (idle/active/complete)    │
│ - Transcript copy (for storage/display) │
│ - Call metadata (started_at, call_id)   │
│ We OWN this.                            │
└─────────────────────────────────────────┘
```

---

## AI Error Handling

### Rules

1. OpenAI Realtime API errors come as `error` event type — always handle them
2. Distinguish between recoverable errors (reconnect) and fatal errors (inform user)
3. Audio processing errors (bad format) → log and skip the chunk, don't crash
4. Token limit errors → truncate input and retry once
5. All AI errors surface to the user with plain-language messages

### Error Classification

| Error Type | Action |
|-----------|--------|
| Connection refused | Retry 2x, then show "AI service unavailable" |
| Session timeout | Inform user, offer restart |
| Rate limit (429) | Wait and retry |
| Invalid audio format | Log warning, continue |
| Model overloaded | Retry with backoff |
| Auth failure (401) | Log critical, show "Configuration error" |
| Unknown error event | Log full payload, continue if possible |

### WebSocket Error Handling Pattern

```python
async def handle_openai_events(openai_ws, browser_ws, call_id: str):
    async for message in openai_ws:
        event = json.loads(message)
        event_type = event.get("type")

        if event_type == "error":
            error_msg = event.get("error", {}).get("message", "Unknown AI error")
            logger.error(f"OpenAI error for call={call_id}: {error_msg}")
            await browser_ws.send_json({
                "type": "error",
                "data": {"message": f"AI service error: {error_msg}"},
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "sequence": next_seq(),
            })
            # Don't break — some errors are non-fatal
            continue

        # Handle other event types...
```
