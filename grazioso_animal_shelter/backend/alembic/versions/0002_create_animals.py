"""create animals table and enable pg_trgm

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "animals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("animal_type", sa.String(length=50), nullable=False),
        sa.Column("breed", sa.String(length=255), nullable=False),
        sa.Column("color", sa.String(length=100), nullable=True),
        sa.Column("sex_upon_outcome", sa.String(length=50), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("outcome_type", sa.String(length=50), nullable=True),
        sa.Column("outcome_subtype", sa.String(length=50), nullable=True),
        sa.Column("outcome_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("age_upon_outcome_in_weeks", sa.Float(), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_long", sa.Float(), nullable=True),
    )
    op.create_index("ix_animals_animal_id", "animals", ["animal_id"])
    op.create_index("ix_animals_animal_type", "animals", ["animal_type"])
    # Trigram index so pg_trgm similarity searches on breed stay fast.
    op.execute("CREATE INDEX ix_animals_breed_trgm ON animals USING gin (breed gin_trgm_ops)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_animals_breed_trgm")
    op.drop_index("ix_animals_animal_type", table_name="animals")
    op.drop_index("ix_animals_animal_id", table_name="animals")
    op.drop_table("animals")
