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

## Auth setup (Phase 1)

The app runs without Supabase (you'll see "configure Supabase" notices). To
enable auth:

1. **Create a Supabase project** at [supabase.com](https://supabase.com). From
   **Project Settings → API**, copy the *Project URL* and the *anon public* key
   into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`),
   and the *service_role* key into `SUPABASE_SERVICE_ROLE_KEY`. Restart `npm run dev`.
2. **Run the schema.** Paste [`supabase/schema.sql`](supabase/schema.sql) into
   Supabase Studio → SQL Editor and run it. This creates `profiles` and the
   trigger that auto-creates a profile row on first login.
3. **Email/password** works immediately. For frictionless local testing, disable
   *"Confirm email"* under **Authentication → Providers → Email** (otherwise a
   confirmation email must be clicked before login).
4. **Google OAuth** — create OAuth credentials in Google Cloud Console, then
   under **Authentication → Providers → Google** paste the client ID/secret.
   Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI in Google Cloud.
5. **Phone OTP** — under **Authentication → Providers → Phone**, connect an SMS
   provider (e.g. Twilio) and enter its credentials. Without an SMS provider,
   phone login will return a provider error (expected).

Routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`. Any other
route redirects to `/login` when logged out (handled by `src/proxy.ts`).

## Project status

Built **phase by phase** — each phase is completed and verified before the next
begins.

- [x] **Phase 0** — Project scaffolding (Next.js + FastAPI + Supabase config, health ping)
- [x] **Phase 1** — Authentication (Google, phone OTP, email/password, forgot-password, profile on first login)
- [x] **Phase 2** — Home / mode selection (3 modes, per-mode config screen, How to Play rules + card reference)
- [x] **Phase 3** — Profile & settings (avatar upload, stats stubs, sound/theme/default-room prefs, light/dark, delete account)
- [x] **Phase 4** — Lobby & room system (room codes, join, ready-up, host start, Supabase Realtime sync)
- [x] **Phase 5** — Core game screen (market tiles, order panel, portfolio, wallet, news, card grid, day/round cycle)
- [x] **Phase 6** — Price & news engine (seeded settlement, imperfect signals, procedural news)
- [~] Phase 7 — Cards: player specials done (Insider Tip, Double Trade, Rewind, Quick Loan); market event cards outstanding
- [x] **Phase 8** — Bot AI (reads the same imperfect signals, buys, sells, shorts and covers)
- [x] **Phase 9** — Game end & final standings
- [ ] Phase 10 — Polish & deploy

## Licence

MIT — see [LICENSE](LICENSE).

The code is open. Note that game *mechanics* are not protectable by copyright
in any case; what this licence covers is the implementation.
