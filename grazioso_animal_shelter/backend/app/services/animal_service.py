from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.models.user import User
from app.repositories import animal_repository, rescue_repository
from app.services import audit_service
from app.services.rescue_service import ProfileNotFoundError

# API fields that hold lookup names, mapped to the lookup model and the FK
# column they resolve to on Animal.
LOOKUP_FIELDS: dict[str, tuple[type, str]] = {
    "animal_type": (AnimalType, "animal_type_id"),
    "breed": (AnimalBreed, "breed_id"),
    "sex_upon_outcome": (AnimalSex, "sex_id"),
    "outcome_type": (OutcomeType, "outcome_type_id"),
}

# Lookup fields whose FK columns are NOT NULL, so null is never a valid value.
REQUIRED_LOOKUP_FIELDS = ("animal_type", "breed")


class AnimalNotFoundError(Exception):
    pass


class UnknownLookupValueError(Exception):
    def __init__(self, field: str, value: str | None) -> None:
        self.field = field
        self.value = value
        super().__init__(f"Unknown {field}: {value!r}")


async def search_animals(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
    include_archived: bool = False,
) -> tuple[list[Animal], int]:
    return await animal_repository.search_animals(
        session,
        q=q,
        animal_type=animal_type,
        page=page,
        page_size=page_size,
        include_archived=include_archived,
    )


async def breed_summary(
    session: AsyncSession,
    *,
    q: str | None = None,
    animal_type: str | None = None,
    profile_id: int | None = None,
    limit: int = 10,
) -> tuple[list[tuple[str, int]], int, int]:
    """Breed counts for the filtered set, scoped to a rescue profile's candidate pool when given.

    A profile scopes the summary by its animal type id, the same hard filter
    the matcher applies, so the totals line up with match results.
    """
    animal_type_id: int | None = None
    if profile_id is not None:
        profile = await rescue_repository.get_profile_by_id(session, profile_id)
        if profile is None:
            raise ProfileNotFoundError(profile_id)
        animal_type_id = profile.animal_type_id
    return await animal_repository.breed_summary(
        session, q=q, animal_type=animal_type, animal_type_id=animal_type_id, limit=limit
    )


async def get_animal(session: AsyncSession, animal_pk: int) -> Animal:
    animal = await animal_repository.get_animal_by_id(session, animal_pk)
    if animal is None:
        raise AnimalNotFoundError(animal_pk)
    return animal


async def _resolve_lookups(session: AsyncSession, data: dict[str, Any]) -> dict[str, Any]:
    """Replace lookup-name fields with their FK ids, rejecting unknown values.

    Only fields present in ``data`` are touched, so PATCH payloads resolve
    just the fields they carry.
    """
    resolved = dict(data)
    for field, (model, id_field) in LOOKUP_FIELDS.items():
        if field not in resolved:
            continue
        value = resolved.pop(field)
        if value is None:
            if field in REQUIRED_LOOKUP_FIELDS:
                raise UnknownLookupValueError(field, value)
            resolved[id_field] = None
            continue
        lookup_id = await animal_repository.get_lookup_id_by_name(session, model, value)
        if lookup_id is None:
            raise UnknownLookupValueError(field, value)
        resolved[id_field] = lookup_id
    return resolved


async def create_animal(session: AsyncSession, data: dict[str, Any], *, actor: User) -> Animal:
    resolved = await _resolve_lookups(session, data)
    animal = Animal(**resolved)
    session.add(animal)
    await session.flush()
    animal_pk = animal.id
    audit_service.record(
        session,
        actor=actor,
        action="animal.create",
        target_type="animal",
        target_id=animal_pk,
        detail=animal.animal_id,
    )
    await session.commit()
    # Re-select so the joined lookup refs are loaded for serialization.
    return await get_animal(session, animal_pk)


async def update_animal(
    session: AsyncSession, animal_pk: int, updates: dict[str, Any], *, actor: User
) -> Animal:
    animal = await get_animal(session, animal_pk)
    resolved = await _resolve_lookups(session, updates)
    for field, value in resolved.items():
        setattr(animal, field, value)
    audit_service.record(
        session,
        actor=actor,
        action="animal.update",
        target_type="animal",
        target_id=animal_pk,
        detail=f"fields updated {', '.join(sorted(updates))}",
    )
    await session.commit()
    return await get_animal(session, animal_pk)


async def set_archived(
    session: AsyncSession, animal_pk: int, *, archived: bool, actor: User
) -> Animal:
    animal = await get_animal(session, animal_pk)
    animal.archived_at = datetime.now(UTC) if archived else None
    audit_service.record(
        session,
        actor=actor,
        action="animal.archive" if archived else "animal.unarchive",
        target_type="animal",
        target_id=animal_pk,
        detail=animal.animal_id,
    )
    await session.commit()
    return await get_animal(session, animal_pk)
