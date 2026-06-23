# RecoverAi

AI-powered Revenue Recovery Command Center. The AI acts as the first point of contact for inbound collections calls — answering immediately, conducting natural intake conversations, and streaming live transcripts to an agent dashboard.

## What It Does

1. User clicks **Start Call**
2. AI agent answers and greets the caller
3. Natural voice conversation happens in real-time
4. Live transcript streams to the dashboard
5. Call ends, full transcript is preserved

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11+ |
| AI Voice | OpenAI Realtime API |
| Storage | In-memory (mock data) |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- OpenAI API key with Realtime API access

### Backend

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in Chrome.

## Environment Variables

Create `backend/.env`:

```
OPENAI_API_KEY=sk-your-key-here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

## Project Structure

```
ai-call-router/
├── frontend/          Next.js application
│   ├── src/app/       App Router pages
│   ├── src/components/  UI components (call, transcript)
│   ├── src/hooks/     Custom hooks (voice, audio, websocket)
│   ├── src/context/   React Context + reducer
│   ├── src/types/     Shared TypeScript types
│   └── src/lib/       Utilities and API client
├── backend/           FastAPI application
│   ├── app/api/       REST + WebSocket endpoints
│   ├── app/services/  Voice intake service (OpenAI Realtime)
│   ├── app/models/    Pydantic data models
│   ├── app/prompts/   AI system prompts
│   └── app/repositories/  In-memory data store
├── docs/              Sprint plan, architecture docs
└── .kiro/             Specs, steering, skills
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/calls | Create a new call |
| GET | /api/v1/calls/{id} | Get call state + transcript |
| POST | /api/v1/calls/{id}/end | End a call |
| WS | /ws/v1/call/{id} | Real-time voice + transcript |

## MVP Scope

- AI Voice Intake (real-time conversation)
- Live Transcript (streaming to dashboard)

## Not In Scope (Future)

- Intent Detection
- Opportunity Scoring
- Agent Handoff Summary
- Real telephony (Twilio)
- Production database
- Authentication

## License

Hackathon project — not licensed for production use.
