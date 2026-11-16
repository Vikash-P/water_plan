# JalDrop — 20L water delivery marketplace (Mumbai)

Marketing website + API for a prepaid 20L drinking-water marketplace. Product plan: [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md).

- `frontend/` — Next.js 16 (App Router, Tailwind). Home, pricing, pincode checker, B2B, partner, FAQ.
- `backend/` — Python FastAPI + SQLite. Catalog, serviceability check, lead capture (`waitlist | b2b | partner`).

## Run locally

```bash
# terminal 1 — API on :8000
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — site on :3000 (proxies /api/* to the API)
cd frontend && npm install && npm run dev
```

Set `API_URL` (default `http://127.0.0.1:8000`) if the API runs elsewhere. Tests: `cd backend && .venv/bin/pytest`.

## Design
Follows Apple-style design principles: system font, size-specific tracking, instant press feedback, translucent header, and reduced-motion / transparency / contrast support.

## Not built yet
Ordering, payments (Razorpay), WhatsApp, rider app and admin dashboard — see Release 1 in the plan. Leads are stored in `backend/jaldrop.db` (git-ignored).
