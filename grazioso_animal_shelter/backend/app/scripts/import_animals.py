"""Import AAC shelter outcome records from data/aac_shelter_outcomes.csv.

Usage: python -m app.scripts.import_animals [--replace]

The import is skipped when animal records already exist unless --replace is
passed, in which case existing animal rows are deleted first. Lookup rows are
upserted by name and never deleted, so re-imports cannot duplicate them.
"""

import argparse
import asyncio
import csv
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.animal import Animal
from app.models.lookups import AnimalBreed, AnimalSex, AnimalType, OutcomeType

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


def row_to_fields(row: dict[str, str]) -> dict[str, Any]:
    return {
        "animal_id": (row.get("animal_id") or "").strip(),
        "name": _text(row.get("name")),
        "animal_type": (row.get("animal_type") or "").strip(),
        "breed": (row.get("breed") or "").strip(),
        "color": _text(row.get("color")),
        "sex_upon_outcome": _text(row.get("sex_upon_outcome")),
        "date_of_birth": _date(row.get("date_of_birth")),
        "outcome_type": _text(row.get("outcome_type")),
        "outcome_subtype": _text(row.get("outcome_subtype")),
        "outcome_datetime": _datetime(row.get("datetime")),
        "age_upon_outcome_in_weeks": _float(row.get("age_upon_outcome_in_weeks")),
        "location_lat": _float(row.get("location_lat")),
        "location_long": _float(row.get("location_long")),
    }


async def _lookup_ids(session: AsyncSession, model: type, names: set[str | None]) -> dict[str, int]:
    """Upsert lookup names and return a name-to-id map."""
    values = sorted(name for name in names if name)
    if not values:
        return {}
    await session.execute(
        pg_insert(model)
        .values([{"name": name} for name in values])
        .on_conflict_do_nothing(index_elements=["name"])
    )
    result = await session.execute(select(model.name, model.id).where(model.name.in_(values)))
    return dict(result.all())


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

        # Pass 1: read and clean every row, collecting distinct lookup values.
        rows: list[dict[str, Any]] = []
        skipped = 0
        with CSV_PATH.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                fields = row_to_fields(row)
                # animal_id, animal_type, and breed are required by the schema.
                if not (fields["animal_id"] and fields["animal_type"] and fields["breed"]):
                    skipped += 1
                    continue
                rows.append(fields)

        # Pass 2: upsert lookups, then insert animals carrying lookup ids.
        type_ids = await _lookup_ids(session, AnimalType, {r["animal_type"] for r in rows})
        breed_ids = await _lookup_ids(session, AnimalBreed, {r["breed"] for r in rows})
        sex_ids = await _lookup_ids(session, AnimalSex, {r["sex_upon_outcome"] for r in rows})
        outcome_ids = await _lookup_ids(session, OutcomeType, {r["outcome_type"] for r in rows})

        imported = 0
        batch: list[Animal] = []
        for fields in rows:
            batch.append(
                Animal(
                    animal_id=fields["animal_id"],
                    name=fields["name"],
                    animal_type_id=type_ids[fields["animal_type"]],
                    breed_id=breed_ids[fields["breed"]],
                    color=fields["color"],
                    sex_id=sex_ids.get(fields["sex_upon_outcome"]),
                    date_of_birth=fields["date_of_birth"],
                    outcome_type_id=outcome_ids.get(fields["outcome_type"]),
                    outcome_subtype=fields["outcome_subtype"],
                    outcome_datetime=fields["outcome_datetime"],
                    age_upon_outcome_in_weeks=fields["age_upon_outcome_in_weeks"],
                    location_lat=fields["location_lat"],
                    location_long=fields["location_long"],
                )
            )
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
