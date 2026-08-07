from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnimalType(Base):
    __tablename__ = "animal_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)


class AnimalBreed(Base):
    __tablename__ = "animal_breeds"

    # Trigram index so pg_trgm similarity searches on breed names stay fast.
    __table_args__ = (
        Index(
            "ix_animal_breeds_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)


class AnimalSex(Base):
    __tablename__ = "animal_sexes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)


class OutcomeType(Base):
    __tablename__ = "outcome_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
