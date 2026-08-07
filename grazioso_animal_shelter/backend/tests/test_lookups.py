import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models.lookups import AnimalBreed
from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER, create_animal, get_or_create_lookup


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
async def _clean_lookup_tables():
    yield
    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


async def test_get_or_create_returns_same_id_for_same_name():
    async with TestSessionLocal() as session:
        first = await get_or_create_lookup(session, AnimalBreed, "Labrador Retriever Mix")
        second = await get_or_create_lookup(session, AnimalBreed, "Labrador Retriever Mix")
        assert first == second
        await session.commit()


async def test_duplicate_lookup_name_violates_unique_constraint():
    async with TestSessionLocal() as session:
        session.add(AnimalBreed(name="Beagle"))
        await session.flush()
        session.add(AnimalBreed(name="Beagle"))
        with pytest.raises(IntegrityError):
            await session.flush()


async def test_referenced_breed_cannot_be_deleted():
    async with TestSessionLocal() as session:
        await create_animal(session, animal_id="A200001", animal_type="Dog", breed="Bloodhound")
        await session.commit()

    async with TestSessionLocal() as session:
        with pytest.raises(IntegrityError):
            await session.execute(text("DELETE FROM animal_breeds"))
            await session.commit()


async def test_nullable_lookups_flow_through_search_api(client):
    async with TestSessionLocal() as session:
        await create_animal(
            session,
            animal_id="A200002",
            name="NoDetails",
            animal_type="Dog",
            breed="Beagle",
            sex_upon_outcome=None,
            outcome_type=None,
        )
        await session.commit()

    token = await _signup_and_login(client, "lookups1@example.com")
    resp = await client.get("/api/v1/animals", params={"q": "NoDetails"}, headers=_auth(token))
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    assert item["breed"] == "Beagle"
    assert item["sex_upon_outcome"] is None
    assert item["outcome_type"] is None
