import pytest
from sqlalchemy import text

from app.models.animal import Animal
from app.models.rescue_profile import RescueProfile, RescueProfileBreed
from tests.conftest import TestSessionLocal


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def water_rescue_data():
    """A Water Rescue style profile plus animals spanning the score spectrum."""
    profile = RescueProfile(
        name="Water Rescue",
        animal_type="Dog",
        preferred_sex="Intact Female",
        min_age_weeks=26.0,
        max_age_weeks=156.0,
        breeds=[
            RescueProfileBreed(breed="Labrador Retriever Mix", weight=1.0),
            RescueProfileBreed(breed="Chesapeake Bay Retriever", weight=1.0),
            RescueProfileBreed(breed="Newfoundland", weight=1.0),
        ],
    )
    animals = [
        # Perfect candidate: exact breed, in age range, right sex, available.
        Animal(
            animal_id="A100001",
            name="Perfect",
            animal_type="Dog",
            breed="Labrador Retriever Mix",
            sex_upon_outcome="Intact Female",
            age_upon_outcome_in_weeks=52.0,
            outcome_type="Transfer",
        ),
        # Similar breed text but wrong sex and too old.
        Animal(
            animal_id="A100002",
            name="Partial",
            animal_type="Dog",
            breed="Labrador Retriever",
            sex_upon_outcome="Neutered Male",
            age_upon_outcome_in_weeks=300.0,
            outcome_type="Adoption",
        ),
        # Unrelated breed, meets age/sex/availability criteria.
        Animal(
            animal_id="A100003",
            name="WrongBreed",
            animal_type="Dog",
            breed="Chihuahua Shorthair",
            sex_upon_outcome="Intact Female",
            age_upon_outcome_in_weeks=52.0,
            outcome_type="Transfer",
        ),
        # Right breed but no longer available.
        Animal(
            animal_id="A100004",
            name="Unavailable",
            animal_type="Dog",
            breed="Labrador Retriever Mix",
            sex_upon_outcome="Intact Female",
            age_upon_outcome_in_weeks=52.0,
            outcome_type="Euthanasia",
        ),
        # Cats are never candidates for a dog profile.
        Animal(
            animal_id="A100005",
            name="NotADog",
            animal_type="Cat",
            breed="Domestic Shorthair Mix",
            sex_upon_outcome="Intact Female",
            age_upon_outcome_in_weeks=52.0,
            outcome_type="Transfer",
        ),
    ]
    async with TestSessionLocal() as session:
        session.add(profile)
        session.add_all(animals)
        await session.commit()
        await session.refresh(profile)
        profile_id = profile.id

    yield profile_id

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        await session.execute(text("DELETE FROM rescue_profiles"))
        await session.commit()


async def test_list_profiles_requires_authentication(client):
    resp = await client.get("/api/v1/rescue-profiles")
    assert resp.status_code == 401


async def test_list_profiles(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue1@example.com")
    resp = await client.get("/api/v1/rescue-profiles", headers=_auth(token))
    assert resp.status_code == 200
    profiles = resp.json()
    assert len(profiles) == 1
    assert profiles[0]["name"] == "Water Rescue"
    assert len(profiles[0]["breeds"]) == 3


async def test_unknown_profile_returns_404(client):
    token = await _signup_and_login(client, "rescue2@example.com")
    resp = await client.get("/api/v1/rescue-profiles/999999/matches", headers=_auth(token))
    assert resp.status_code == 404


async def test_matches_ranked_by_score(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue3@example.com")
    resp = await client.get(
        f"/api/v1/rescue-profiles/{water_rescue_data}/matches", headers=_auth(token)
    )
    assert resp.status_code == 200
    body = resp.json()

    # Only dogs are candidates.
    assert body["total"] == 4
    names = [m["animal"]["name"] for m in body["items"]]
    assert names[0] == "Perfect"

    scores = [m["score"] for m in body["items"]]
    assert scores == sorted(scores, reverse=True)


async def test_perfect_match_scores_full_points(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue4@example.com")
    resp = await client.get(
        f"/api/v1/rescue-profiles/{water_rescue_data}/matches", headers=_auth(token)
    )
    perfect = resp.json()["items"][0]
    assert perfect["breed_score"] == 50.0
    assert perfect["age_score"] == 20.0
    assert perfect["sex_score"] == 20.0
    assert perfect["availability_score"] == 10.0
    assert perfect["score"] == 100.0


async def test_similar_breed_gets_partial_breed_score(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue5@example.com")
    resp = await client.get(
        f"/api/v1/rescue-profiles/{water_rescue_data}/matches", headers=_auth(token)
    )
    by_name = {m["animal"]["name"]: m for m in resp.json()["items"]}

    # "Labrador Retriever" is not an exact profile breed, but pg_trgm
    # similarity to "Labrador Retriever Mix" gives substantial partial credit.
    partial = by_name["Partial"]
    assert 0.0 < partial["breed_score"] < 50.0
    assert partial["breed_score"] > 30.0

    # An unrelated breed scores near zero on breed even when it meets
    # every other criterion.
    wrong_breed = by_name["WrongBreed"]
    assert wrong_breed["breed_score"] < 10.0
    assert wrong_breed["age_score"] == 20.0
    assert wrong_breed["sex_score"] == 20.0


async def test_unavailable_animal_loses_availability_points(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue6@example.com")
    resp = await client.get(
        f"/api/v1/rescue-profiles/{water_rescue_data}/matches", headers=_auth(token)
    )
    by_name = {m["animal"]["name"]: m for m in resp.json()["items"]}
    assert by_name["Unavailable"]["availability_score"] == 0.0
    assert by_name["Unavailable"]["score"] == 90.0


async def test_matches_paginate(client, water_rescue_data):
    token = await _signup_and_login(client, "rescue7@example.com")
    resp = await client.get(
        f"/api/v1/rescue-profiles/{water_rescue_data}/matches",
        params={"page": 2, "page_size": 3},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["total"] == 4
    assert body["page"] == 2
    assert len(body["items"]) == 1
