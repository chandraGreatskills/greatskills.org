"""contact inquiries

Revision ID: b7c1e4a9d2f0
Revises: 66388daf63f9
Create Date: 2026-10-18 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c1e4a9d2f0'
down_revision: Union[str, None] = '66388daf63f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('contact_inquiries',
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('phone', sa.String(length=40), nullable=True),
    sa.Column('country', sa.String(length=80), nullable=True),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('source', sa.String(length=40), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('ip', sa.String(length=64), nullable=True),
    sa.Column('user_agent', sa.String(length=300), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_inquiries_email'), 'contact_inquiries', ['email'], unique=False)
    op.create_index(op.f('ix_contact_inquiries_source'), 'contact_inquiries', ['source'], unique=False)
    op.create_index(op.f('ix_contact_inquiries_status'), 'contact_inquiries', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_contact_inquiries_status'), table_name='contact_inquiries')
    op.drop_index(op.f('ix_contact_inquiries_source'), table_name='contact_inquiries')
    op.drop_index(op.f('ix_contact_inquiries_email'), table_name='contact_inquiries')
    op.drop_table('contact_inquiries')
