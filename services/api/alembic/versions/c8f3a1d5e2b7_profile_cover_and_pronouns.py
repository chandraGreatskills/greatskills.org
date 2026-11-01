"""profile cover and pronouns

Revision ID: c8f3a1d5e2b7
Revises: b2e7d4f9a6c1
Create Date: 2026-10-31 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c8f3a1d5e2b7'
down_revision: Union[str, None] = 'b2e7d4f9a6c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('cover', sa.String(length=500), nullable=True))
    op.add_column('profiles', sa.Column('pronouns', sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'pronouns')
    op.drop_column('profiles', 'cover')
