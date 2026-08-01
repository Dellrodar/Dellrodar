from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rescue_profile import RescueProfile
from app.repositories import rescue_repository
from app.repositories.rescue_repository import ScoredMatch


class ProfileNotFoundError(Exception):
    pass


async def list_profiles(session: AsyncSession) -> list[RescueProfile]:
    return await rescue_repository.list_profiles(session)


async def search_matches(
    session: AsyncSession,
    profile_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[RescueProfile, list[ScoredMatch], int]:
    profile = await rescue_repository.get_profile_by_id(session, profile_id)
    if profile is None:
        raise ProfileNotFoundError(profile_id)

    matches, total = await rescue_repository.search_matches(
        session, profile, page=page, page_size=page_size
    )
    return profile, matches, total
