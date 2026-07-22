from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role
from app.models.user import User


async def get_role_by_name(session: AsyncSession, name: str) -> Role | None:
    result = await session.execute(select(Role).where(Role.name == name))
    return result.scalar_one_or_none()


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(
        select(User).options(selectinload(User.role)).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    result = await session.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def list_users(session: AsyncSession) -> list[User]:
    result = await session.execute(select(User).options(selectinload(User.role)).order_by(User.id))
    return list(result.scalars().all())


async def create_user(
    session: AsyncSession, *, email: str, hashed_password: str, role: Role
) -> User:
    user = User(email=email, hashed_password=hashed_password, role=role, is_active=True)
    session.add(user)
    await session.commit()
    await session.refresh(user, attribute_names=["role"])
    return user
