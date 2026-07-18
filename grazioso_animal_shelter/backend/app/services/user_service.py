from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import user_repository


class UserNotFoundError(Exception):
    pass


class RoleNotFoundError(Exception):
    pass


async def list_all_users(session: AsyncSession) -> list[User]:
    return await user_repository.list_users(session)


async def update_user_role(session: AsyncSession, *, user_id: int, role_name: str) -> User:
    user = await user_repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError(user_id)

    role = await user_repository.get_role_by_name(session, role_name)
    if role is None:
        raise RoleNotFoundError(role_name)

    user.role = role
    await session.commit()
    await session.refresh(user, attribute_names=["role"])
    return user


async def update_user_status(session: AsyncSession, *, user_id: int, is_active: bool) -> User:
    user = await user_repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError(user_id)

    user.is_active = is_active
    await session.commit()
    await session.refresh(user, attribute_names=["role"])
    return user
