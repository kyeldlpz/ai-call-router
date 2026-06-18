# RecoverAi — Product Steering Document

## Product Vision

RecoverAi is an AI-powered Revenue Recovery Command Center that intercepts inbound debtor calls, conducts intelligent intake conversations, and delivers real-time intelligence to human agents before they ever pick up the phone.

The AI is not a chatbot. It is not an IVR. It is a trained collections intake specialist that understands intent, detects settlement opportunities, and produces actionable briefings in seconds.

## Problem Statement

Collections organizations hemorrhage recoverable revenue because:

- Inbound calls go unanswered or are routed blindly
- Agents answer calls with zero context about the caller's situation or intent
- Disposition codes are applied manually and inconsistently
- Settlement opportunities are missed because agents lack real-time scoring
- Call volume exceeds agent capacity, creating abandoned calls and lost revenue

The result: every missed or poorly handled inbound call is lost revenue that was walking in the door.

## Target Users

**Primary:** Collections team supervisors and managers who need visibility into call outcomes and recovery opportunities.

**Secondary:** Collections agents who need pre-call intelligence and post-call documentation.

**Tertiary:** Hackathon judges who need to see a compelling end-to-end demo of AI-augmented collections.

## Core User Journey

1. Debtor calls in (simulated via browser microphone)
2. AI answers immediately — no hold, no IVR tree
3. AI conducts natural intake conversation (identifies who they are, why they're calling, what they want)
4. Live transcript streams to the agent dashboard in real-time
5. System detects intent (payment inquiry, dispute, hardship, settlement offer, etc.)
6. System scores the recovery opportunity (high/medium/low)
7. Agent receives a structured handoff summary: who called, what they want, recommended action, opportunity score
8. Agent can review, accept, or escalate

## What Makes This Different

This is NOT:
- A voicebot that reads scripts
- A simple transcription service
- A call routing IVR
- A chatbot with a phone number

This IS:
- An AI that conducts genuine intake conversations
- A real-time intelligence layer that scores opportunities as the call happens
- A system that produces structured, actionable agent briefings
- A demonstration that AI can be the first 60 seconds of every collections call

## Why ChatGPT Alone Cannot Replace It

ChatGPT can transcribe. ChatGPT can summarize. But ChatGPT cannot:

- Answer a phone call in real-time with sub-second latency
- Conduct a live voice conversation with a debtor
- Stream a transcript to a dashboard while the call is happening
- Score recovery opportunity in real-time based on conversation signals
- Produce a structured handoff summary formatted for collections workflows
- Integrate voice, transcription, intent detection, and scoring into a single real-time pipeline

RecoverAi is a system, not a prompt.

## Demo Story

> "Watch what happens when a debtor calls in. The AI answers in under one second. It asks clarifying questions. It identifies that this person wants to settle their $4,200 balance. It scores this as a high-value recovery opportunity. And before our agent even picks up the phone, they have a complete briefing: who called, what they want, and a recommended next action. That's 60 seconds of AI intake replacing 5 minutes of agent discovery."

## Wow Moments

1. **Instant answer** — AI picks up in under 1 second, no IVR
2. **Live transcript streaming** — Words appear on the dashboard as the debtor speaks
3. **Real-time intent badge** — Intent classification appears mid-conversation
4. **Opportunity score animation** — Score calculates and displays as signals are detected
5. **Handoff summary generation** — Structured briefing materializes when call ends

## Features In Scope (MVP)

| # | Feature | Description |
|---|---------|-------------|
| 1 | AI Voice Intake | AI answers inbound call, conducts intake conversation via OpenAI Realtime API |
| 2 | Live Transcript | Real-time transcription streams to agent dashboard during the call |
| 3 | Intent Detection | System classifies caller intent from conversation (payment, dispute, hardship, settlement, info request) |
| 4 | Opportunity Scoring | System scores recovery opportunity (high/medium/low) based on detected signals |
| 5 | Agent Handoff Summary | Structured briefing generated for the agent with caller info, intent, score, and recommended action |

## Features Explicitly Out of Scope

- Real telephony integration (Twilio, etc.)
- Real customer data or PII
- Multi-language support
- Agent response or outbound calling
- CRM integration
- Payment processing
- Compliance recording
- Historical analytics
- Multi-call session tracking
- Authentication or identity verification against real systems
- Production security hardening

## Hackathon Success Criteria

1. End-to-end demo completes without errors in under 3 minutes
2. AI voice intake sounds natural and contextually appropriate
3. Transcript appears in real-time with less than 2 second lag
4. Intent is correctly classified for at least 3 different call scenarios
5. Opportunity score is generated and visually compelling
6. Handoff summary is structured, readable, and actionable
7. The dashboard looks polished (not a prototype wireframe)

## Judge Experience Goals

Judges should feel:
- "This is the future of collections operations"
- "This would save my team hours per day"
- "The AI actually understands what the caller wants"
- "I can see exactly how this creates revenue"

Judges should NOT feel:
- "This is just a wrapper around ChatGPT"
- "This is a science project with no business value"
- "I don't understand what's happening"
- "This looks unfinished"
