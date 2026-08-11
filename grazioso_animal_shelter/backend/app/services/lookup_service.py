from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.repositories import lookup_repository


async def get_lookup_values(session: AsyncSession) -> dict[str, list[str]]:
    return {
        "animal_types": await lookup_repository.list_names(session, AnimalType),
        "breeds": await lookup_repository.list_names(session, AnimalBreed),
        "sexes": await lookup_repository.list_names(session, AnimalSex),
        "outcome_types": await lookup_repository.list_names(session, OutcomeType),
    }
