from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal
from app.repositories import animal_repository


class AnimalNotFoundError(Exception):
    pass


async def search_animals(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Animal], int]:
    return await animal_repository.search_animals(
        session, q=q, animal_type=animal_type, page=page, page_size=page_size
    )


async def breed_summary(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    limit: int = 10,
) -> tuple[list[tuple[str, int]], int, int]:
    return await animal_repository.breed_summary(session, q=q, animal_type=animal_type, limit=limit)


async def get_animal(session: AsyncSession, animal_pk: int) -> Animal:
    animal = await animal_repository.get_animal_by_id(session, animal_pk)
    if animal is None:
        raise AnimalNotFoundError(animal_pk)
    return animal
