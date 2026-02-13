"""Fix risk schema with missing columns and update enums

Revision ID: 004
Revises: 003
Create Date: 2026-02-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to risks table
    op.add_column('risks', sa.Column('title', sa.String(), nullable=True))
    op.add_column('risks', sa.Column('risk_score', sa.Integer(), nullable=True))
    op.add_column('risks', sa.Column('contingency_plan', sa.Text(), nullable=True))

    # Populate title for existing rows (if any)
    op.execute("UPDATE risks SET title = 'Untitled Risk' WHERE title IS NULL")

    # Make title not nullable
    op.alter_column('risks', 'title', nullable=False)


def downgrade():
    op.drop_column('risks', 'contingency_plan')
    op.drop_column('risks', 'risk_score')
    op.drop_column('risks', 'title')
