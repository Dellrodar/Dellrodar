# Deployment Plan

Vercel hosts both services from `grazioso_animal_shelter/vercel.json` — the Vite
frontend at `/` and the FastAPI backend behind `/api`. The database is Neon free-tier
Postgres. Phase 2 adds an AWS Lambda migration runner as a portfolio piece.

Real connection strings (with password) live as comments in the root `.env`, which is
gitignored. Never paste them into this file or anything under `docs/`.

## Neon endpoints

- Project host: `ep-gentle-snow-axjivv0v.c-4.us-east-2.aws.neon.tech` (direct)
- Pooler host: `ep-gentle-snow-axjivv0v-pooler.c-4.us-east-2.aws.neon.tech`
- Database `neondb`, role `neondb_owner`, region us-east-2

The app uses SQLAlchemy's asyncpg driver, which rejects Neon's default
`?sslmode=require&channel_binding=require` params — use `?ssl=require` instead:

- App (Vercel, pooled): `postgresql+asyncpg://neondb_owner:<password>@ep-gentle-snow-axjivv0v-pooler.c-4.us-east-2.aws.neon.tech/neondb?ssl=require`
- Migrations (direct): `postgresql+asyncpg://neondb_owner:<password>@ep-gentle-snow-axjivv0v.c-4.us-east-2.aws.neon.tech/neondb?ssl=require`

The app goes through the pooler because serverless functions open many short-lived
connections. Migrations use the direct endpoint per Neon's recommendation — Alembic
holds session-level locks that connection pooling can interfere with.

## Phase 1 — hosting and first migration

- [x] Push the vercel.json entrypoint fix and pyproject `[project]` table fix; confirm the Vercel build goes green
- [x] Set Vercel env vars (Settings → Environment Variables): `DATABASE_URL` (pooled string above), `JWT_SECRET` (fresh value), `ADMIN_PASSWORD` (fresh value)
- [x] Run first migration locally against Neon — all four revisions applied 2026-08-08
- [x] Seed admin account and import 10000 animal records — done 2026-08-08
- [x] Verify live site end to end — health, login, and animals list confirmed against https://dellrodar.vercel.app

Note: the live admin login is `admin@grazioso-shelter.dev` with the `ADMIN_PASSWORD`
from the root `.env` — login verifies against the seeded database hash, not the
Vercel env var. Reseed or update the user row to change it.

## Phase 2 — AWS Lambda migration runner

Artifacts live in `grazioso_animal_shelter/backend/`:

- `lambda_migrate.py` — handler wrapping Alembic's Python API; event supports
  `{"action": "upgrade" | "downgrade" | "stamp", "revision": "<target>"}`,
  defaults to upgrade to head, and returns before/after revision
- `Dockerfile.lambda` — container image from `public.ecr.aws/lambda/python:3.12`
  carrying `alembic.ini`, `alembic/`, `app/`, and the handler
- `deploy_lambda.ps1` — idempotent deploy of the whole stack in us-east-2 —
  Secrets Manager secret `grazioso/database-url`, ECR repo, IAM role with
  `GetSecretValue` scoped to the one secret plus basic logging, and the function

`DATABASE_URL` is read from Secrets Manager at cold start using the direct Neon
URL — `alembic/env.py` uses the async engine, so the same asyncpg-style URL as
local migrations. Cost is ~$0.40/mo for the secret plus pennies per invocation.

- [x] Write handler, Dockerfile, and deploy script
- [x] Local sanity check — handler's revision query returns 0004 against Neon
- [x] Configure AWS credentials
- [x] First deploy — stack live in account 363454423518, us-east-2, deployed 2026-08-08
- [x] Test invoke with empty payload — returned before 0004, after 0004 as expected
- [ ] Stretch: Vercel deploy webhook → Lambda Function URL so migrations run on deploy
- [ ] Stretch: port deploy_lambda.ps1 to Terraform — ECR repo, secret, IAM role, and
  function as declared resources, with the image build/push kept as a script step

Windows deploy gotchas baked into the script — a PowerShell 5.1 pipe corrupts the
ECR login token so the login runs through cmd, and docker provenance/sbom
attestations are disabled because a manifest list is rejected by Lambda.
