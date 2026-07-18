from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories import user_repository


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountDisabledError(Exception):
    pass


async def signup(session: AsyncSession, *, email: str, password: str) -> User:
    existing = await user_repository.get_user_by_email(session, email)
    if existing is not None:
        raise EmailAlreadyRegisteredError(email)

    viewer_role = await user_repository.get_role_by_name(session, "viewer")
    if viewer_role is None:
        raise RuntimeError("viewer role is not seeded; run migrations")

    return await user_repository.create_user(
        session,
        email=email,
        hashed_password=hash_password(password),
        role=viewer_role,
    )


async def authenticate(session: AsyncSession, *, email: str, password: str) -> str:
    user = await user_repository.get_user_by_email(session, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError(email)
    if not user.is_active:
        raise AccountDisabledError(email)

    return create_access_token(user_id=user.id, role=user.role.name)
