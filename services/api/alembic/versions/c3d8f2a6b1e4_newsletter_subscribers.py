"""newsletter subscribers

Revision ID: c3d8f2a6b1e4
Revises: b7c1e4a9d2f0
Create Date: 2026-10-18 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d8f2a6b1e4'
down_revision: Union[str, None] = 'b7c1e4a9d2f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('newsletter_subscribers',
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('source', sa.String(length=120), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('ip', sa.String(length=64), nullable=True),
    sa.Column('user_agent', sa.String(length=300), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_newsletter_subscribers_email'), 'newsletter_subscribers', ['email'], unique=True)
    op.create_index(op.f('ix_newsletter_subscribers_status'), 'newsletter_subscribers', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_newsletter_subscribers_status'), table_name='newsletter_subscribers')
    op.drop_index(op.f('ix_newsletter_subscribers_email'), table_name='newsletter_subscribers')
    op.drop_table('newsletter_subscribers')
