from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import user_repository
from app.services import audit_service


class UserNotFoundError(Exception):
    pass


class RoleNotFoundError(Exception):
    pass


class SelfDeleteError(Exception):
    pass


async def list_all_users(session: AsyncSession) -> list[User]:
    return await user_repository.list_users(session)


async def update_user_role(
    session: AsyncSession, *, user_id: int, role_name: str, actor: User
) -> User:
    user = await user_repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError(user_id)

    role = await user_repository.get_role_by_name(session, role_name)
    if role is None:
        raise RoleNotFoundError(role_name)

    old_role = user.role.name
    user.role = role
    audit_service.record(
        session,
        actor=actor,
        action="user.role_change",
        target_type="user",
        target_id=user.id,
        detail=f"{user.email}: {old_role} -> {role_name}",
    )
    await session.commit()
    await session.refresh(user, attribute_names=["role"])
    return user


async def update_user_status(
    session: AsyncSession, *, user_id: int, is_active: bool, actor: User
) -> User:
    user = await user_repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError(user_id)

    old_status = user.is_active
    user.is_active = is_active
    audit_service.record(
        session,
        actor=actor,
        action="user.status_change",
        target_type="user",
        target_id=user.id,
        detail=f"{user.email}: is_active {old_status} -> {is_active}",
    )
    await session.commit()
    await session.refresh(user, attribute_names=["role"])
    return user


async def delete_user(session: AsyncSession, *, user_id: int, actor: User) -> None:
    if user_id == actor.id:
        raise SelfDeleteError(user_id)

    user = await user_repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError(user_id)

    audit_service.record(
        session,
        actor=actor,
        action="user.delete",
        target_type="user",
        target_id=user.id,
        detail=user.email,
    )
    await session.delete(user)
    await session.commit()
