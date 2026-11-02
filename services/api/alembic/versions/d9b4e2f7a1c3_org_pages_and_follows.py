"""organization pages and follows

Revision ID: d9b4e2f7a1c3
Revises: c8f3a1d5e2b7
Create Date: 2026-11-01 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd9b4e2f7a1c3'
down_revision: Union[str, None] = 'c8f3a1d5e2b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('tagline', sa.String(length=200), nullable=True))
    op.create_table('org_follows',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('org_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'org_id', name='uq_org_follow')
    )
    op.create_index(op.f('ix_org_follows_org_id'), 'org_follows', ['org_id'], unique=False)
    op.create_index(op.f('ix_org_follows_user_id'), 'org_follows', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_org_follows_user_id'), table_name='org_follows')
    op.drop_index(op.f('ix_org_follows_org_id'), table_name='org_follows')
    op.drop_table('org_follows')
    op.drop_column('organizations', 'tagline')
