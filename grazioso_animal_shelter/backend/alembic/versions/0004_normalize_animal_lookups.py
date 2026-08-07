"""normalize animal reference data into lookup tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-01

Creates the animal_types, animal_breeds, animal_sexes, and outcome_types
lookup tables, backfills them from the existing flat text columns, points
animals and rescue_profiles at them through foreign keys, and drops the old
text columns. The pg_trgm index moves from animals.breed to
animal_breeds.name so similarity runs over distinct breed rows instead of
every animal row.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOOKUP_TABLES = (
    ("animal_types", 50),
    ("animal_breeds", 255),
    ("animal_sexes", 50),
    ("outcome_types", 50),
)


def _create_lookup_table(name: str, length: int) -> None:
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=length), nullable=False, unique=True),
    )


def upgrade() -> None:
    for table, length in LOOKUP_TABLES:
        _create_lookup_table(table, length)

    # Backfill lookups from existing data. Animal types union in the rescue
    # profile seeds because on a fresh database migration 0003 seeds profiles
    # before any animals are imported.
    op.execute(
        "INSERT INTO animal_types (name) "
        "SELECT DISTINCT animal_type FROM animals "
        "UNION SELECT DISTINCT animal_type FROM rescue_profiles"
    )
    op.execute("INSERT INTO animal_breeds (name) SELECT DISTINCT breed FROM animals")
    op.execute(
        "INSERT INTO animal_sexes (name) SELECT DISTINCT sex_upon_outcome FROM animals "
        "WHERE sex_upon_outcome IS NOT NULL"
    )
    op.execute(
        "INSERT INTO outcome_types (name) SELECT DISTINCT outcome_type FROM animals "
        "WHERE outcome_type IS NOT NULL"
    )

    # Add FK columns to animals, backfill from the lookups, then tighten.
    op.add_column("animals", sa.Column("animal_type_id", sa.Integer(), nullable=True))
    op.add_column("animals", sa.Column("breed_id", sa.Integer(), nullable=True))
    op.add_column("animals", sa.Column("sex_id", sa.Integer(), nullable=True))
    op.add_column("animals", sa.Column("outcome_type_id", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE animals a SET animal_type_id = t.id FROM animal_types t "
        "WHERE a.animal_type = t.name"
    )
    op.execute("UPDATE animals a SET breed_id = b.id FROM animal_breeds b WHERE a.breed = b.name")
    op.execute(
        "UPDATE animals a SET sex_id = s.id FROM animal_sexes s WHERE a.sex_upon_outcome = s.name"
    )
    op.execute(
        "UPDATE animals a SET outcome_type_id = o.id FROM outcome_types o "
        "WHERE a.outcome_type = o.name"
    )
    op.alter_column("animals", "animal_type_id", nullable=False)
    op.alter_column("animals", "breed_id", nullable=False)
    op.create_foreign_key(
        "fk_animals_animal_type_id", "animals", "animal_types", ["animal_type_id"], ["id"]
    )
    op.create_foreign_key("fk_animals_breed_id", "animals", "animal_breeds", ["breed_id"], ["id"])
    op.create_foreign_key("fk_animals_sex_id", "animals", "animal_sexes", ["sex_id"], ["id"])
    op.create_foreign_key(
        "fk_animals_outcome_type_id", "animals", "outcome_types", ["outcome_type_id"], ["id"]
    )
    op.create_index("ix_animals_animal_type_id", "animals", ["animal_type_id"])
    op.create_index("ix_animals_breed_id", "animals", ["breed_id"])
    op.create_index("ix_animals_sex_id", "animals", ["sex_id"])
    op.create_index("ix_animals_outcome_type_id", "animals", ["outcome_type_id"])

    # Same dance for rescue_profiles.animal_type.
    op.add_column("rescue_profiles", sa.Column("animal_type_id", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE rescue_profiles p SET animal_type_id = t.id FROM animal_types t "
        "WHERE p.animal_type = t.name"
    )
    op.alter_column("rescue_profiles", "animal_type_id", nullable=False)
    op.create_foreign_key(
        "fk_rescue_profiles_animal_type_id",
        "rescue_profiles",
        "animal_types",
        ["animal_type_id"],
        ["id"],
    )

    # Drop the old text columns and their indexes.
    op.execute("DROP INDEX IF EXISTS ix_animals_breed_trgm")
    op.drop_index("ix_animals_animal_type", table_name="animals")
    op.drop_column("animals", "animal_type")
    op.drop_column("animals", "breed")
    op.drop_column("animals", "sex_upon_outcome")
    op.drop_column("animals", "outcome_type")
    op.drop_column("rescue_profiles", "animal_type")

    # Relocate the trigram index onto the breed lookup names.
    op.execute(
        "CREATE INDEX ix_animal_breeds_name_trgm ON animal_breeds USING gin (name gin_trgm_ops)"
    )


def downgrade() -> None:
    # Restore the flat text columns from the lookups.
    op.add_column("animals", sa.Column("animal_type", sa.String(length=50), nullable=True))
    op.add_column("animals", sa.Column("breed", sa.String(length=255), nullable=True))
    op.add_column("animals", sa.Column("sex_upon_outcome", sa.String(length=50), nullable=True))
    op.add_column("animals", sa.Column("outcome_type", sa.String(length=50), nullable=True))
    op.execute(
        "UPDATE animals a SET animal_type = t.name FROM animal_types t "
        "WHERE a.animal_type_id = t.id"
    )
    op.execute("UPDATE animals a SET breed = b.name FROM animal_breeds b WHERE a.breed_id = b.id")
    op.execute(
        "UPDATE animals a SET sex_upon_outcome = s.name FROM animal_sexes s WHERE a.sex_id = s.id"
    )
    op.execute(
        "UPDATE animals a SET outcome_type = o.name FROM outcome_types o "
        "WHERE a.outcome_type_id = o.id"
    )
    op.alter_column("animals", "animal_type", nullable=False)
    op.alter_column("animals", "breed", nullable=False)

    op.add_column("rescue_profiles", sa.Column("animal_type", sa.String(length=50), nullable=True))
    op.execute(
        "UPDATE rescue_profiles p SET animal_type = t.name FROM animal_types t "
        "WHERE p.animal_type_id = t.id"
    )
    op.alter_column("rescue_profiles", "animal_type", nullable=False)

    # Drop FK columns and lookup tables, then restore the old indexes.
    op.drop_constraint("fk_rescue_profiles_animal_type_id", "rescue_profiles", type_="foreignkey")
    op.drop_column("rescue_profiles", "animal_type_id")
    op.drop_index("ix_animals_animal_type_id", table_name="animals")
    op.drop_index("ix_animals_breed_id", table_name="animals")
    op.drop_index("ix_animals_sex_id", table_name="animals")
    op.drop_index("ix_animals_outcome_type_id", table_name="animals")
    op.drop_constraint("fk_animals_animal_type_id", "animals", type_="foreignkey")
    op.drop_constraint("fk_animals_breed_id", "animals", type_="foreignkey")
    op.drop_constraint("fk_animals_sex_id", "animals", type_="foreignkey")
    op.drop_constraint("fk_animals_outcome_type_id", "animals", type_="foreignkey")
    op.drop_column("animals", "animal_type_id")
    op.drop_column("animals", "breed_id")
    op.drop_column("animals", "sex_id")
    op.drop_column("animals", "outcome_type_id")
    for table, _ in reversed(LOOKUP_TABLES):
        op.drop_table(table)

    op.create_index("ix_animals_animal_type", "animals", ["animal_type"])
    op.execute("CREATE INDEX ix_animals_breed_trgm ON animals USING gin (breed gin_trgm_ops)")
