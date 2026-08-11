from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType


async def list_names(
    session: AsyncSession,
    model: type[AnimalBreed | AnimalSex | AnimalType | OutcomeType],
) -> list[str]:
    result = await session.scalars(select(model.name).order_by(model.name))
    return list(result.all())
