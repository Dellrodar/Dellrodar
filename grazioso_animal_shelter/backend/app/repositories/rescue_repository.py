from dataclasses import dataclass

from sqlalchemy import ColumnElement, and_, case, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, OutcomeType
from app.models.rescue_profile import RescueProfile, RescueProfileBreed

# Score weights: breed similarity dominates, hard criteria add fixed points.
# A perfect match totals 100.
BREED_MAX_POINTS = 50.0
AGE_POINTS = 20.0
SEX_POINTS = 20.0
AVAILABILITY_POINTS = 10.0

# Outcomes that rule an animal out as a rescue-training candidate.
UNAVAILABLE_OUTCOMES = ("Died", "Euthanasia", "Disposal")


@dataclass
class ScoredMatch:
    animal: Animal
    score: float
    breed_score: float
    age_score: float
    sex_score: float
    availability_score: float


async def list_profiles(session: AsyncSession) -> list[RescueProfile]:
    result = await session.execute(
        select(RescueProfile).options(selectinload(RescueProfile.breeds)).order_by(RescueProfile.id)
    )
    return list(result.scalars().all())


async def get_profile_by_id(session: AsyncSession, profile_id: int) -> RescueProfile | None:
    result = await session.execute(
        select(RescueProfile)
        .options(selectinload(RescueProfile.breeds))
        .where(RescueProfile.id == profile_id)
    )
    return result.scalar_one_or_none()


def _breed_score(profile: RescueProfile) -> ColumnElement[float]:
    """Best weighted pg_trgm similarity between the animal's breed and any
    of the profile's preferred breeds, scaled to BREED_MAX_POINTS."""
    best_similarity = (
        select(
            func.max(
                func.least(
                    func.similarity(AnimalBreed.name, RescueProfileBreed.breed)
                    * RescueProfileBreed.weight,
                    1.0,
                )
            )
        )
        .select_from(RescueProfileBreed)
        .join(AnimalBreed, AnimalBreed.id == Animal.breed_id)
        .where(RescueProfileBreed.profile_id == profile.id)
        .correlate(Animal)
        .scalar_subquery()
    )
    return func.coalesce(best_similarity, 0.0) * BREED_MAX_POINTS


def _age_score(profile: RescueProfile) -> ColumnElement[float]:
    conditions = []
    if profile.min_age_weeks is not None:
        conditions.append(Animal.age_upon_outcome_in_weeks >= profile.min_age_weeks)
    if profile.max_age_weeks is not None:
        conditions.append(Animal.age_upon_outcome_in_weeks <= profile.max_age_weeks)
    if not conditions:
        # No age criterion: every candidate satisfies it.
        return literal(AGE_POINTS)
    return case(
        (and_(Animal.age_upon_outcome_in_weeks.is_not(None), *conditions), AGE_POINTS),
        else_=0.0,
    )


def _sex_score(profile: RescueProfile) -> ColumnElement[float]:
    if not profile.preferred_sex:
        return literal(SEX_POINTS)
    return case(
        (Animal.sex_ref.has(AnimalSex.name == profile.preferred_sex), SEX_POINTS),
        else_=0.0,
    )


def _availability_score() -> ColumnElement[float]:
    unavailable_ids = select(OutcomeType.id).where(OutcomeType.name.in_(UNAVAILABLE_OUTCOMES))
    return case(
        (
            or_(
                Animal.outcome_type_id.is_(None),
                Animal.outcome_type_id.not_in(unavailable_ids),
            ),
            AVAILABILITY_POINTS,
        ),
        else_=0.0,
    )


async def search_matches(
    session: AsyncSession,
    profile: RescueProfile,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ScoredMatch], int]:
    breed_score = _breed_score(profile)
    age_score = _age_score(profile)
    sex_score = _sex_score(profile)
    availability_score = _availability_score()
    total_score = breed_score + age_score + sex_score + availability_score

    candidate_filter = Animal.animal_type_id == profile.animal_type_id

    total = await session.scalar(select(func.count()).select_from(Animal).where(candidate_filter))

    result = await session.execute(
        select(Animal, breed_score, age_score, sex_score, availability_score, total_score)
        .where(candidate_filter)
        .order_by(total_score.desc(), Animal.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    matches = [
        ScoredMatch(
            animal=row[0],
            breed_score=round(row[1], 2),
            age_score=row[2],
            sex_score=row[3],
            availability_score=row[4],
            score=round(row[5], 2),
        )
        for row in result.all()
    ]
    return matches, total or 0
