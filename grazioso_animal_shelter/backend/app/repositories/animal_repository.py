from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType


def _apply_filters(
    stmt: Select,
    *,
    q: str | None,
    animal_type: str | None,
    include_archived: bool = False,
) -> Select:
    if not include_archived:
        stmt = stmt.where(Animal.archived_at.is_(None))
    if animal_type:
        stmt = stmt.where(Animal.animal_type_ref.has(AnimalType.name.ilike(animal_type)))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Animal.name.ilike(pattern),
                Animal.breed_ref.has(AnimalBreed.name.ilike(pattern)),
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
    include_archived: bool = False,
) -> tuple[list[Animal], int]:
    filtered = _apply_filters(
        select(Animal), q=q, animal_type=animal_type, include_archived=include_archived
    )

    total = await session.scalar(select(func.count()).select_from(filtered.subquery()))

    result = await session.execute(
        filtered.order_by(Animal.id).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total or 0


async def get_animal_by_id(session: AsyncSession, animal_pk: int) -> Animal | None:
    # populate_existing so a fetch after an update re-reads the row and its
    # joined lookup refs instead of returning stale identity-map state.
    result = await session.execute(
        select(Animal).where(Animal.id == animal_pk).execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def get_lookup_id_by_name(
    session: AsyncSession,
    model: type[AnimalBreed | AnimalSex | AnimalType | OutcomeType],
    name: str,
) -> int | None:
    return await session.scalar(select(model.id).where(model.name == name))


async def breed_summary(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    limit: int = 10,
) -> tuple[list[tuple[str, int]], int, int]:
    """Breed counts for the filtered animal set, largest first.

    Returns the top ``limit`` breeds, the combined count of the remaining
    breeds, and the total number of matching animals.
    """
    stmt = _apply_filters(
        select(AnimalBreed.name, func.count()).join(Animal, Animal.breed_id == AnimalBreed.id),
        q=q,
        animal_type=animal_type,
    ).group_by(AnimalBreed.name)
    stmt = stmt.order_by(func.count().desc(), AnimalBreed.name)

    rows = [(name, count) for name, count in (await session.execute(stmt)).all()]
    top = rows[:limit]
    other_count = sum(count for _, count in rows[limit:])
    total_animals = sum(count for _, count in rows)
    return top, other_count, total_animals
