"""Rename audit log metadata column to details

Revision ID: 003
Revises: 002
Create Date: 2026-02-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Rename metadata column to details
    op.execute('ALTER TABLE audit_logs RENAME COLUMN metadata TO details')


def downgrade():
    # Rename details column back to metadata
    op.execute('ALTER TABLE audit_logs RENAME COLUMN details TO metadata')
