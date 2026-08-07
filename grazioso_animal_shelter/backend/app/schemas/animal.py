from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AnimalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    animal_id: str
    name: str | None
    animal_type: str
    breed: str
    color: str | None
    sex_upon_outcome: str | None
    date_of_birth: date | None
    outcome_type: str | None
    outcome_subtype: str | None
    outcome_datetime: datetime | None
    age_upon_outcome_in_weeks: float | None
    location_lat: float | None
    location_long: float | None


class AnimalPage(BaseModel):
    items: list[AnimalOut]
    total: int
    page: int
    page_size: int


class BreedCount(BaseModel):
    breed: str
    count: int


class BreedSummary(BaseModel):
    items: list[BreedCount]
    other_count: int
    total_animals: int
