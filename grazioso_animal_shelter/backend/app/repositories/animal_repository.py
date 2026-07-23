from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal


def _apply_filters(
    stmt: Select,
    *,
    q: str | None,
    animal_type: str | None,
) -> Select:
    if animal_type:
        stmt = stmt.where(Animal.animal_type.ilike(animal_type))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Animal.name.ilike(pattern),
                Animal.breed.ilike(pattern),
                Animal.animal_id.ilike(pattern),
            )
        )
    return stmt


async def search_animals(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Animal], int]:
    filtered = _apply_filters(select(Animal), q=q, animal_type=animal_type)

    total = await session.scalar(select(func.count()).select_from(filtered.subquery()))

    result = await session.execute(
        filtered.order_by(Animal.id).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total or 0


async def get_animal_by_id(session: AsyncSession, animal_pk: int) -> Animal | None:
    result = await session.execute(select(Animal).where(Animal.id == animal_pk))
    return result.scalar_one_or_none()
