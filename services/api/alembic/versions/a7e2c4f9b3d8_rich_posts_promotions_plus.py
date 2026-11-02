"""rich posts, promotions, site updates, Achievers Plus

Revision ID: a7e2c4f9b3d8
Revises: f4d8b2c6e9a1
Create Date: 2026-11-01 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7e2c4f9b3d8'
down_revision: Union[str, None] = 'f4d8b2c6e9a1'
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
    # Existing posts are plain posts with no photos.
    op.add_column('posts', sa.Column('kind', sa.String(length=10), nullable=False, server_default='post'))
    op.add_column('posts', sa.Column('title', sa.String(length=200), nullable=True))
    op.add_column('posts', sa.Column('images', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('posts', sa.Column('video_url', sa.String(length=300), nullable=True))
    op.create_table('post_videos',
    sa.Column('owner_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=12), nullable=False),
    sa.Column('file_url', sa.String(length=300), nullable=True),
    sa.Column('poster_url', sa.String(length=300), nullable=True),
    sa.Column('duration_s', sa.Integer(), nullable=True),
    sa.Column('error', sa.String(length=200), nullable=True),
    *_base(),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_post_videos_owner_id'), 'post_videos', ['owner_id'], unique=False)
    op.add_column('posts', sa.Column('video_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_posts_video_id_post_videos', 'posts', 'post_videos', ['video_id'], ['id'], ondelete='SET NULL')
    op.alter_column('posts', 'kind', server_default=None)
    op.alter_column('posts', 'images', server_default=None)

    op.add_column('users', sa.Column('is_plus', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column('plus_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('can_upload_video', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column('users', 'is_plus', server_default=None)
    op.alter_column('users', 'can_upload_video', server_default=None)

    op.create_table('promotions',
    sa.Column('sponsor', sa.String(length=120), nullable=False),
    sa.Column('title', sa.String(length=160), nullable=False),
    sa.Column('body', sa.String(length=400), nullable=False),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('link_url', sa.String(length=500), nullable=False),
    sa.Column('cta', sa.String(length=40), nullable=False),
    sa.Column('placement', sa.String(length=10), nullable=False),
    sa.Column('audience', sa.String(length=10), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('impressions', sa.Integer(), nullable=False),
    sa.Column('clicks', sa.Integer(), nullable=False),
    *_base(),
    )
    op.create_index(op.f('ix_promotions_placement'), 'promotions', ['placement'], unique=False)
    op.create_index(op.f('ix_promotions_active'), 'promotions', ['active'], unique=False)

    op.create_table('site_updates',
    sa.Column('title', sa.String(length=160), nullable=False),
    sa.Column('body', sa.String(length=400), nullable=True),
    sa.Column('link', sa.String(length=500), nullable=True),
    sa.Column('published', sa.Boolean(), nullable=False),
    sa.Column('created_by', sa.Uuid(), nullable=True),
    *_base(),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_site_updates_published'), 'site_updates', ['published'], unique=False)


def downgrade() -> None:
    op.drop_table('site_updates')
    op.drop_table('promotions')
    op.drop_column('users', 'can_upload_video')
    op.drop_column('users', 'plus_requested_at')
    op.drop_column('users', 'is_plus')
    op.drop_constraint('fk_posts_video_id_post_videos', 'posts', type_='foreignkey')
    op.drop_column('posts', 'video_id')
    op.drop_table('post_videos')
    for col in ('video_url', 'images', 'title', 'kind'):
        op.drop_column('posts', col)
