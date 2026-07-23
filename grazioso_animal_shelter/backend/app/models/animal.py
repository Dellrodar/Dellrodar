from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Animal(Base):
    __tablename__ = "animals"

    id: Mapped[int] = mapped_column(primary_key=True)
    # AAC record id (e.g. "A746874"); not unique because one animal can have
    # multiple outcome records in the source data.
    animal_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(100))
    animal_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    breed: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str | None] = mapped_column(String(100))
    sex_upon_outcome: Mapped[str | None] = mapped_column(String(50))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    outcome_type: Mapped[str | None] = mapped_column(String(50))
    outcome_subtype: Mapped[str | None] = mapped_column(String(50))
    outcome_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    age_upon_outcome_in_weeks: Mapped[float | None] = mapped_column(Float)
    location_lat: Mapped[float | None] = mapped_column(Float)
    location_long: Mapped[float | None] = mapped_column(Float)
