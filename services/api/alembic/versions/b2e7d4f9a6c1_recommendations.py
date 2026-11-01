"""recommendations

Revision ID: b2e7d4f9a6c1
Revises: a1c4e7f2b9d3
Create Date: 2026-10-31 20:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2e7d4f9a6c1'
down_revision: Union[str, None] = 'a1c4e7f2b9d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('recommendations',
    sa.Column('author_id', sa.Uuid(), nullable=False),
    sa.Column('recipient_id', sa.Uuid(), nullable=False),
    sa.Column('relationship_kind', sa.String(length=20), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('shown_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_synthetic', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('author_id', 'recipient_id', name='uq_recommendation_pair')
    )
    op.create_index(op.f('ix_recommendations_author_id'), 'recommendations', ['author_id'], unique=False)
    op.create_index(op.f('ix_recommendations_recipient_id'), 'recommendations', ['recipient_id'], unique=False)
    op.create_index(op.f('ix_recommendations_status'), 'recommendations', ['status'], unique=False)
    op.create_index(op.f('ix_recommendations_is_synthetic'), 'recommendations', ['is_synthetic'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recommendations_is_synthetic'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_status'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_recipient_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_author_id'), table_name='recommendations')
    op.drop_table('recommendations')
