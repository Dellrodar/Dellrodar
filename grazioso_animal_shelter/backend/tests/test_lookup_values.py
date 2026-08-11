import pytest
from sqlalchemy import text

from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER, get_or_create_lookup


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def seeded_lookups():
    async with TestSessionLocal() as session:
        for model, names in (
            (AnimalType, ("Dog", "Cat")),
            (AnimalBreed, ("Labrador Retriever Mix", "German Shepherd")),
            (AnimalSex, ("Neutered Male", "Intact Female")),
            (OutcomeType, ("Transfer", "Adoption")),
        ):
            for name in names:
                await get_or_create_lookup(session, model, name)
        await session.commit()

    yield

    async with TestSessionLocal() as session:
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


async def test_lookup_values_require_authentication(client):
    resp = await client.get("/api/v1/lookups")
    assert resp.status_code == 401


async def test_viewer_gets_all_lookup_lists_sorted(client, seeded_lookups):
    token = await _signup_and_login(client, "viewer-lookups@example.com")
    resp = await client.get("/api/v1/lookups", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["animal_types"] == ["Cat", "Dog"]
    assert body["breeds"] == ["German Shepherd", "Labrador Retriever Mix"]
    assert body["sexes"] == ["Intact Female", "Neutered Male"]
    assert body["outcome_types"] == ["Adoption", "Transfer"]


async def test_empty_lookup_tables_return_empty_lists(client):
    token = await _signup_and_login(client, "viewer-empty-lookups@example.com")
    resp = await client.get("/api/v1/lookups", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json() == {
        "animal_types": [],
        "breeds": [],
        "sexes": [],
        "outcome_types": [],
    }
