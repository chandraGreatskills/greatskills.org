"""organization review and verified roles

Revision ID: e5f1c8a3d7b9
Revises: d4e9a1b7c2f5
Create Date: 2026-10-18 18:42:48.623314
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f1c8a3d7b9'
down_revision: Union[str, None] = 'd4e9a1b7c2f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('affiliations',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('org_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.String(length=20), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=True),
    sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('email_confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_affiliations_email'), 'affiliations', ['email'], unique=False)
    op.create_index(op.f('ix_affiliations_org_id'), 'affiliations', ['org_id'], unique=False)
    op.create_index(op.f('ix_affiliations_status'), 'affiliations', ['status'], unique=False)
    op.create_index(op.f('ix_affiliations_user_id'), 'affiliations', ['user_id'], unique=False)
    op.create_table('org_domains',
    sa.Column('org_id', sa.Uuid(), nullable=False),
    sa.Column('domain', sa.String(length=253), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_org_domains_domain'), 'org_domains', ['domain'], unique=True)
    op.create_index(op.f('ix_org_domains_org_id'), 'org_domains', ['org_id'], unique=False)
    # Until now only admins could attach an organization, so any that exist
    # are trusted. Fill them in as approved, then drop the database default:
    # new organizations start as pending, set by the app.
    op.add_column('organizations', sa.Column('status', sa.String(length=20), nullable=False, server_default='approved'))
    op.alter_column('organizations', 'status', server_default=None)
    op.add_column('organizations', sa.Column('created_by', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_organizations_status'), 'organizations', ['status'], unique=False)
    op.create_foreign_key('fk_organizations_created_by_users', 'organizations', 'users', ['created_by'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_organizations_created_by_users', 'organizations', type_='foreignkey')
    op.drop_index(op.f('ix_organizations_status'), table_name='organizations')
    op.drop_column('organizations', 'created_by')
    op.drop_column('organizations', 'status')
    op.drop_index(op.f('ix_org_domains_org_id'), table_name='org_domains')
    op.drop_index(op.f('ix_org_domains_domain'), table_name='org_domains')
    op.drop_table('org_domains')
    op.drop_index(op.f('ix_affiliations_user_id'), table_name='affiliations')
    op.drop_index(op.f('ix_affiliations_status'), table_name='affiliations')
    op.drop_index(op.f('ix_affiliations_org_id'), table_name='affiliations')
    op.drop_index(op.f('ix_affiliations_email'), table_name='affiliations')
    op.drop_table('affiliations')
