# Great Skills Platform

A monorepo for the Great Skills web presence and member network.

```
GreatSkills/
  apps/
    web/        Marketing site (React + Vite + Tailwind)      → greatskills.org
    portal/     Member portal SPA (React + Vite + Router)     → achievers.greatskills.org
  services/
    api/        FastAPI + PostgreSQL backend                  → api.greatskills.org
  infra/
    docker-compose.yml   Postgres + Redis + API, one command
```

The portal is a LinkedIn/Facebook-style network: members sign up, build a
profile, upload resumes, list skills and interests, connect with each other and
with industry/academia, and post or apply to opportunities (jobs, internships,
research, academic).

---

## Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- Docker (optional, only for the one-command backend)

---

## 1. Marketing site (`apps/web`)

```bash
cd apps/web
npm install          # first time only
npm run dev          # http://localhost:5173
npm run build        # production build → apps/web/dist
```

This is the site that replaces the current WordPress front page. All images are
local under `apps/web/public/assets`.

---

## 2. Backend API (`services/api`)

### Option A — Docker (Postgres + Redis + API together)

```bash
# from the repo root
docker compose -f infra/docker-compose.yml up --build
# API on http://localhost:8000  ·  interactive docs at http://localhost:8000/docs
```

This runs migrations automatically and serves with Gunicorn + Uvicorn workers.

### Option B — Local, zero setup (SQLite)

No database to install; it uses a local SQLite file.

```bash
cd services/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload      # http://localhost:8000
```

In development the API creates tables on startup and prints verification emails
to the console (no SMTP needed to test signups).

### Run the tests

```bash
cd services/api
source .venv/bin/activate
pytest -q                          # runs against in-memory SQLite
```

### Quick manual check

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret1","full_name":"Your Name","member_type":"student"}'
# → returns access_token + refresh_token
```

Full interactive API explorer: **http://localhost:8000/docs**

---

## 3. Member portal (`apps/portal`)

Start the API first (step 2), then:

```bash
cd apps/portal
npm install                        # first time only
cp .env.example .env               # points at http://localhost:8000
npm run dev                        # http://localhost:5174
```

Open http://localhost:5174, click **Create an account**, and you land in the
portal: dashboard, network search, opportunities, and a full profile editor
with avatar and resume upload.

---

## End-to-end local run (all three)

Three terminals:

```bash
# 1) API
cd services/api && source .venv/bin/activate && uvicorn app.main:app --reload

# 2) Portal
cd apps/portal && npm run dev

# 3) Marketing site
cd apps/web && npm run dev
```

- Marketing site → http://localhost:5173
- Member portal  → http://localhost:5174
- API + docs     → http://localhost:8000/docs

---

## Architecture notes

- **Auth:** JWT access + refresh tokens; Argon2 password hashing. The portal
  refreshes tokens transparently on 401.
- **Storage:** files (avatars, resumes) go through a `Storage` interface. Local
  disk today; swap to Cloudflare R2 / Backblaze B2 by adding one class, no route
  changes.
- **Migrations:** Alembic. `alembic revision --autogenerate -m "..."` after model
  changes, `alembic upgrade head` to apply. Docker runs this on startup.
- **Scaling:** the API is stateless. Scale by adding Uvicorn workers, then nodes
  behind a load balancer. Postgres holds the social graph and full-text search;
  add PgBouncer + a CDN in front as traffic grows.

## Deploying to the Hostinger VPS

Not wired up yet by design. When ready: Caddy (auto-TLS) reverses to the three
apps by subdomain, `docker compose up -d` runs Postgres + Redis + API, and the
two Vite apps build to static bundles Caddy serves. Deployment is an explicit,
separate step.
