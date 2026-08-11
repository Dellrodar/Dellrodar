"""add archived_at to animals

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-10

Adds a nullable archived_at timestamp to animals. Null means the record is
active; a timestamp records when it was archived. Archiving replaces hard
deletes so records stay retrievable for audit.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("animals", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("animals", "archived_at")
