from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.lookups import AnimalType


class RescueProfile(Base):
    __tablename__ = "rescue_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    animal_type_id: Mapped[int] = mapped_column(ForeignKey("animal_types.id"), nullable=False)
    preferred_sex: Mapped[str | None] = mapped_column(String(50))
    min_age_weeks: Mapped[float | None] = mapped_column(Float)
    max_age_weeks: Mapped[float | None] = mapped_column(Float)

    animal_type_ref: Mapped[AnimalType] = relationship(lazy="joined", innerjoin=True)

    breeds: Mapped[list["RescueProfileBreed"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )

    @property
    def animal_type(self) -> str:
        return self.animal_type_ref.name


class RescueProfileBreed(Base):
    __tablename__ = "rescue_profile_breeds"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("rescue_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Kept as text rather than a lookup FK: profile breeds are fuzzy search
    # terms for pg_trgm similarity and need not exist in the animal data.
    breed: Mapped[str] = mapped_column(String(255), nullable=False)
    # Relative importance of this breed within the profile; scales the
    # pg_trgm similarity contribution during match scoring.
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    profile: Mapped[RescueProfile] = relationship(back_populates="breeds")
