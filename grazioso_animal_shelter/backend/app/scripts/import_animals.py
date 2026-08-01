"""Import AAC shelter outcome records from data/aac_shelter_outcomes.csv.

Usage: python -m app.scripts.import_animals [--replace]

The import is skipped when animal records already exist unless --replace is
passed, in which case existing rows are deleted first.
"""

import argparse
import asyncio
import csv
from datetime import UTC, date, datetime
from pathlib import Path

from sqlalchemy import delete, func, select

from app.db.session import AsyncSessionLocal
from app.models.animal import Animal

CSV_PATH = Path(__file__).resolve().parents[2] / "data" / "aac_shelter_outcomes.csv"
BATCH_SIZE = 1000


def _text(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def _float(value: str | None) -> float | None:
    value = (value or "").strip()
    return float(value) if value else None


def _date(value: str | None) -> date | None:
    value = (value or "").strip()
    return date.fromisoformat(value) if value else None


def _datetime(value: str | None) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    # Source timestamps are naive local values; store them as UTC so they fit
    # the timezone-aware column without shifting.
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def row_to_animal(row: dict[str, str]) -> Animal:
    return Animal(
        animal_id=(row["animal_id"] or "").strip(),
        name=_text(row.get("name")),
        animal_type=(row["animal_type"] or "").strip(),
        breed=(row["breed"] or "").strip(),
        color=_text(row.get("color")),
        sex_upon_outcome=_text(row.get("sex_upon_outcome")),
        date_of_birth=_date(row.get("date_of_birth")),
        outcome_type=_text(row.get("outcome_type")),
        outcome_subtype=_text(row.get("outcome_subtype")),
        outcome_datetime=_datetime(row.get("datetime")),
        age_upon_outcome_in_weeks=_float(row.get("age_upon_outcome_in_weeks")),
        location_lat=_float(row.get("location_lat")),
        location_long=_float(row.get("location_long")),
    )


async def import_animals(replace: bool = False) -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(func.count()).select_from(Animal))
        if existing:
            if not replace:
                print(f"Animals already imported ({existing} rows); use --replace to reload")
                return
            await session.execute(delete(Animal))
            print(f"Deleted {existing} existing animal rows")

        imported = 0
        skipped = 0
        with CSV_PATH.open(newline="", encoding="utf-8") as f:
            batch: list[Animal] = []
            for row in csv.DictReader(f):
                animal = row_to_animal(row)
                # animal_id, animal_type, and breed are required by the schema.
                if not (animal.animal_id and animal.animal_type and animal.breed):
                    skipped += 1
                    continue
                batch.append(animal)
                if len(batch) >= BATCH_SIZE:
                    session.add_all(batch)
                    await session.flush()
                    imported += len(batch)
                    batch = []
            if batch:
                session.add_all(batch)
                await session.flush()
                imported += len(batch)

        await session.commit()
        print(f"Imported {imported} animal records ({skipped} skipped)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--replace", action="store_true", help="delete existing animal rows before importing"
    )
    args = parser.parse_args()
    asyncio.run(import_animals(replace=args.replace))


if __name__ == "__main__":
    main()
