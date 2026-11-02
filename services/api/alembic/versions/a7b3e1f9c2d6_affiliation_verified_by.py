"""how each verified role was proved

Revision ID: a7b3e1f9c2d6
Revises: a7e2c4f9b3d8
Create Date: 2026-10-26 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b3e1f9c2d6'
down_revision: Union[str, None] = 'a7e2c4f9b3d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Every role before this was proved by an emailed link, so existing rows
    # take the default.
    op.add_column(
        'affiliations',
        sa.Column('verified_by', sa.String(length=20), nullable=False, server_default='school_email'),
    )


def downgrade() -> None:
    op.drop_column('affiliations', 'verified_by')
