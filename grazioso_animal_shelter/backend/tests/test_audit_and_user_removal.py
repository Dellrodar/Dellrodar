import pytest
from sqlalchemy import select, text

from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.repositories import user_repository
from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER, get_or_create_lookup


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


async def _audit_rows(db_session, actor_email: str) -> list[AuditLog]:
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.actor_email == actor_email).order_by(AuditLog.id)
    )
    return list(result.scalars().all())


async def _user_id_by_email(client, admin_token: str, email: str) -> int:
    users = await client.get("/api/v1/admin/users", headers=_auth(admin_token))
    return next(u["id"] for u in users.json() if u["email"] == email)


@pytest.fixture
async def lookup_values():
    """Seed the lookup tables so animal mutations can run."""
    async with TestSessionLocal() as session:
        for model, name in (
            (AnimalType, "Dog"),
            (AnimalBreed, "Labrador Retriever Mix"),
            (AnimalSex, "Intact Female"),
            (OutcomeType, "Transfer"),
        ):
            await get_or_create_lookup(session, model, name)
        await session.commit()

    yield

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


def _animal_payload() -> dict:
    return {
        "animal_id": "A300001",
        "name": "Scout",
        "animal_type": "Dog",
        "breed": "Labrador Retriever Mix",
        "sex_upon_outcome": "Intact Female",
        "outcome_type": "Transfer",
    }


async def test_delete_requires_authentication(client):
    resp = await client.delete("/api/v1/admin/users/1")
    assert resp.status_code == 401


async def test_viewer_cannot_delete_user(client):
    token = await _signup_and_login(client, "viewer-del@example.com")
    resp = await client.delete("/api/v1/admin/users/1", headers=_auth(token))
    assert resp.status_code == 403


async def test_admin_can_delete_user(client, db_session):
    await _signup_and_login(client, "doomed@example.com")
    admin_token = await _login_with_role(client, db_session, "admin-del@example.com", "admin")
    target_id = await _user_id_by_email(client, admin_token, "doomed@example.com")

    resp = await client.delete(f"/api/v1/admin/users/{target_id}", headers=_auth(admin_token))
    assert resp.status_code == 204

    users = await client.get("/api/v1/admin/users", headers=_auth(admin_token))
    assert all(u["email"] != "doomed@example.com" for u in users.json())

    login = await client.post(
        "/api/v1/auth/login", json={"email": "doomed@example.com", "password": "password123"}
    )
    assert login.status_code == 401

    rows = await _audit_rows(db_session, "admin-del@example.com")
    assert [(r.action, r.target_type, r.target_id) for r in rows] == [
        ("user.delete", "user", target_id)
    ]
    assert rows[0].detail == "doomed@example.com"


async def test_admin_cannot_delete_self(client, db_session):
    admin_token = await _login_with_role(client, db_session, "admin-self@example.com", "admin")
    own_id = await _user_id_by_email(client, admin_token, "admin-self@example.com")

    resp = await client.delete(f"/api/v1/admin/users/{own_id}", headers=_auth(admin_token))
    assert resp.status_code == 400

    users = await client.get("/api/v1/admin/users", headers=_auth(admin_token))
    assert any(u["email"] == "admin-self@example.com" for u in users.json())


