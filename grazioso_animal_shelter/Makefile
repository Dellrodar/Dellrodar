# Dev workflow shortcuts for the docker compose stack.
# Containers: cs499-postgres, cs499-backend, cs499-frontend

COMPOSE = docker compose

# Deployed migration runner, managed by /infrastructure.
MIGRATION_LAMBDA = grazioso-migration-runner
AWS_REGION = us-east-2

.PHONY: start stop restart rebuild logs test test-backend test-frontend lint-backend lint-frontend migrate-deployed

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

# Runs alembic upgrade head against the deployed database by invoking the
# migration Lambda (see /infrastructure). Deploy new migration code first.
# The outfile is - so the CLI streams the response to stdout on any OS. The
# response JSON reports the action, target, and the revision before and after.
migrate-deployed:
	@echo Running alembic upgrade head via $(MIGRATION_LAMBDA) in $(AWS_REGION)
	aws lambda invoke --function-name $(MIGRATION_LAMBDA) --region $(AWS_REGION) --cli-binary-format raw-in-base64-out --payload '{}' -
