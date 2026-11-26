# Free hosting (Render)
nLive: https://rescue-on-chip.onrender.com

The hosted site is one Render web service: FastAPI serves the API and the pre-built web app from `deploy/static`,
with a free Render PostgreSQL database. Everything is declared in `render.yaml`.

1. dashboard.render.com → sign in with GitHub → **New → Blueprint** → choose this repository → enter `INITIAL_ADMIN_EMAIL` → **Apply**.
2. Supabase → Authentication → URL Configuration: add the Render URL (e.g. `https://rescue-on-chip.onrender.com`) to
   *Site URL* / *Redirect URLs* so sign-up and password-reset emails link to the hosted site.
3. After UI changes: `powershell -File scripts\windows\build-deploy-static.ps1`, commit, push (Render redeploys automatically).

Free-plan limits: the service sleeps after ~15 min idle (first visit then takes ~1 min); 0.1 CPU, so calculations are
slower than locally; the free database expires after 30 days unless upgraded (export with `pg_dump` before then).
