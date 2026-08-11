from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


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
    archived_at: datetime | None


class AnimalCreate(BaseModel):
    animal_id: str = Field(min_length=1, max_length=20)
    name: str | None = Field(default=None, max_length=100)
    animal_type: str = Field(min_length=1, max_length=50)
    breed: str = Field(min_length=1, max_length=255)
    color: str | None = Field(default=None, max_length=100)
    sex_upon_outcome: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = None
    outcome_type: str | None = Field(default=None, max_length=50)
    outcome_subtype: str | None = Field(default=None, max_length=50)
    outcome_datetime: datetime | None = None
    age_upon_outcome_in_weeks: float | None = Field(default=None, ge=0)
    location_lat: float | None = Field(default=None, ge=-90, le=90)
    location_long: float | None = Field(default=None, ge=-180, le=180)


class AnimalUpdate(BaseModel):
    animal_id: str | None = Field(default=None, min_length=1, max_length=20)
    name: str | None = Field(default=None, max_length=100)
    animal_type: str | None = Field(default=None, min_length=1, max_length=50)
    breed: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = Field(default=None, max_length=100)
    sex_upon_outcome: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = None
    outcome_type: str | None = Field(default=None, max_length=50)
    outcome_subtype: str | None = Field(default=None, max_length=50)
    outcome_datetime: datetime | None = None
    age_upon_outcome_in_weeks: float | None = Field(default=None, ge=0)
    location_lat: float | None = Field(default=None, ge=-90, le=90)
    location_long: float | None = Field(default=None, ge=-180, le=180)


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
