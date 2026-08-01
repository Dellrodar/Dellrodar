"""Helpers for building normalized test data.

The animals and rescue_profiles tables reference lookup tables, so fixtures
create rows through these helpers instead of constructing models with flat
text fields.
"""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.models.rescue_profile import RescueProfile, RescueProfileBreed

LOOKUP_CLEANUP_ORDER = ("animal_breeds", "animal_sexes", "outcome_types", "animal_types")


async def get_or_create_lookup(session: AsyncSession, model: type, name: str | None) -> int | None:
    if name is None:
        return None
    existing = await session.scalar(select(model.id).where(model.name == name))
    if existing is not None:
        return existing
    row = model(name=name)
    session.add(row)
    await session.flush()
    return row.id


async def create_animal(
    session: AsyncSession,
    *,
    animal_id: str,
    animal_type: str,
    breed: str,
    name: str | None = None,
    color: str | None = None,
    sex_upon_outcome: str | None = None,
    date_of_birth: date | None = None,
    outcome_type: str | None = None,
    outcome_subtype: str | None = None,
    outcome_datetime: datetime | None = None,
    age_upon_outcome_in_weeks: float | None = None,
    location_lat: float | None = None,
    location_long: float | None = None,
) -> Animal:
    animal = Animal(
        animal_id=animal_id,
        name=name,
        animal_type_id=await get_or_create_lookup(session, AnimalType, animal_type),
        breed_id=await get_or_create_lookup(session, AnimalBreed, breed),
        color=color,
        sex_id=await get_or_create_lookup(session, AnimalSex, sex_upon_outcome),
        date_of_birth=date_of_birth,
        outcome_type_id=await get_or_create_lookup(session, OutcomeType, outcome_type),
        outcome_subtype=outcome_subtype,
        outcome_datetime=outcome_datetime,
        age_upon_outcome_in_weeks=age_upon_outcome_in_weeks,
        location_lat=location_lat,
        location_long=location_long,
    )
    session.add(animal)
    await session.flush()
    return animal


async def create_profile(
    session: AsyncSession,
    *,
    name: str,
    animal_type: str,
    preferred_sex: str | None = None,
    min_age_weeks: float | None = None,
    max_age_weeks: float | None = None,
    breeds: list[str] | None = None,
) -> RescueProfile:
    profile = RescueProfile(
        name=name,
        animal_type_id=await get_or_create_lookup(session, AnimalType, animal_type),
        preferred_sex=preferred_sex,
        min_age_weeks=min_age_weeks,
        max_age_weeks=max_age_weeks,
        breeds=[RescueProfileBreed(breed=breed, weight=1.0) for breed in breeds or []],
    )
    session.add(profile)
    await session.flush()
    return profile
