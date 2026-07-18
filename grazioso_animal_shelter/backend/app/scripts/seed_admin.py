"""Idempotently create the default admin account from ADMIN_EMAIL/ADMIN_PASSWORD.

Usage: python -m app.scripts.seed_admin
"""

import asyncio

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.repositories import user_repository


async def seed_admin() -> None:
    settings = get_settings()

    async with AsyncSessionLocal() as session:
        existing = await user_repository.get_user_by_email(session, settings.admin_email)
        if existing is not None:
            print(f"Admin account already exists: {settings.admin_email}")
            return

        admin_role = await user_repository.get_role_by_name(session, "admin")
        if admin_role is None:
            raise RuntimeError("admin role is not seeded; run 'alembic upgrade head' first")

        await user_repository.create_user(
            session,
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            role=admin_role,
        )
        print(f"Created admin account: {settings.admin_email}")


if __name__ == "__main__":
    asyncio.run(seed_admin())
