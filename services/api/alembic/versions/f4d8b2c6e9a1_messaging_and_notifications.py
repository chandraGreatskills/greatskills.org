"""messaging and notifications

Revision ID: f4d8b2c6e9a1
Revises: e3c7a9b1d5f2
Create Date: 2026-11-01 15:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f4d8b2c6e9a1'
down_revision: Union[str, None] = 'e3c7a9b1d5f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base():
    return [
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    ]


def upgrade() -> None:
    op.create_table('conversations',
    sa.Column('pair_key', sa.String(length=80), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('started_by', sa.Uuid(), nullable=False),
    sa.Column('opportunity_id', sa.Uuid(), nullable=True),
    sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_synthetic', sa.Boolean(), nullable=False),
    *_base(),
    sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['started_by'], ['users.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('pair_key', name='uq_conversation_pair')
    )
    op.create_index(op.f('ix_conversations_status'), 'conversations', ['status'], unique=False)
    op.create_index(op.f('ix_conversations_last_message_at'), 'conversations', ['last_message_at'], unique=False)

    op.create_table('conversation_members',
    sa.Column('conversation_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('starred', sa.Boolean(), nullable=False),
    sa.Column('archived', sa.Boolean(), nullable=False),
    *_base(),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_member')
    )
    op.create_index(op.f('ix_conversation_members_conversation_id'), 'conversation_members', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_members_user_id'), 'conversation_members', ['user_id'], unique=False)

    op.create_table('messages',
    sa.Column('conversation_id', sa.Uuid(), nullable=False),
    sa.Column('sender_id', sa.Uuid(), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('unsent_at', sa.DateTime(timezone=True), nullable=True),
    *_base(),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_messages_conversation_created', 'messages', ['conversation_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)

    op.create_table('notifications',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('actor_id', sa.Uuid(), nullable=True),
    sa.Column('text', sa.String(length=300), nullable=False),
    sa.Column('link', sa.String(length=300), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    *_base(),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_notifications_read_at'), 'notifications', ['read_at'], unique=False)


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('messages')
    op.drop_table('conversation_members')
    op.drop_table('conversations')
