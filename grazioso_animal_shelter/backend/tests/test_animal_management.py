import pytest
from sqlalchemy import text

from app.core.security import hash_password
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.repositories import user_repository
from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER, create_profile, get_or_create_lookup


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


async def _login_with_role(
    client, db_session, email: str, role_name: str, password: str = "password123"
) -> str:
    role = await user_repository.get_role_by_name(db_session, role_name)
    await user_repository.create_user(
        db_session, email=email, hashed_password=hash_password(password), role=role
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _payload(**overrides) -> dict:
    base = {
        "animal_id": "A200001",
        "name": "Sandy",
        "animal_type": "Dog",
        "breed": "Labrador Retriever Mix",
        "sex_upon_outcome": "Intact Female",
        "outcome_type": "Transfer",
        "age_upon_outcome_in_weeks": 52.0,
    }
    base.update(overrides)
    return base


@pytest.fixture
async def lookup_values():
    """Seed the lookup tables the management endpoints validate against."""
    async with TestSessionLocal() as session:
        for model, names in (
            (AnimalType, ("Dog", "Cat")),
            (AnimalBreed, ("Labrador Retriever Mix", "German Shepherd")),
            (AnimalSex, ("Intact Female", "Neutered Male")),
            (OutcomeType, ("Transfer", "Adoption")),
        ):
            for name in names:
                await get_or_create_lookup(session, model, name)
        await session.commit()

    yield

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        await session.execute(text("DELETE FROM rescue_profiles"))
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


async def test_create_requires_authentication(client):
    resp = await client.post("/api/v1/animals", json=_payload())
    assert resp.status_code == 401


async def test_viewer_cannot_create_animal(client, lookup_values):
    token = await _signup_and_login(client, "viewer-create@example.com")
    resp = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    assert resp.status_code == 403


async def test_staff_can_create_animal(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-create@example.com", "staff")
    resp = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    assert resp.status_code == 201
    body = resp.json()
    assert body["animal_id"] == "A200001"
    assert body["name"] == "Sandy"
    assert body["breed"] == "Labrador Retriever Mix"
    assert body["archived_at"] is None


async def test_admin_can_create_animal(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "admin-create@example.com", "admin")
    resp = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    assert resp.status_code == 201


async def test_create_rejects_unknown_lookup_value(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-badtype@example.com", "staff")
    resp = await client.post(
        "/api/v1/animals", json=_payload(animal_type="Dragon"), headers=_auth(token)
    )
    assert resp.status_code == 400
    assert "animal_type" in resp.json()["detail"]


async def test_staff_can_update_animal(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-update@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]

    resp = await client.patch(
        f"/api/v1/animals/{animal_pk}",
        json={"name": "Shadow", "breed": "German Shepherd"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Shadow"
    assert body["breed"] == "German Shepherd"
    # Untouched fields survive the partial update.
    assert body["animal_id"] == "A200001"
    assert body["sex_upon_outcome"] == "Intact Female"


async def test_update_rejects_unknown_lookup_value(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-badbreed@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]

    resp = await client.patch(
        f"/api/v1/animals/{animal_pk}", json={"breed": "Cerberus"}, headers=_auth(token)
    )
    assert resp.status_code == 400
    assert "breed" in resp.json()["detail"]


async def test_update_rejects_null_required_lookup(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-nulltype@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]

    resp = await client.patch(
        f"/api/v1/animals/{animal_pk}", json={"animal_type": None}, headers=_auth(token)
    )
    assert resp.status_code == 400


async def test_update_missing_animal_returns_404(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-miss@example.com", "staff")
    resp = await client.patch(
        "/api/v1/animals/999999", json={"name": "Ghost"}, headers=_auth(token)
    )
    assert resp.status_code == 404


async def test_viewer_cannot_update_animal(client, db_session, lookup_values):
    staff_token = await _login_with_role(client, db_session, "staff-seed@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(staff_token))
    animal_pk = created.json()["id"]

    viewer_token = await _signup_and_login(client, "viewer-update@example.com")
    resp = await client.patch(
        f"/api/v1/animals/{animal_pk}", json={"name": "Nope"}, headers=_auth(viewer_token)
    )
    assert resp.status_code == 403


async def test_staff_can_archive_and_unarchive(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-archive@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]

    archived = await client.post(f"/api/v1/animals/{animal_pk}/archive", headers=_auth(token))
    assert archived.status_code == 200
    assert archived.json()["archived_at"] is not None

    restored = await client.post(f"/api/v1/animals/{animal_pk}/unarchive", headers=_auth(token))
    assert restored.status_code == 200
    assert restored.json()["archived_at"] is None


async def test_viewer_cannot_archive_animal(client, db_session, lookup_values):
    staff_token = await _login_with_role(client, db_session, "staff-seed2@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(staff_token))
    animal_pk = created.json()["id"]

    viewer_token = await _signup_and_login(client, "viewer-archive@example.com")
    resp = await client.post(f"/api/v1/animals/{animal_pk}/archive", headers=_auth(viewer_token))
    assert resp.status_code == 403


async def test_archive_missing_animal_returns_404(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-miss2@example.com", "staff")
    resp = await client.post("/api/v1/animals/999999/archive", headers=_auth(token))
    assert resp.status_code == 404


async def test_archived_excluded_from_default_search(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-search@example.com", "staff")
    kept = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    gone = await client.post(
        "/api/v1/animals",
        json=_payload(animal_id="A200002", name="Rex", breed="German Shepherd"),
        headers=_auth(token),
    )
    await client.post(f"/api/v1/animals/{gone.json()['id']}/archive", headers=_auth(token))

    default = await client.get("/api/v1/animals", headers=_auth(token))
    assert default.json()["total"] == 1
    assert default.json()["items"][0]["id"] == kept.json()["id"]

    everything = await client.get(
        "/api/v1/animals", params={"include_archived": "true"}, headers=_auth(token)
    )
    assert everything.json()["total"] == 2


async def test_archived_excluded_from_breed_summary(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-summary@example.com", "staff")
    await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    archived = await client.post(
        "/api/v1/animals",
        json=_payload(animal_id="A200002", name="Rex", breed="German Shepherd"),
        headers=_auth(token),
    )
    await client.post(f"/api/v1/animals/{archived.json()['id']}/archive", headers=_auth(token))

    resp = await client.get("/api/v1/animals/breed-summary", headers=_auth(token))
    body = resp.json()
    assert body["total_animals"] == 1
    assert body["items"] == [{"breed": "Labrador Retriever Mix", "count": 1}]


async def test_archived_animal_still_retrievable_by_id(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-detail@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]
    await client.post(f"/api/v1/animals/{animal_pk}/archive", headers=_auth(token))

    resp = await client.get(f"/api/v1/animals/{animal_pk}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["archived_at"] is not None


async def test_archived_excluded_from_match_results(client, db_session, lookup_values):
    async with TestSessionLocal() as session:
        profile = await create_profile(
            session,
            name="Water Rescue",
            animal_type="Dog",
            breeds=["Labrador Retriever Mix"],
        )
        await session.commit()
        profile_id = profile.id

    token = await _login_with_role(client, db_session, "staff-match@example.com", "staff")
    created = await client.post("/api/v1/animals", json=_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]

    before = await client.get(
        f"/api/v1/rescue-profiles/{profile_id}/matches", headers=_auth(token)
    )
    assert before.json()["total"] == 1

    await client.post(f"/api/v1/animals/{animal_pk}/archive", headers=_auth(token))

    after = await client.get(
        f"/api/v1/rescue-profiles/{profile_id}/matches", headers=_auth(token)
    )
    assert after.json()["total"] == 0
