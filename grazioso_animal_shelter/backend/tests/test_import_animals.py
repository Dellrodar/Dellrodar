import pytest
from sqlalchemy import func, select, text

from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType
from app.scripts import import_animals as importer
from tests.conftest import TestSessionLocal
from tests.factories import LOOKUP_CLEANUP_ORDER

CSV_HEADER = (
    "animal_id,name,animal_type,breed,color,sex_upon_outcome,date_of_birth,"
    "outcome_type,outcome_subtype,datetime,age_upon_outcome_in_weeks,"
    "location_lat,location_long"
)
CSV_ROWS = [
    # Complete record.
    "A300001,Rex,Dog,Labrador Retriever Mix,Brown,Intact Male,2020-01-01,"
    "Adoption,,2021-01-01T10:00:00,52.0,30.5,-97.3",
    # Duplicate breed with blank sex and outcome.
    "A300002,Fido,Dog,Labrador Retriever Mix,,,,,,,,,",
    # Second animal type and breed.
    "A300003,Tom,Cat,Domestic Shorthair Mix,,Neutered Male,,Transfer,,,,,",
    # Missing breed: skipped.
    "A300004,NoBreed,Dog,,,,,,,,,,",
    # Missing animal type: skipped.
    "A300005,NoType,,Beagle,,,,,,,,,",
]


@pytest.fixture
async def csv_import(tmp_path, monkeypatch):
    csv_path = tmp_path / "animals.csv"
    csv_path.write_text("\n".join([CSV_HEADER, *CSV_ROWS]) + "\n", encoding="utf-8")
    monkeypatch.setattr(importer, "CSV_PATH", csv_path)

    yield csv_path

    async with TestSessionLocal() as session:
        await session.execute(text("DELETE FROM animals"))
        for table in LOOKUP_CLEANUP_ORDER:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()


async def _count(session, model) -> int:
    return await session.scalar(select(func.count()).select_from(model))


async def test_import_populates_animals_and_lookups(csv_import):
    await importer.import_animals()

    async with TestSessionLocal() as session:
        assert await _count(session, Animal) == 3
        assert await _count(session, AnimalBreed) == 2
        assert await _count(session, AnimalType) == 2
        assert await _count(session, AnimalSex) == 2
        assert await _count(session, OutcomeType) == 2


async def test_import_skips_rows_missing_required_fields(csv_import):
    await importer.import_animals()

    async with TestSessionLocal() as session:
        imported_ids = set(await session.scalars(select(Animal.animal_id)))
    assert imported_ids == {"A300001", "A300002", "A300003"}


async def test_import_is_idempotent(csv_import):
    await importer.import_animals()
    await importer.import_animals()

    async with TestSessionLocal() as session:
        assert await _count(session, Animal) == 3
        assert await _count(session, AnimalBreed) == 2


async def test_replace_reloads_without_duplicating_lookups(csv_import):
    await importer.import_animals()
    await importer.import_animals(replace=True)

    async with TestSessionLocal() as session:
        assert await _count(session, Animal) == 3
        assert await _count(session, AnimalBreed) == 2
        assert await _count(session, AnimalType) == 2
        assert await _count(session, AnimalSex) == 2
        assert await _count(session, OutcomeType) == 2
