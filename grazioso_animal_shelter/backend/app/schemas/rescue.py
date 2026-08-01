from pydantic import BaseModel, ConfigDict

from app.schemas.animal import AnimalOut


class RescueProfileBreedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    breed: str
    weight: float


class RescueProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    animal_type: str
    preferred_sex: str | None
    min_age_weeks: float | None
    max_age_weeks: float | None
    breeds: list[RescueProfileBreedOut]


class RescueMatchOut(BaseModel):
    animal: AnimalOut
    score: float
    breed_score: float
    age_score: float
    sex_score: float
    availability_score: float


class RescueMatchPage(BaseModel):
    profile: RescueProfileOut
    items: list[RescueMatchOut]
    total: int
    page: int
    page_size: int
