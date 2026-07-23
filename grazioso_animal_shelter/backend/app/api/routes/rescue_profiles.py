from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.animal import AnimalOut
from app.schemas.rescue import RescueMatchOut, RescueMatchPage, RescueProfileOut
from app.services import rescue_service

router = APIRouter(
    prefix="/rescue-profiles",
    tags=["rescue-profiles"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[RescueProfileOut])
async def list_profiles(db: Annotated[AsyncSession, Depends(get_db)]) -> list[RescueProfileOut]:
    profiles = await rescue_service.list_profiles(db)
    return [RescueProfileOut.model_validate(p) for p in profiles]


@router.get("/{profile_id}/matches", response_model=RescueMatchPage)
async def search_matches(
    profile_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> RescueMatchPage:
    try:
        profile, matches, total = await rescue_service.search_matches(
            db, profile_id, page=page, page_size=page_size
        )
    except rescue_service.ProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rescue profile not found"
        ) from exc

    return RescueMatchPage(
        profile=RescueProfileOut.model_validate(profile),
        items=[
            RescueMatchOut(
                animal=AnimalOut.model_validate(m.animal),
                score=m.score,
                breed_score=m.breed_score,
                age_score=m.age_score,
                sex_score=m.sex_score,
                availability_score=m.availability_score,
            )
            for m in matches
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
