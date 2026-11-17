# Deploying WaterMart (Vercel + Supabase)

One Vercel project with two services (see `vercel.json`) plus a Supabase Postgres database:

| Service | Folder | Public path | Notes |
|---|---|---|---|
| `frontend` | `frontend` (Next.js) | `/(.*)` | Reads the API's address from the injected `BACKEND_URL` (binding) |
| `backend` | `backend` (FastAPI) | `/api/(.*)` | Needs `DATABASE_URL` and `JALDROP_ADMIN_KEY` |

The browser only ever talks to one domain: `/api/*` goes to the backend, everything else to the website.

## 1. Supabase (database)
1. Create a project at supabase.com. Save the database password.
2. Project → **Connect** → **Transaction pooler** → copy the URI (port **6543**), replacing `[YOUR-PASSWORD]`.
   Use the pooler, not the direct connection: serverless functions open many short connections.
3. The API creates its `leads` and `orders` tables on first start and turns on row-level security so the
   public Supabase key cannot read customer phones or addresses.

## 2. Vercel
1. vercel.com → **Add New → Project** → import `Vikash-P/water_plan`. Leave Root Directory empty (repo root);
   Vercel reads the services from `vercel.json`.
2. Environment variables (Project → Settings → Environment Variables):
   - `DATABASE_URL` — the Supabase pooler URI
   - `JALDROP_ADMIN_KEY` — a long random secret (the password for `/admin`)
3. Deploy. Then check `https://<your-domain>/api/health` returns `{"ok":true}`, open the site, check a pincode,
   place a test order, and open `/admin` with your admin key.

## Notes
- Keep `DATABASE_URL` and `JALDROP_ADMIN_KEY` only in Vercel's environment settings. Never commit them.
- Test orders go into the real database; delete them in the Supabase table editor before launch.
- Local development still uses a SQLite file when `DATABASE_URL` is not set.