async def test_admin_cannot_change_own_role(client, db_session):
    admin_token = await _login_with_role(client, db_session, "admin-selfrole@example.com", "admin")
    own_id = await _user_id_by_email(client, admin_token, "admin-selfrole@example.com")

    resp = await client.patch(
        f"/api/v1/admin/users/{own_id}/role", json={"role": "viewer"}, headers=_auth(admin_token)
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "You cannot change your own account"

    users = await client.get("/api/v1/admin/users", headers=_auth(admin_token))
    unchanged = next(u for u in users.json() if u["email"] == "admin-selfrole@example.com")
    assert unchanged["role"] == "admin"

    assert await _audit_rows(db_session, "admin-selfrole@example.com") == []


async def test_admin_cannot_change_own_status(client, db_session):
    admin_token = await _login_with_role(
        client, db_session, "admin-selfstatus@example.com", "admin"
    )
    own_id = await _user_id_by_email(client, admin_token, "admin-selfstatus@example.com")

    resp = await client.patch(
        f"/api/v1/admin/users/{own_id}/status",
        json={"is_active": False},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "You cannot change your own account"

    users = await client.get("/api/v1/admin/users", headers=_auth(admin_token))
    unchanged = next(u for u in users.json() if u["email"] == "admin-selfstatus@example.com")
    assert unchanged["is_active"] is True

    assert await _audit_rows(db_session, "admin-selfstatus@example.com") == []


async def test_delete_missing_user_returns_404(client, db_session):
    admin_token = await _login_with_role(client, db_session, "admin-miss@example.com", "admin")
    resp = await client.delete("/api/v1/admin/users/999999", headers=_auth(admin_token))
    assert resp.status_code == 404


async def test_role_change_writes_audit_row(client, db_session):
    await _signup_and_login(client, "promotee@example.com")
    admin_token = await _login_with_role(client, db_session, "admin-role@example.com", "admin")
    target_id = await _user_id_by_email(client, admin_token, "promotee@example.com")

    await client.patch(
        f"/api/v1/admin/users/{target_id}/role", json={"role": "staff"}, headers=_auth(admin_token)
    )

    rows = await _audit_rows(db_session, "admin-role@example.com")
    assert len(rows) == 1
    assert rows[0].action == "user.role_change"
    assert rows[0].target_id == target_id
    assert "viewer -> staff" in rows[0].detail


async def test_status_change_writes_audit_row(client, db_session):
    await _signup_and_login(client, "benched@example.com")
    admin_token = await _login_with_role(client, db_session, "admin-status@example.com", "admin")
    target_id = await _user_id_by_email(client, admin_token, "benched@example.com")

    await client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        json={"is_active": False},
        headers=_auth(admin_token),
    )

    rows = await _audit_rows(db_session, "admin-status@example.com")
    assert len(rows) == 1
    assert rows[0].action == "user.status_change"
    assert "True -> False" in rows[0].detail


async def test_animal_mutations_write_audit_rows(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-audit@example.com", "staff")

    created = await client.post("/api/v1/animals", json=_animal_payload(), headers=_auth(token))
    animal_pk = created.json()["id"]
    await client.patch(
        f"/api/v1/animals/{animal_pk}", json={"name": "Ranger"}, headers=_auth(token)
    )
    await client.post(f"/api/v1/animals/{animal_pk}/archive", headers=_auth(token))
    await client.post(f"/api/v1/animals/{animal_pk}/unarchive", headers=_auth(token))

    rows = await _audit_rows(db_session, "staff-audit@example.com")
    assert [r.action for r in rows] == [
        "animal.create",
        "animal.update",
        "animal.archive",
        "animal.unarchive",
    ]
    assert all(r.target_type == "animal" and r.target_id == animal_pk for r in rows)
    assert rows[0].detail == "A300001"
    assert "name" in rows[1].detail


async def test_failed_mutation_writes_no_audit_row(client, db_session, lookup_values):
    token = await _login_with_role(client, db_session, "staff-fail@example.com", "staff")

    payload = _animal_payload()
    payload["animal_type"] = "Dragon"
    resp = await client.post("/api/v1/animals", json=payload, headers=_auth(token))
    assert resp.status_code == 400

    assert await _audit_rows(db_session, "staff-fail@example.com") == []


async def test_audit_rows_survive_actor_deletion(client, db_session, lookup_values):
    staff_token = await _login_with_role(client, db_session, "staff-gone@example.com", "staff")
    await client.post("/api/v1/animals", json=_animal_payload(), headers=_auth(staff_token))

    admin_token = await _login_with_role(client, db_session, "admin-reaper@example.com", "admin")
    staff_id = await _user_id_by_email(client, admin_token, "staff-gone@example.com")
    resp = await client.delete(f"/api/v1/admin/users/{staff_id}", headers=_auth(admin_token))
    assert resp.status_code == 204

    rows = await _audit_rows(db_session, "staff-gone@example.com")
    assert len(rows) == 1
    assert rows[0].action == "animal.create"
    assert rows[0].actor_id is None
    assert rows[0].actor_email == "staff-gone@example.com"
