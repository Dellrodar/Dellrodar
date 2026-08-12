import pytest
from sqlalchemy import text

from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER, create_animal, create_profile


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def seeded_animals():
    async with TestSessionLocal() as session:
        animals = [
            await create_animal(
                session,
                animal_id="A000001",
                name="Bella",
                animal_type="Dog",
                breed="Labrador Retriever Mix",
                sex_upon_outcome="Intact Female",
                age_upon_outcome_in_weeks=52.0,
            ),
            await create_animal(
                session,
                animal_id="A000002",
                name="Max",
                animal_type="Dog",
                breed="German Shepherd",
                sex_upon_outcome="Intact Male",
                age_upon_outcome_in_weeks=104.0,
            ),
            await create_animal(
                session,
                animal_id="A000003",
                name="Whiskers",
                animal_type="Cat",
                breed="Domestic Shorthair Mix",
                sex_upon_outcome="Spayed Female",
                age_upon_outcome_in_weeks=30.0,
            ),
        ]
        await session.commit()

    yield animals

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


# Depends on seeded_animals so the profile row is removed before the lookup
# tables it references are wiped in that fixture's teardown.
@pytest.fixture
async def dog_profile_id(seeded_animals):
    async with TestSessionLocal() as session:
        profile = await create_profile(session, name="Dog Rescue", animal_type="Dog")
        await session.commit()
        profile_id = profile.id

    yield profile_id

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM rescue_profiles"))
        await session.commit()


async def test_search_requires_authentication(client):
    resp = await client.get("/api/v1/animals")
    assert resp.status_code == 401


async def test_search_returns_paginated_results(client, seeded_animals):
    token = await _signup_and_login(client, "searcher@example.com")
    resp = await client.get("/api/v1/animals", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert len(body["items"]) == 3


async def test_search_by_name(client, seeded_animals):
    token = await _signup_and_login(client, "searcher2@example.com")
    resp = await client.get("/api/v1/animals", params={"q": "bella"}, headers=_auth(token))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Bella"


async def test_search_by_breed(client, seeded_animals):
    token = await _signup_and_login(client, "searcher3@example.com")
    resp = await client.get("/api/v1/animals", params={"q": "shepherd"}, headers=_auth(token))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["breed"] == "German Shepherd"


async def test_filter_by_animal_type(client, seeded_animals):
    token = await _signup_and_login(client, "searcher4@example.com")
    resp = await client.get("/api/v1/animals", params={"animal_type": "Cat"}, headers=_auth(token))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["animal_type"] == "Cat"


async def test_pagination_limits_page_size(client, seeded_animals):
    token = await _signup_and_login(client, "searcher5@example.com")
    resp = await client.get(
        "/api/v1/animals", params={"page": 2, "page_size": 2}, headers=_auth(token)
    )
    body = resp.json()
    assert body["total"] == 3
    assert body["page"] == 2
    assert len(body["items"]) == 1


async def test_get_animal_detail(client, seeded_animals):
    token = await _signup_and_login(client, "searcher6@example.com")
    listing = await client.get("/api/v1/animals", params={"q": "Max"}, headers=_auth(token))
    animal_pk = listing.json()["items"][0]["id"]

    resp = await client.get(f"/api/v1/animals/{animal_pk}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Max"


async def test_get_missing_animal_returns_404(client, seeded_animals):
    token = await _signup_and_login(client, "searcher7@example.com")
    resp = await client.get("/api/v1/animals/999999", headers=_auth(token))
    assert resp.status_code == 404


async def test_breed_summary_requires_authentication(client):
    resp = await client.get("/api/v1/animals/breed-summary")
    assert resp.status_code == 401


async def test_breed_summary_counts_filtered_set(client, seeded_animals):
    token = await _signup_and_login(client, "searcher8@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary", params={"animal_type": "Dog"}, headers=_auth(token)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_animals"] == 2
    assert body["other_count"] == 0
    breeds = {item["breed"]: item["count"] for item in body["items"]}
    assert breeds == {"Labrador Retriever Mix": 1, "German Shepherd": 1}


async def test_breed_summary_orders_by_count_descending(client, seeded_animals):
    token = await _signup_and_login(client, "searcher9@example.com")
    resp = await client.get("/api/v1/animals/breed-summary", headers=_auth(token))
    body = resp.json()
    counts = [item["count"] for item in body["items"]]
    assert counts == sorted(counts, reverse=True)
    assert body["total_animals"] == 3


async def test_breed_summary_folds_extra_breeds_into_other(client, seeded_animals):
    token = await _signup_and_login(client, "searcher10@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary", params={"limit": 2}, headers=_auth(token)
    )
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["other_count"] == 1
    assert body["total_animals"] == 3


async def test_breed_summary_applies_text_search(client, seeded_animals):
    token = await _signup_and_login(client, "searcher11@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary", params={"q": "shepherd"}, headers=_auth(token)
    )
    body = resp.json()
    assert body["total_animals"] == 1
    assert body["items"] == [{"breed": "German Shepherd", "count": 1}]


async def test_breed_summary_scopes_to_profile_candidate_pool(client, dog_profile_id):
    token = await _signup_and_login(client, "searcher12@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary",
        params={"profile_id": dog_profile_id},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_animals"] == 2
    breeds = {item["breed"]: item["count"] for item in body["items"]}
    assert breeds == {"Labrador Retriever Mix": 1, "German Shepherd": 1}


async def test_breed_summary_profile_excludes_archived_animals(client, dog_profile_id):
    token = await _signup_and_login(client, "searcher13@example.com")
    async with TestSessionLocal() as session:
        await session.execute(
            text("UPDATE animals SET archived_at = now() WHERE animal_id = 'A000002'")
        )
        await session.commit()

    resp = await client.get(
        "/api/v1/animals/breed-summary",
        params={"profile_id": dog_profile_id},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["total_animals"] == 1
    assert body["items"] == [{"breed": "Labrador Retriever Mix", "count": 1}]


async def test_breed_summary_unknown_profile_returns_404(client, seeded_animals):
    token = await _signup_and_login(client, "searcher14@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary", params={"profile_id": 999999}, headers=_auth(token)
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Rescue profile not found"


async def test_breed_summary_profile_composes_with_text_search(client, dog_profile_id):
    token = await _signup_and_login(client, "searcher15@example.com")
    resp = await client.get(
        "/api/v1/animals/breed-summary",
        params={"profile_id": dog_profile_id, "q": "shepherd"},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["total_animals"] == 1
    assert body["items"] == [{"breed": "German Shepherd", "count": 1}]
