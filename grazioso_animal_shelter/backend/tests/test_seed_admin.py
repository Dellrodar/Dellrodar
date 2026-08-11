from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import verify_password
from app.models.user import User
from app.repositories import user_repository
from app.scripts.seed_admin import seed_admin


async def test_seed_admin_creates_admin_account(db_session):
    settings = get_settings()
    await seed_admin()

    admin = await user_repository.get_user_by_email(db_session, settings.admin_email)
    assert admin is not None
    assert admin.role.name == "admin"
    assert admin.is_active is True
    assert verify_password(settings.admin_password, admin.hashed_password)


async def test_seed_admin_is_idempotent(db_session):
    settings = get_settings()
    await seed_admin()
    await seed_admin()

    count = await db_session.scalar(
        select(func.count()).select_from(User).where(User.email == settings.admin_email)
    )
    assert count == 1
