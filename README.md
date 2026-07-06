# StockXchange

A real-time, multiplayer **stock-trading simulation game**, inspired by the
classic Indian "Stock Exchange" board game and reimagined as a web app.

Players trade fictional companies across a series of **Days** (each with 2
trading **Rounds**). Every Day opens with a batch of news — some true, some
false — hinting at price moves. Buy, Sell, Short Sell, or Pass against your cash
wallet; prices settle at the end of each round. Highest net worth after the
final round wins.

## Architecture

Two services live in this one repository:

| Path | Service | Stack | Responsibility |
|------|---------|-------|----------------|
| `/` (root) | Web app | Next.js 16 (App Router) · TypeScript · Tailwind CSS · Zustand · Supabase | UI, auth, lobby/room realtime, game orchestration |
| `/price-engine` | Price & News Engine | Python · FastAPI · NumPy · Pandas | Procedural news generation, price settlement, P&L / net-worth math, event-card effects |

The pricing/quant logic is deliberately isolated in a Python microservice —
that's the language actually used for this kind of work in finance, and it keeps
a clean "trading + news engine" component.

**Backend services:** Supabase provides Postgres, Auth, and Realtime channels.
The Next.js app talks to the engine server-to-server via API routes (e.g.
`/api/engine/health`), so the engine URL stays server-only and there's no CORS
in the app's own path.

> Note: `create-next-app` now installs **Next.js 16** (the current stable), so
> this project uses 16 rather than the 15 named in the original spec. The App
> Router APIs used here are the same family; 16 is a strict superset.

## Prerequisites

- Node.js 18.18+ (tested on Node 24)
- Python 3.10+ (tested on Python 3.14)
- A Supabase project (needed from Phase 1 onward; not required for Phase 0)

## Running locally

You need **two terminals** — one per service.

### 1. Price & News Engine (Python)

```bash
cd price-engine
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify: http://localhost:8000/health returns `{"status":"ok", ...}` and
http://localhost:8000/docs shows Swagger UI.

### 2. Web app (Next.js)

```bash
# from the repo root
cp .env.example .env.local   # then fill in values (Supabase can wait until Phase 1)
npm install
npm run dev
```

Open http://localhost:3000. The home page is a **Phase 0 health dashboard**: it
shows the web app as online and pings the engine through `/api/engine/health`.
When both are running you'll see both cards green.

## Environment variables

| File | Used by | Key vars |
|------|---------|----------|
| `.env.local` (root) | Next.js | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PRICE_ENGINE_URL` |
| `price-engine/.env` | FastAPI | `ALLOWED_ORIGINS`, `PORT` |

Templates: [`.env.example`](.env.example) and
[`price-engine/.env.example`](price-engine/.env.example).

## Database

The Postgres schema is tracked in [`supabase/schema.sql`](supabase/schema.sql).
Paste it into the Supabase SQL editor to provision tables. It grows one section
per phase.

## Project status

Built **phase by phase** — each phase is completed and verified before the next
begins.

- [x] **Phase 0** — Project scaffolding (Next.js + FastAPI + Supabase config, health ping)
- [ ] Phase 1 — Authentication
- [ ] Phase 2 — Home / mode selection
- [ ] Phase 3 — Profile & settings
- [ ] Phase 4 — Lobby & room system
- [ ] Phase 5 — Core game screen
- [ ] Phase 6 — Price & news engine logic
- [ ] Phase 7 — Market event & player special cards
- [ ] Phase 8 — Bot AI
- [ ] Phase 9 — Game end, results, leaderboard
- [ ] Phase 10 — Polish & deploy
