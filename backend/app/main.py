"""RecoverAi FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.ws.call_session import call_session_handler
from app.config import get_settings

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

settings = get_settings()

app = FastAPI(title="RecoverAi API", version="0.1.0")

# CORS — allow frontend localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routes
app.include_router(api_router, prefix="/api/v1")

# WebSocket route
app.add_api_websocket_route("/ws/v1/call/{call_id}", call_session_handler)
