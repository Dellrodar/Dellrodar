from app.core.security import hash_password
from app.repositories import user_repository


async def _signup_and_login(client, email: str, password: str = "password123") -> str:
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


async def _create_admin_and_login(
    client, db_session, email: str, password: str = "password123"
) -> str:
    admin_role = await user_repository.get_role_by_name(db_session, "admin")
    await user_repository.create_user(
        db_session, email=email, hashed_password=hash_password(password), role=admin_role
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


async def test_unauthenticated_request_rejected(client):
    resp = await client.get("/api/v1/admin/users")
    assert resp.status_code == 401


async def test_viewer_cannot_access_admin_users(client):
    token = await _signup_and_login(client, "viewer1@example.com")
    resp = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


async def test_admin_can_list_users(client, db_session):
    token = await _create_admin_and_login(client, db_session, "admin1@example.com")
    resp = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_admin_can_promote_viewer_to_staff(client, db_session):
    await _signup_and_login(client, "promote-me@example.com")
    admin_token = await _create_admin_and_login(client, db_session, "admin2@example.com")

    users_resp = await client.get(
        "/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"}
    )
    viewer = next(u for u in users_resp.json() if u["email"] == "promote-me@example.com")

    patch_resp = await client.patch(
        f"/api/v1/admin/users/{viewer['id']}/role",
        json={"role": "staff"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["role"] == "staff"


async def test_admin_can_disable_user(client, db_session):
    await _signup_and_login(client, "disable-me@example.com")
    admin_token = await _create_admin_and_login(client, db_session, "admin3@example.com")

    users_resp = await client.get(
        "/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"}
    )
    target = next(u for u in users_resp.json() if u["email"] == "disable-me@example.com")

    patch_resp = await client.patch(
        f"/api/v1/admin/users/{target['id']}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["is_active"] is False

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "disable-me@example.com", "password": "password123"},
    )
    assert login_resp.status_code == 403
