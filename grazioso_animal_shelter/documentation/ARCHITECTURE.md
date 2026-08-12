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

## Data model (normalized)

```text
roles(id, name)                -- seeded: viewer, staff, admin
users(id, email, hashed_password, is_active, role_id -> roles.id, created_at)

animal_types(id, name)         -- lookup, unique names
animal_breeds(id, name)        -- lookup, unique names, GIN trigram index on name
animal_sexes(id, name)         -- lookup, unique names
outcome_types(id, name)        -- lookup, unique names

animals(id, animal_id, name, animal_type_id -> animal_types.id,
        breed_id -> animal_breeds.id, color, sex_id -> animal_sexes.id,
        date_of_birth, outcome_type_id -> outcome_types.id, outcome_subtype,
        outcome_datetime, age_upon_outcome_in_weeks, location_lat, location_long)

rescue_profiles(id, name, animal_type_id -> animal_types.id, preferred_sex,
                min_age_weeks, max_age_weeks)
rescue_profile_breeds(id, profile_id -> rescue_profiles.id, breed, weight)
```

This is the Databases enhancement. The original flat `animals` table (breed, type, sex, and
outcome as free-text columns mirroring the AAC CSV) was normalized **in place** by migration
`0004`: it creates the four lookup tables, backfills them with `INSERT ... SELECT DISTINCT` from
the existing rows, adds the FK columns, populates them with `UPDATE ... FROM` joins, tightens
`animal_type_id`/`breed_id` to `NOT NULL`, and only then drops the old text columns. The whole
migration is server-side SQL, so it upgrades a populated database without ever pulling rows into
Python, and its `downgrade()` fully reverses the transformation. One ordering subtlety: on a
fresh database migration `0003` seeds rescue profiles before any animals exist, so the
`animal_types` backfill unions distinct types from `rescue_profiles` as well as `animals`.

Normalization decisions and trade-offs:

- **What normalized:** breed, type, sex, and outcome — the four low-cardinality categorical
  columns that queries filter and join on. Foreign keys now guarantee referential integrity
  (a breed row cannot be deleted while animals reference it) and lookup names are unique.
- **What stayed text:** `color` holds multi-valued strings ("Black/White") and
  `outcome_subtype` is sparse and dependent on `outcome_type`; splitting either adds tables
  without a query or integrity payoff. `rescue_profile_breeds.breed` also stays text
  deliberately — it is a fuzzy *search term* for `pg_trgm` similarity, not a reference, and
  profile criteria may name breeds (e.g. "Chesapeake Bay Retriever") that never appear
  verbatim in the animal data. An FK would silently constrain the criteria vocabulary to
  whatever the CSV happened to contain.
- **API compatibility:** the SQLAlchemy models expose read-only `breed`/`animal_type`/
  `sex_upon_outcome`/`outcome_type` properties backed by eagerly joined lookup relationships,
  so Pydantic's `from_attributes` serialization — and therefore every API response shape and
  the entire frontend — is unchanged by the schema migration.
- **The importer** (`app/scripts/import_animals.py`) upserts lookup names with
  `INSERT ... ON CONFLICT DO NOTHING` and inserts animals carrying lookup ids. It still skips
  when animals exist and `--replace` deletes animal rows only; lookup rows persist and cannot
  duplicate.

The `rescue_profiles` / `rescue_profile_breeds` tables move the CS 340 rescue criteria (Water,
Mountain/Wilderness, Disaster tracking) out of hard-coded application logic and into data, seeded
by migration `0003`. Each profile breed carries a `weight` so individual breeds can be emphasized
without code changes. `animal_id` is indexed but not unique because the source data contains
animals with multiple outcome records.

## Rescue-profile matching algorithm

The Algorithms and Data Structures enhancement. `GET /rescue-profiles/{id}/matches` returns
candidates ranked by a 0–100 match score computed **in a single SQL query**
(`app/repositories/rescue_repository.py`):

```text
breed score        0–50   best pg_trgm similarity(animal's breed name, profile breed) x weight,
                          across all of the profile's preferred breeds
age score          0/20   age_upon_outcome_in_weeks within the profile's range
sex score          0/20   the animal's sex name equals the profile's preferred sex
availability score 0/10   outcome type is not Died / Euthanasia / Disposal
```

Design decisions and trade-offs:

- **Similarity scoring instead of exact filtering.** The original artifact filtered on exact breed
  strings, which silently drops candidates like "Labrador Retriever" vs "Labrador Retriever Mix".
  Trigram similarity (`pg_trgm`) gives partial credit for near-matches, which fits real shelter
  data full of mixes, abbreviations, and inconsistent breed descriptions.
- **Scoring in the database instead of application code.** Ranking and pagination happen in
  Postgres (`ORDER BY score DESC ... LIMIT/OFFSET`), so only one page of rows crosses the wire
  instead of every candidate being loaded into Python to sort. Since normalization, similarity
  is computed against `animal_breeds.name` (joined via `animals.breed_id`), and the GIN trigram
  index moved there with it (migration `0004`) — so `pg_trgm` runs over the few hundred distinct
  breed rows rather than all 10,000 animal rows. The trade-off is that the scoring expression
  lives in SQLAlchemy expression code rather than plain Python, which is harder to read —
  mitigated by building each score component in its own small, named function.
- **Soft ranking instead of hard filtering.** Animals failing a criterion lose points rather than
  being excluded, so staff can still see near-miss candidates (e.g. right breed, slightly too
  old). Only `animal_type` is a hard filter.
- **Score breakdown in the API response.** Each match returns its component scores
  (breed/age/sex/availability), so the ranking is explainable in the UI instead of a black box.

## Dashboard visuals (chart + map)

The dashboard restores the CS 340 artifact's chart and map alongside its table:

- **Breed distribution donut** (`frontend/src/components/BreedChart.tsx`) — a dependency-free
  SVG component. In search mode it is fed by `GET /animals/breed-summary`, a `GROUP BY breed_id`
  aggregate over the lookup join that honors the same `q`/`animal_type` filters as the table, so
  the chart covers the *whole* filtered set (not just the visible page) and refetches on new
  searches but not on page turns. Breeds beyond the top five fold into an "Other" bucket
  server-side. In rescue-profile mode the same endpoint is called with `profile_id`, which the
  backend resolves to the profile's animal type — the matcher's only hard filter — so the chart
  covers the full candidate pool and its total equals the match list's total. The five
  categorical colors are a colorblind-validated fixed-order palette with separate dark-mode
  steps; identity is never color-alone (every slice has a legend row with its count and
  percentage, plus a hover tooltip).
- **Location map** (`frontend/src/components/AnimalMap.tsx`) — `react-leaflet` with
  OpenStreetMap tiles, showing a circle marker per animal on the current page (breed as tooltip,
  name as popup, matching the original dash-leaflet behavior). Animals without coordinates are
  skipped. Clicking a table row highlights that row, enlarges its marker, and recenters the map
  on it; the selection resets on search, page, and profile changes.
- **Scope captions.** The two visuals cover different sets by design — the chart aggregates the
  full filtered set or candidate pool while the map plots only the current page — so each carries
  a caption stating its scope in both search and match mode.

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
