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

```text
roles(id, name)                -- seeded: viewer, staff, admin
users(id, email, hashed_password, is_active, role_id -> roles.id, created_at)

animals(id, animal_id, name, animal_type, breed, color, sex_upon_outcome,
        date_of_birth, outcome_type, outcome_subtype, outcome_datetime,
        age_upon_outcome_in_weeks, location_lat, location_long)

rescue_profiles(id, name, animal_type, preferred_sex, min_age_weeks, max_age_weeks)
rescue_profile_breeds(id, profile_id -> rescue_profiles.id, breed, weight)
```

The `animals` table is intentionally **flat** for now — breed, type, and sex are plain columns
matching the shape of the AAC source CSV (`backend/data/aac_shelter_outcomes.csv`, imported by
`app/scripts/import_animals.py`). Normalizing those columns into lookup tables
(`animal_breeds`, `animal_types`, ...) is the Databases enhancement and will extend this same
Alembic migration chain. `animal_id` is indexed but not unique because the source data contains
animals with multiple outcome records.

The `rescue_profiles` / `rescue_profile_breeds` tables move the CS 340 rescue criteria (Water,
Mountain/Wilderness, Disaster tracking) out of hard-coded application logic and into data, seeded
by migration `0003`. Each profile breed carries a `weight` so individual breeds can be emphasized
without code changes.

## Rescue-profile matching algorithm

The Algorithms and Data Structures enhancement. `GET /rescue-profiles/{id}/matches` returns
candidates ranked by a 0–100 match score computed **in a single SQL query**
(`app/repositories/rescue_repository.py`):

```text
breed score        0–50   best pg_trgm similarity(animal.breed, profile breed) x weight,
                          across all of the profile's preferred breeds
age score          0/20   age_upon_outcome_in_weeks within the profile's range
sex score          0/20   sex_upon_outcome equals the profile's preferred sex
availability score 0/10   outcome_type is not Died / Euthanasia / Disposal
```

Design decisions and trade-offs:

- **Similarity scoring instead of exact filtering.** The original artifact filtered on exact breed
  strings, which silently drops candidates like "Labrador Retriever" vs "Labrador Retriever Mix".
  Trigram similarity (`pg_trgm`) gives partial credit for near-matches, which fits real shelter
  data full of mixes, abbreviations, and inconsistent breed descriptions.
- **Scoring in the database instead of application code.** Ranking and pagination happen in
  Postgres (`ORDER BY score DESC ... LIMIT/OFFSET`), so only one page of rows crosses the wire
  instead of every candidate being loaded into Python to sort. A GIN trigram index on
  `animals.breed` (migration `0002`) keeps the similarity computation indexable as data grows.
  The trade-off is that the scoring expression lives in SQLAlchemy expression code rather than
  plain Python, which is harder to read — mitigated by building each score component in its own
  small, named function.
- **Soft ranking instead of hard filtering.** Animals failing a criterion lose points rather than
  being excluded, so staff can still see near-miss candidates (e.g. right breed, slightly too
  old). Only `animal_type` is a hard filter.
- **Score breakdown in the API response.** Each match returns its component scores
  (breed/age/sex/availability), so the ranking is explainable in the UI instead of a black box.

## Deployment scope

PostgreSQL, the backend, and the frontend all run via `docker-compose.yml` for local development.
This is a **dev-mode** setup, not a production deployment: the backend and frontend directories
are bind-mounted into their containers so `uvicorn --reload` and the Vite dev server pick up local
edits immediately, and the backend image installs dependencies into the system Python rather than
building a distributable artifact. The backend container runs `alembic upgrade head`, the
idempotent admin-seed script, and the idempotent animal-data import on every startup.

Production-style packaging (multi-stage builds, a static frontend build served by something like
nginx, no reload, orchestration/CI-CD) is still out of scope — it's an explicitly deferred stretch
item per the enhancement plan's scope boundaries. Running locally without Docker (a Python venv
and `npm run dev` directly against a Dockerized Postgres) remains supported and documented in the
top-level README, since it's occasionally useful to attach a debugger directly to the process.
