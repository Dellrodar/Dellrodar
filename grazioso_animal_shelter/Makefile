# Dev workflow shortcuts for the docker compose stack.
# Containers: cs499-postgres, cs499-backend, cs499-frontend

COMPOSE = docker compose

.PHONY: start stop restart rebuild logs test test-backend test-frontend lint-backend lint-frontend

start:
	$(COMPOSE) up -d

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

# Rebuild images and recreate containers, picking up dependency changes.
# Anonymous volumes are renewed so node_modules and .venv come fresh from
# the image; the named postgres-data volume is untouched.
rebuild:
	$(COMPOSE) build
	$(COMPOSE) up -d --force-recreate --renew-anon-volumes

logs:
	$(COMPOSE) logs -f --tail 50

test: test-backend test-frontend

# Verbosity and coverage flags live in backend/pytest.ini addopts.
test-backend:
	docker exec cs499-backend python -m pytest tests

test-frontend:
	docker exec cs499-frontend npm test

lint-backend:
	docker exec cs499-backend ruff check app alembic tests
	docker exec cs499-backend pylint app

lint-frontend:
	docker exec cs499-frontend npm run lint
