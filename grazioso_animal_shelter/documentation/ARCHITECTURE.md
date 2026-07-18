# Architecture

## Layering

```text
React Frontend (Vite + TypeScript)
    |  fetch, bearer token
    v
FastAPI Backend (app/api/routes)
    |  Pydantic request/response schemas, RBAC dependencies
    v
Service Layer (app/services)
    |  business logic, no ORM/session details
    v
Repository / Data Access Layer (app/repositories)
    |  SQLAlchemy queries
    v
PostgreSQL (via Alembic-managed schema)
```

Each layer only talks to the one directly below it:

- **Routes** validate input via Pydantic schemas, enforce authentication/authorization via
  FastAPI dependencies (`app/api/deps.py`), and translate service-layer exceptions into HTTP
  responses. They contain no business logic or SQL.
- **Services** (`app/services/`) hold business rules — e.g. "signup assigns the viewer role",
  "login rejects disabled accounts" — and raise domain exceptions instead of HTTP exceptions,
  keeping them framework-agnostic and easy to unit test.
- **Repositories** (`app/repositories/`) are the only layer that imports SQLAlchemy models and
  issues queries. This keeps ORM concerns out of business logic and out of route handlers.

This separation is the core Week 2/3 "Software Design and Engineering" deliverable: it replaces
the CS 340 artifact's tightly coupled Dash-callback-does-everything structure with distinct,
independently testable layers.

## Authentication & Authorization

- **Password storage:** `bcrypt` (via the `bcrypt` package directly, not `passlib`, to avoid
  passlib's bcrypt-backend version-pinning issues).
- **Session model:** stateless JWT bearer tokens (`app/core/security.py`). The token payload
  carries `sub` (user id) and `role`; no server-side session store is required.
- **Token storage on the frontend:** kept in `localStorage` via `AuthContext`. This is the
  simplest fit for a bearer-token SPA. Trade-off: `localStorage` is readable by any script on the
  page, so it is more exposed to XSS than an httpOnly cookie would be. For this capstone's scope,
  the mitigation is standard React output escaping (no `dangerouslySetInnerHTML` anywhere in the
  app) rather than a cookie-based session, which would add CSRF-protection complexity for little
  benefit in a same-origin SPA + API pair.
- **Authorization:** `require_role(*roles)` in `app/api/deps.py` is a dependency factory composed
  with `get_current_user`. Protected routes declare their required role directly in the route
  decorator (e.g. the entire `admin` router requires `role=admin`), so permission requirements are
  visible at the route definition instead of buried inside handler bodies.

## Data model (current)

Only the authentication-related tables exist so far:

```text
roles(id, name)                -- seeded: viewer, staff, admin
users(id, email, hashed_password, is_active, role_id -> roles.id, created_at)
```

Week 4 (Databases enhancement) extends this same Alembic migration chain with the normalized
animal/lookup/rescue-profile tables described in `../../documentation/CS499_Enhancement_Plan.md`.
Week 5 (Algorithms enhancement) builds the `pg_trgm`-based rescue-profile matching and scoring on
top of that schema. Neither exists yet in this codebase — the dashboard page says so explicitly
rather than presenting placeholder data as if it were real.

## Deployment scope

PostgreSQL, the backend, and the frontend all run via `docker-compose.yml` for local development.
This is a **dev-mode** setup, not a production deployment: the backend and frontend directories
are bind-mounted into their containers so `uvicorn --reload` and the Vite dev server pick up local
edits immediately, and the backend image installs dependencies into the system Python rather than
building a distributable artifact. The backend container runs `alembic upgrade head` and the
idempotent admin-seed script on every startup.

Production-style packaging (multi-stage builds, a static frontend build served by something like
nginx, no reload, orchestration/CI-CD) is still out of scope — it's an explicitly deferred stretch
item per the enhancement plan's scope boundaries. Running locally without Docker (a Python venv
and `npm run dev` directly against a Dockerized Postgres) remains supported and documented in the
top-level README, since it's occasionally useful to attach a debugger directly to the process.
