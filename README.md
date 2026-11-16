# JalDrop — 20L water delivery marketplace (Mumbai)

Marketing website + API for a prepaid 20L drinking-water marketplace. Product plan: [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md).

- `frontend/` — Next.js 16 (App Router, Tailwind). Home, pricing, pincode checker, **order request**, **order tracking**, ops board (`/admin`), B2B, partner, FAQ.
- `backend/` — Python FastAPI + SQLite. Catalog, serviceability check, lead capture, and orders (place, track by code + phone, cancel, ops status updates).

## Run locally

```bash
# terminal 1 — API on :8000
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — site on :3000 (proxies /api/* to the API)
cd frontend && npm install && npm run dev
```

Orders: customers request jars at `/order` (no payment yet — ops confirm on WhatsApp and send a UPI link). Ops manage them at `/admin`, which needs `JALDROP_ADMIN_KEY` set when starting the API, e.g. `JALDROP_ADMIN_KEY=choose-a-secret .venv/bin/uvicorn app.main:app --port 8000`. Without it, admin endpoints are disabled.

Set `API_URL` (default `http://127.0.0.1:8000`) if the API runs elsewhere. Tests: `cd backend && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest`. Set `DATABASE_URL` to a Postgres URI to use Postgres instead of the local SQLite file.

## Deploy
See [DEPLOY.md](DEPLOY.md) — Vercel for the site and API, Supabase for the database.

## Design
Follows Apple-style design principles: system font, size-specific tracking, instant press feedback, translucent header, and reduced-motion / transparency / contrast support.

## Not built yet
Payments (Razorpay), WhatsApp notifications, customer login, rider app and automatic partner assignment — see Release 1 in the plan. Leads are stored in `backend/jaldrop.db` (git-ignored).
