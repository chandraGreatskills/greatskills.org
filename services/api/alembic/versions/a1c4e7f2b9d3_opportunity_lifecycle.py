"""opportunity closing date, pay, eligibility, saved openings

Revision ID: a1c4e7f2b9d3
Revises: f6a2d9c4e8b1
Create Date: 2026-10-25 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c4e7f2b9d3'
down_revision: Union[str, None] = 'f6a2d9c4e8b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All nullable: existing openings have no closing date and stay open
    # until their poster closes them.
    op.add_column('opportunities', sa.Column('pay', sa.String(length=120), nullable=True))
    op.add_column('opportunities', sa.Column('eligibility', sa.String(length=300), nullable=True))
    op.add_column('opportunities', sa.Column('closes_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_opportunities_closes_at'), 'opportunities', ['closes_at'], unique=False)

    op.create_table('saved_opportunities',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('opportunity_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'opportunity_id', name='uq_saved_opportunity')
    )
    op.create_index(op.f('ix_saved_opportunities_opportunity_id'), 'saved_opportunities', ['opportunity_id'], unique=False)
    op.create_index(op.f('ix_saved_opportunities_user_id'), 'saved_opportunities', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_saved_opportunities_user_id'), table_name='saved_opportunities')
    op.drop_index(op.f('ix_saved_opportunities_opportunity_id'), table_name='saved_opportunities')
    op.drop_table('saved_opportunities')
    op.drop_index(op.f('ix_opportunities_closes_at'), table_name='opportunities')
    op.drop_column('opportunities', 'closes_at')
    op.drop_column('opportunities', 'eligibility')
    op.drop_column('opportunities', 'pay')
