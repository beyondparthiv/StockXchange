# StockXchange — Price & News Engine

A standalone **Python FastAPI** microservice that owns all quant logic for the
game: procedural news generation, per-round price settlement, volatility/noise,
P&L and net-worth math, and Market Event Card effects.

It is kept deliberately separate from the Next.js web app because Python (NumPy /
Pandas) is the language actually used for pricing and quant logic in finance —
this gives the project a clean, resume-relevant "trading + news engine"
component.

## Phase 0 status

Only the service skeleton exists so far:

- `GET /` — banner with links
- `GET /health` — liveness probe returning status, version, Python version, timestamp
- `GET /docs` — auto-generated Swagger UI

The pricing and news algorithms arrive in Phase 6.

## Run locally

From the repo root:

```bash
cd price-engine

# create + activate a virtual environment
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt

# copy env template (optional for Phase 0)
cp .env.example .env

# start the server with auto-reload
uvicorn main:app --reload --port 8000
```

Then open:

- http://localhost:8000/health — should return `{"status":"ok", ...}`
- http://localhost:8000/docs — interactive Swagger UI

## Environment variables

See [`.env.example`](.env.example). `ALLOWED_ORIGINS` controls CORS; add your
deployed frontend URL there in production.
