from app.core.config import get_settings
from app.core.security import hash_password
from app.repositories import user_repository


async def test_signup_creates_viewer(client):
    resp = await client.post(
        "/api/v1/auth/signup", json={"email": "new@example.com", "password": "password123"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "viewer"


async def test_signup_duplicate_email_rejected(client):
    payload = {"email": "dup@example.com", "password": "password123"}
    first = await client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 409


async def test_signup_rejects_short_password(client):
    resp = await client.post(
        "/api/v1/auth/signup", json={"email": "short@example.com", "password": "abc"}
    )
    assert resp.status_code == 422


async def test_login_and_me(client):
    payload = {"email": "loginuser@example.com", "password": "password123"}
    await client.post("/api/v1/auth/signup", json=payload)

    login_resp = await client.post("/api/v1/auth/login", json=payload)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == payload["email"]


async def test_login_wrong_password_rejected(client):
    payload = {"email": "wrongpass@example.com", "password": "password123"}
    await client.post("/api/v1/auth/signup", json=payload)

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "not-the-password"},
    )
    assert resp.status_code == 401


async def test_seeded_admin_login(client, db_session):
    settings = get_settings()
    admin_role = await user_repository.get_role_by_name(db_session, "admin")
    await user_repository.create_user(
        db_session,
        email=settings.admin_email,
        hashed_password=hash_password(settings.admin_password),
        role=admin_role,
    )

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()
