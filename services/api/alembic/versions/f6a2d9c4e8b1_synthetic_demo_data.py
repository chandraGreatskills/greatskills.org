"""synthetic demo data flags and site settings

Revision ID: f6a2d9c4e8b1
Revises: e5f1c8a3d7b9
Create Date: 2026-10-22 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a2d9c4e8b1'
down_revision: Union[str, None] = 'e5f1c8a3d7b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FLAGGED = ('users', 'organizations', 'opportunities')


def upgrade() -> None:
    op.create_table('site_settings',
    sa.Column('key', sa.String(length=64), nullable=False),
    sa.Column('value', sa.JSON(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_site_settings_key'), 'site_settings', ['key'], unique=True)
    # Every existing row is real, so fill the flag in as false, then drop the
    # database default: the app sets it on every insert.
    for table in FLAGGED:
        op.add_column(table, sa.Column('is_synthetic', sa.Boolean(), nullable=False, server_default=sa.false()))
        op.alter_column(table, 'is_synthetic', server_default=None)
        op.add_column(table, sa.Column('sim_tag', sa.String(length=64), nullable=True))
        op.create_index(op.f(f'ix_{table}_is_synthetic'), table, ['is_synthetic'], unique=False)
        op.create_index(op.f(f'ix_{table}_sim_tag'), table, ['sim_tag'], unique=False)


def downgrade() -> None:
    for table in reversed(FLAGGED):
        op.drop_index(op.f(f'ix_{table}_sim_tag'), table_name=table)
        op.drop_index(op.f(f'ix_{table}_is_synthetic'), table_name=table)
        op.drop_column(table, 'sim_tag')
        op.drop_column(table, 'is_synthetic')
    op.drop_index(op.f('ix_site_settings_key'), table_name='site_settings')
    op.drop_table('site_settings')
