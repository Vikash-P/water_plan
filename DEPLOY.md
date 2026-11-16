# Deploying JalDrop (Vercel + Supabase)

Two Vercel projects from this one repo, plus a Supabase Postgres database:

| Piece | Where | Vercel "Root Directory" |
|---|---|---|
| Database | Supabase (Postgres) | — |
| Python API (FastAPI) | Vercel | `backend` |
| Website (Next.js) | Vercel | `frontend` |

## 1. Supabase (database)
1. Create a project at supabase.com. Save the database password.
2. Project → **Connect** → **Transaction pooler** → copy the URI (port **6543**). Replace `[YOUR-PASSWORD]` with your password.
   Use the pooler, not the direct connection: serverless functions open many short connections.
3. Nothing else to do. The API creates its `leads` and `orders` tables on first start and turns on row-level
   security so the public Supabase API key cannot read customer phones or addresses.

## 2. API on Vercel
1. vercel.com → **Add New → Project** → import `Vikash-P/water_plan`.
2. Set **Root Directory** to `backend`. Framework preset: FastAPI/Python (auto-detected from `index.py`).
3. Environment variables:
   - `DATABASE_URL` — the Supabase pooler URI from step 1
   - `JALDROP_ADMIN_KEY` — a long random secret (this is the password for `/admin`)
4. Deploy, then open `https://<api-project>.vercel.app/api/health` — it should return `{"ok":true}`.

## 3. Website on Vercel
1. **Add New → Project** → import the same repo again.
2. **Root Directory** = `frontend`. Framework: Next.js.
3. Environment variable: `API_URL` = the API project's URL from step 2, e.g. `https://jaldrop-api.vercel.app` (no trailing slash).
   It is read at build time, so redeploy the website if the API URL ever changes.
4. Deploy. Open the site, check a pincode, place a test order, then open `/admin` with your admin key.

## Notes
- Keep `JALDROP_ADMIN_KEY` and `DATABASE_URL` only in Vercel's environment settings. Never commit them.
- Test orders you place go into the real database; delete them in the Supabase table editor before launch.
- Local development still uses a SQLite file when `DATABASE_URL` is not set.
