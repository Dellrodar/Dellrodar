# Grazioso Salvare Animal Shelter — Enhanced Application

**Author:** Emilio Crocco
**Course:** CS-499: Computer Science Capstone — Southern New Hampshire University

---

## About

This is the CS 499 enhancement of the CS 340 [`grazioso_animal_shelter_dashboard`](../grazioso_animal_shelter_dashboard)
artifact. The original was a Flask/Dash dashboard backed by MongoDB. This enhancement
modernizes it into a full-stack application:

- **Frontend:** React + TypeScript (Vite)
- **Backend:** FastAPI (Python, async)
- **Database:** PostgreSQL (SQLAlchemy 2.0 + Alembic migrations)

See [`documentation/CS499_Enhancement_Plan.md`](../documentation/CS499_Enhancement_Plan.md) for
the full six-week plan and [`documentation/ARCHITECTURE.md`](documentation/ARCHITECTURE.md) for
the layering and design decisions behind this codebase.

### Current scope: Weeks 2–3 (Software Design & Engineering)

This codebase currently implements the **Software Design and Engineering** enhancement only:
monorepo structure, the FastAPI/React scaffold, and a full authentication + role-based access
control (RBAC) vertical slice (signup, login, seeded admin, role-protected admin panel).

Animal search, rescue-profile matching (`pg_trgm` similarity scoring), and the full normalized
animal/lookup schema are **not implemented yet** — those are the Week 4 (Databases) and Week 5
(Algorithms) enhancements. The dashboard page reflects this honestly with a "coming soon" notice
rather than stubbed fake data.

---

## Roles

| Role   | Permissions |
|--------|-------------|
| Viewer | View dashboard (default role for new signups) |
| Staff  | Viewer permissions + animal management (added in a later enhancement) |
| Admin  | Staff permissions + user management via the Admin Panel |

---

## Getting Started

### Prerequisites

- Docker Desktop installed and running
- Python 3.11+ and Node.js 20+ (only needed if you run backend/frontend outside Docker)

### Option A: Docker Compose (recommended)

Runs PostgreSQL, the FastAPI backend, and the Vite dev server together. Source is bind-mounted
into both app containers, so edits on your machine hot-reload inside the containers — this is a
dev setup (`uvicorn --reload`, `vite --host`), not a production deployment.

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000` (interactive docs at `/docs`)
- The backend container runs `alembic upgrade head` and the idempotent admin-seed script on
  every startup, so the seeded admin (`admin@grazioso-shelter.dev` / `change-me` — change this
  before it's ever real) is always available.

Run the test suites inside the running containers:

```bash
docker compose exec backend pytest
docker compose exec frontend npm test
```

Stopping:

- `docker compose down` — stops all services (Postgres data preserved)
- `docker compose down -v` — stops all services and removes stored Postgres data

### Option B: Run backend/frontend locally, Postgres in Docker

Useful if you want a debugger attached directly to the process instead of the container.

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

copy ..\.env.example .env     # then edit values as needed

alembic upgrade head
python -m app.scripts.seed_admin

uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The app is served at `http://127.0.0.1:5173` and talks to the backend via
`VITE_API_BASE_URL` (see `frontend/.env.example`).

Running tests locally:

```bash
cd backend
pytest
```

```bash
cd frontend
npm test               # run once
npm run test:coverage  # run once with a v8 coverage report (text + HTML in frontend/coverage/)
```

Frontend tests use [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)
(`frontend/tests/`, mirroring `frontend/src/`). Components are tested through user-facing behavior
(rendered text, form submission, clicks via `@testing-library/user-event`) rather than
implementation details, with `AuthContext`/API modules mocked at the boundary so tests don't hit
the network.

---

## Linting & Formatting

**Frontend** ([Biome](https://biomejs.dev/), config in `frontend/biome.json`):

```bash
cd frontend
npm run lint      # lint only
npm run format    # format only, writes changes
npm run check     # lint + format + import sorting, writes changes
```

**Backend** ([ruff](https://docs.astral.sh/ruff/), config in `backend/pyproject.toml`):

```bash
cd backend
ruff check .            # lint
ruff check --fix .      # lint, auto-fixing what's safe to fix
ruff format .           # format
```

Or inside the running Docker container: `docker compose exec backend ruff check .`

---

## Contact

**Emilio Crocco**
emilio.crocco@snhu.edu
