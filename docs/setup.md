# RecoverAi — Setup Guide

## Prerequisites

- **Node.js** 18+ and **npm** (for the frontend)
- **Python** 3.11+ (for the backend)
- **Ollama** installed and running locally with a model pulled
- **Chrome or Edge** browser (required for Web Speech API)

---

## Ollama Setup

Install Ollama if you haven't already: https://ollama.ai

```bash
# Pull the model (qwen2.5:7b is the default, works well for conversation)
ollama pull qwen2.5:7b

# Make sure Ollama is running
ollama serve
```

You can also use `llama3` if you prefer:

```bash
ollama pull llama3
```

Then set `OLLAMA_MODEL=llama3` in your `.env`.

---

## Backend Setup

```bash
cd backend
```

### 1. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

The defaults work out of the box if Ollama is running locally. Edit `.env` if you need to change the model:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 4. Run the backend

```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. Health check: `GET http://localhost:8000/api/v1/health`.

---

## Frontend Setup

```bash
cd frontend
```

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

## Running Everything Together

You need three things running:

**Terminal 1 — Ollama:**

```bash
ollama serve
```

**Terminal 2 — Backend:**

```bash
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3 — Frontend:**

```bash
cd frontend
npm run dev
```

Then open `http://localhost:3000` in **Chrome** or **Edge** (required for speech recognition).

---

## How It Works

1. You click "Start Call" and allow microphone access
2. Your voice is converted to text using the browser's built-in Speech Recognition API
3. The text is sent via WebSocket to the backend
4. The backend sends the text to Ollama, which generates a conversational response
5. The response text comes back to the browser via WebSocket
6. The browser speaks the response aloud using the Speech Synthesis API (TTS)
7. The live transcript shows up on the dashboard in real-time

**Cost: $0.** Everything runs locally.

---

## Verifying the Setup

1. **Ollama running:** `curl http://localhost:11434/api/tags` — should list your models
2. **Backend health check:** Visit `http://localhost:8000/api/v1/health` — should return success
3. **Frontend loads:** Visit `http://localhost:3000` — the dashboard should render
4. **Speech works:** Click "Start Call" — you should hear the AI greet you

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Model to use for conversation | `qwen2.5:7b` |
| `OPENROUTER_API_KEY` | OpenRouter key (optional, for better quality) | (empty) |
| `OPENROUTER_MODEL` | OpenRouter model (optional) | `meta-llama/llama-3-8b-instruct:free` |
| `BACKEND_HOST` | Host address for the backend server | `0.0.0.0` |
| `BACKEND_PORT` | Port for the backend server | `8000` |
| `FRONTEND_URL` | Frontend URL for CORS configuration | `http://localhost:3000` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot connect to Ollama` | Run `ollama serve` in a separate terminal |
| Speech recognition not working | Use Chrome or Edge. Safari/Firefox don't support it. |
| No sound from AI | Check browser isn't muting the tab. Allow audio autoplay. |
| `ModuleNotFoundError` on backend start | Ensure venv is activated and use `python -m uvicorn` |
| Slow responses | `qwen2.5:7b` needs ~4-8GB RAM. Try `llama3` if it's faster on your machine. |
| Frontend can't reach backend | Confirm backend is running on port 8000 |
