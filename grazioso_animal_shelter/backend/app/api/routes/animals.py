from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.schemas.animal import (
    AnimalCreate,
    AnimalOut,
    AnimalPage,
    AnimalUpdate,
    BreedCount,
    BreedSummary,
)
from app.services import animal_service

router = APIRouter(
    prefix="/animals",
    tags=["animals"],
    dependencies=[Depends(get_current_user)],
)

# Write operations are limited to shelter staff and admins.
manage_animals = Depends(require_role("staff", "admin"))


@router.get("", response_model=AnimalPage)
async def search_animals(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Annotated[str | None, Query(max_length=100)] = None,
    animal_type: Annotated[str | None, Query(max_length=50)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    include_archived: Annotated[bool, Query()] = False,
) -> AnimalPage:
    animals, total = await animal_service.search_animals(
        db,
        q=q,
        animal_type=animal_type,
        page=page,
        page_size=page_size,
        include_archived=include_archived,
    )
    return AnimalPage(
        items=[AnimalOut.model_validate(a) for a in animals],
        total=total,
        page=page,
        page_size=page_size,
    )


# Registered before /{animal_pk} so the literal path wins route matching.
@router.get("/breed-summary", response_model=BreedSummary)
async def get_breed_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Annotated[str | None, Query(max_length=100)] = None,
    animal_type: Annotated[str | None, Query(max_length=50)] = None,
    limit: Annotated[int, Query(ge=1, le=25)] = 10,
) -> BreedSummary:
    top, other_count, total_animals = await animal_service.breed_summary(
        db, q=q, animal_type=animal_type, limit=limit
    )
    return BreedSummary(
        items=[BreedCount(breed=breed, count=count) for breed, count in top],
        other_count=other_count,
        total_animals=total_animals,
    )


@router.get("/{animal_pk}", response_model=AnimalOut)
async def get_animal(animal_pk: int, db: Annotated[AsyncSession, Depends(get_db)]) -> AnimalOut:
    try:
        animal = await animal_service.get_animal(db, animal_pk)
    except animal_service.AnimalNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Animal not found"
        ) from exc
    return AnimalOut.model_validate(animal)


@router.post(
    "",
    response_model=AnimalOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[manage_animals],
)
async def create_animal(
    payload: AnimalCreate, db: Annotated[AsyncSession, Depends(get_db)]
) -> AnimalOut:
    try:
        animal = await animal_service.create_animal(db, payload.model_dump())
    except animal_service.UnknownLookupValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown value for {exc.field}"
        ) from exc
    return AnimalOut.model_validate(animal)


@router.patch("/{animal_pk}", response_model=AnimalOut, dependencies=[manage_animals])
async def update_animal(
    animal_pk: int, payload: AnimalUpdate, db: Annotated[AsyncSession, Depends(get_db)]
) -> AnimalOut:
    try:
        animal = await animal_service.update_animal(
            db, animal_pk, payload.model_dump(exclude_unset=True)
        )
    except animal_service.AnimalNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Animal not found"
        ) from exc
    except animal_service.UnknownLookupValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown value for {exc.field}"
        ) from exc
    return AnimalOut.model_validate(animal)


@router.post("/{animal_pk}/archive", response_model=AnimalOut, dependencies=[manage_animals])
async def archive_animal(
    animal_pk: int, db: Annotated[AsyncSession, Depends(get_db)]
) -> AnimalOut:
    try:
        animal = await animal_service.set_archived(db, animal_pk, archived=True)
    except animal_service.AnimalNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Animal not found"
        ) from exc
    return AnimalOut.model_validate(animal)


@router.post("/{animal_pk}/unarchive", response_model=AnimalOut, dependencies=[manage_animals])
async def unarchive_animal(
    animal_pk: int, db: Annotated[AsyncSession, Depends(get_db)]
) -> AnimalOut:
    try:
        animal = await animal_service.set_archived(db, animal_pk, archived=False)
    except animal_service.AnimalNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Animal not found"
        ) from exc
    return AnimalOut.model_validate(animal)
