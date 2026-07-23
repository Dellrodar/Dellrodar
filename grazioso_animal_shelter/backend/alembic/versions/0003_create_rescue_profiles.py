"""create rescue profile tables and seed CS340 profiles

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Rescue training criteria from the original Grazioso Salvare dashboard spec.
SEED_PROFILES = [
    {
        "name": "Water Rescue",
        "animal_type": "Dog",
        "preferred_sex": "Intact Female",
        "min_age_weeks": 26.0,
        "max_age_weeks": 156.0,
        "breeds": ["Labrador Retriever Mix", "Chesapeake Bay Retriever", "Newfoundland"],
    },
    {
        "name": "Mountain or Wilderness Rescue",
        "animal_type": "Dog",
        "preferred_sex": "Intact Male",
        "min_age_weeks": 26.0,
        "max_age_weeks": 156.0,
        "breeds": [
            "German Shepherd",
            "Alaskan Malamute",
            "Old English Sheepdog",
            "Siberian Husky",
            "Rottweiler",
        ],
    },
    {
        "name": "Disaster or Individual Tracking",
        "animal_type": "Dog",
        "preferred_sex": "Intact Male",
        "min_age_weeks": 20.0,
        "max_age_weeks": 300.0,
        "breeds": [
            "Doberman Pinscher",
            "German Shepherd",
            "Golden Retriever",
            "Bloodhound",
            "Rottweiler",
        ],
    },
]


def upgrade() -> None:
    profiles_table = op.create_table(
        "rescue_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("animal_type", sa.String(length=50), nullable=False),
        sa.Column("preferred_sex", sa.String(length=50), nullable=True),
        sa.Column("min_age_weeks", sa.Float(), nullable=True),
        sa.Column("max_age_weeks", sa.Float(), nullable=True),
    )

    breeds_table = op.create_table(
        "rescue_profile_breeds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "profile_id",
            sa.Integer(),
            sa.ForeignKey("rescue_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("breed", sa.String(length=255), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
    )
    op.create_index("ix_rescue_profile_breeds_profile_id", "rescue_profile_breeds", ["profile_id"])

    op.bulk_insert(
        profiles_table,
        [
            {
                "id": i,
                "name": p["name"],
                "animal_type": p["animal_type"],
                "preferred_sex": p["preferred_sex"],
                "min_age_weeks": p["min_age_weeks"],
                "max_age_weeks": p["max_age_weeks"],
            }
            for i, p in enumerate(SEED_PROFILES, start=1)
        ],
    )
    op.bulk_insert(
        breeds_table,
        [
            {"profile_id": i, "breed": breed, "weight": 1.0}
            for i, p in enumerate(SEED_PROFILES, start=1)
            for breed in p["breeds"]
        ],
    )
    # Keep the sequence in sync after seeding explicit ids.
    op.execute(
        "SELECT setval(pg_get_serial_sequence('rescue_profiles', 'id'), "
        "(SELECT max(id) FROM rescue_profiles))"
    )


def downgrade() -> None:
    op.drop_index("ix_rescue_profile_breeds_profile_id", table_name="rescue_profile_breeds")
    op.drop_table("rescue_profile_breeds")
    op.drop_table("rescue_profiles")
