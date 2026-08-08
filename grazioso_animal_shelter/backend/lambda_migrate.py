"""AWS Lambda handler that runs Alembic migrations against the shelter database.

Packaged as a container image (see Dockerfile.lambda) carrying alembic.ini,
alembic/, and app/ so migrations run exactly as they do locally. DATABASE_URL
is read from Secrets Manager at cold start; the secret ARN is passed via the
DATABASE_URL_SECRET_ARN environment variable.

Event shape (all keys optional):

    {"action": "upgrade" | "downgrade" | "stamp", "revision": "<target>"}

Defaults to upgrading to head. Downgrade requires an explicit revision; stamp
records the target revision without running migrations. Returns the alembic
revision before and after the run.
"""

import asyncio
import os

# Settings validates these at import time inside alembic/env.py, but only
# database_url is used by migrations.
os.environ.setdefault("JWT_SECRET", "unused-by-migration-runner")
os.environ.setdefault("ADMIN_PASSWORD", "unused-by-migration-runner")

import boto3
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import create_async_engine

_database_url: str | None = None


def _load_database_url() -> str:
    global _database_url
    if _database_url is None:
        secret_arn = os.environ["DATABASE_URL_SECRET_ARN"]
        client = boto3.client("secretsmanager")
        _database_url = client.get_secret_value(SecretId=secret_arn)["SecretString"]
        os.environ["DATABASE_URL"] = _database_url
    return _database_url


async def _current_revision(database_url: str) -> str | None:
    engine = create_async_engine(database_url)
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT version_num FROM alembic_version"))
            row = result.first()
            return row[0] if row else None
    except ProgrammingError:
        return None  # alembic_version does not exist before the first migration
    finally:
        await engine.dispose()


def handler(event, context):
    event = event or {}
    action = event.get("action", "upgrade")
    if action not in ("upgrade", "downgrade", "stamp"):
        raise ValueError(f"unsupported action: {action}")

    revision = event.get("revision", None if action == "downgrade" else "head")
    if revision is None:
        raise ValueError("downgrade requires an explicit revision")

    database_url = _load_database_url()
    before = asyncio.run(_current_revision(database_url))

    config = Config("alembic.ini")
    if action == "upgrade":
        command.upgrade(config, revision)
    elif action == "downgrade":
        command.downgrade(config, revision)
    else:
        command.stamp(config, revision)

    after = asyncio.run(_current_revision(database_url))
    return {"action": action, "target": revision, "before": before, "after": after}
