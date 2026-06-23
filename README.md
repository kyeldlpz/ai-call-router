# RecoverAi — AI-Powered Revenue Recovery Command Center

RecoverAi intercepts inbound debtor calls, conducts intelligent intake conversations via AI, and delivers real-time intelligence to human agents before they ever pick up the phone.

## What It Does

1. **AI Voice Intake** — AI answers the call instantly, conducts a natural intake conversation
2. **Live Transcript** — Words stream to the agent dashboard in real-time as the caller speaks
3. **Intent Detection** — Classifies caller intent mid-conversation (payment, dispute, hardship, settlement, etc.)
4. **Opportunity Scoring** — Scores recovery opportunity (high/medium/low) based on detected signals
5. **Agent Handoff Summary** — Generates a structured briefing with caller info, intent, score, and recommended action

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| AI | Ollama (local LLM — qwen2.5:7b or llama3) |
| Voice STT | Browser Web Speech API (Chrome/Edge) |
| Voice TTS | Browser SpeechSynthesis API |
| Realtime | WebSocket (native browser API ↔ FastAPI) |
| Storage | In-memory (mock data for demo) |

**Cost: $0** — everything runs locally on your machine.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Ollama](https://ollama.ai) with a model pulled (`ollama pull qwen2.5:7b`)
- Chrome or Edge browser

### 1. Start Ollama

```bash
ollama serve
```

### 2. Start Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome or Edge.

**Agent behavior settings** use `GET /api/v1/agent-config`. If Mission Control shows a config error, restart the backend so it picks up the latest routes (`uvicorn` with `--reload`).

## Documentation

- [Setup Guide](docs/setup.md) — Detailed setup instructions and troubleshooting
- [Hooks Architecture](docs/hooks-architecture.md) — Agent hook design
- [Testing Strategy](docs/testing-strategy.md) — Testing approach

## Project Structure

```
ai-call-router/
├── frontend/          # Next.js dashboard application
├── backend/           # FastAPI backend with Ollama AI services
├── docs/              # Documentation
└── .kiro/             # Kiro steering and specs
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/agent-config` | Global agent prompt configuration |
| PUT | `/api/v1/agent-config` | Update agent prompt configuration |
| POST | `/api/v1/agent-config/reset` | Reset agent config to default preset |
| POST | `/api/v1/calls` | Start a new call |
| GET | `/api/v1/calls/{call_id}` | Get call details |
| WS | `/ws/v1/call/{call_id}` | Real-time call session |

## How the Voice Works

```
Your voice → Browser Speech Recognition (STT) → text
text → WebSocket → FastAPI → Ollama (generates reply)
reply text → WebSocket → Browser Speech Synthesis (TTS) → AI speaks
```

No cloud APIs needed for the voice pipeline. Ollama runs the LLM locally.

## License

Private — Hackathon project.
