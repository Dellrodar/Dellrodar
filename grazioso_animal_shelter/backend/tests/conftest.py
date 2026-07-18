import os
from urllib.parse import urlsplit, urlunsplit

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings

_settings = get_settings()
_base_db_name = _settings.database_url.rsplit("/", 1)[-1]


def _with_db(url: str, dbname: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{dbname}", parts.query, parts.fragment))


def _asyncpg_dsn(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://")


TEST_DB_NAME = f"{_base_db_name}_test"
TEST_DATABASE_URL = _with_db(_settings.database_url, TEST_DB_NAME)
MAINTENANCE_DSN = _asyncpg_dsn(_with_db(_settings.database_url, "postgres"))

# Point the app at the test database before importing anything that reads
# settings at module-import time (app.main, app.db.session, ...).
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
get_settings.cache_clear()

from app.api.deps import get_db  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.role import Role  # noqa: E402

test_engine = create_async_engine(TEST_DATABASE_URL, future=True)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


async def _ensure_test_database_exists() -> None:
    conn = await asyncpg.connect(dsn=MAINTENANCE_DSN)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    await _ensure_test_database_exists()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        session.add_all([Role(name="viewer"), Role(name="staff"), Role(name="admin")])
        await session.commit()

    yield

    await test_engine.dispose()


@pytest.fixture(autouse=True)
async def _clean_users():
    yield
    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM users"))
        await session.commit()


@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
