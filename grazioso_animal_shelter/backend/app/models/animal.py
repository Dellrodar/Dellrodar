from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType


class Animal(Base):
    __tablename__ = "animals"

    id: Mapped[int] = mapped_column(primary_key=True)
    # AAC record id (e.g. "A746874"); not unique because one animal can have
    # multiple outcome records in the source data.
    animal_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(100))
    animal_type_id: Mapped[int] = mapped_column(
        ForeignKey("animal_types.id"), nullable=False, index=True
    )
    breed_id: Mapped[int] = mapped_column(
        ForeignKey("animal_breeds.id"), nullable=False, index=True
    )
    color: Mapped[str | None] = mapped_column(String(100))
    sex_id: Mapped[int | None] = mapped_column(ForeignKey("animal_sexes.id"), index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    outcome_type_id: Mapped[int | None] = mapped_column(ForeignKey("outcome_types.id"), index=True)
    outcome_subtype: Mapped[str | None] = mapped_column(String(50))
    outcome_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    age_upon_outcome_in_weeks: Mapped[float | None] = mapped_column(Float)
    location_lat: Mapped[float | None] = mapped_column(Float)
    location_long: Mapped[float | None] = mapped_column(Float)

    # Eager joins so the lookup names below never lazy-load on expired
    # instances under asyncio.
    animal_type_ref: Mapped[AnimalType] = relationship(lazy="joined", innerjoin=True)
    breed_ref: Mapped[AnimalBreed] = relationship(lazy="joined", innerjoin=True)
    sex_ref: Mapped[AnimalSex | None] = relationship(lazy="joined")
    outcome_type_ref: Mapped[OutcomeType | None] = relationship(lazy="joined")

    # Read-only name accessors keep the API schemas reading the same flat
    # string fields they did before normalization.
    @property
    def animal_type(self) -> str:
        return self.animal_type_ref.name

    @property
    def breed(self) -> str:
        return self.breed_ref.name

    @property
    def sex_upon_outcome(self) -> str | None:
        return self.sex_ref.name if self.sex_ref else None

    @property
    def outcome_type(self) -> str | None:
        return self.outcome_type_ref.name if self.outcome_type_ref else None
