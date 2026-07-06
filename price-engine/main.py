"""
StockXchange Price & News Engine
================================

A standalone FastAPI microservice that will own all quant logic for the game:
procedural news generation, per-round price settlement, volatility/noise, P&L
and net-worth math, and the Market Event Card effects.

Phase 0 scope: a health-check endpoint plus a root banner, wired with CORS so
the Next.js app can ping it from the browser or via a server route.

Run locally:
    cd price-engine
    python -m venv .venv
    .venv\\Scripts\\activate       # Windows
    source .venv/bin/activate      # macOS/Linux
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Interactive API docs (Swagger UI) are auto-served at http://localhost:8000/docs
"""

from __future__ import annotations

import os
import platform
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Package version — bumped as the engine grows. Surfaced by /health so the web
# app can confirm which engine build it is talking to.
ENGINE_VERSION = "0.1.0"

app = FastAPI(
    title="StockXchange Price & News Engine",
    description=(
        "Owns price-shock math, volatility, P&L, and the procedural "
        "news-generation algorithm for StockXchange."
    ),
    version=ENGINE_VERSION,
)

# CORS: allow the Next.js dev server and any origins listed in ALLOWED_ORIGINS
# (comma-separated) to call the engine directly from the browser. In production
# most calls go server-to-server via a Next route, but keeping this open in dev
# makes the Phase 0 ping test easy.
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """Shape of the /health payload the Next.js app consumes."""

    status: str
    service: str
    version: str
    python_version: str
    timestamp: str


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    """Human-friendly banner so hitting the base URL in a browser isn't a 404."""
    return {
        "service": "StockXchange Price & News Engine",
        "version": ENGINE_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    """Liveness probe. Returns 200 with basic runtime info when the engine is up."""
    return HealthResponse(
        status="ok",
        service="price-engine",
        version=ENGINE_VERSION,
        python_version=platform.python_version(),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
