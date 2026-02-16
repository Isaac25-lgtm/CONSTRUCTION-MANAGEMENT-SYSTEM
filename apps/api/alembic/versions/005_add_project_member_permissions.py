"""Add granular project member permissions

Revision ID: 005
Revises: 004
Create Date: 2026-02-16
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "project_members",
        sa.Column("can_view_project", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_post_messages", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_upload_documents", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_edit_tasks", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_manage_milestones", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_manage_risks", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_manage_expenses", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "project_members",
        sa.Column("can_approve_expenses", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade():
    op.drop_column("project_members", "can_approve_expenses")
    op.drop_column("project_members", "can_manage_expenses")
    op.drop_column("project_members", "can_manage_risks")
    op.drop_column("project_members", "can_manage_milestones")
    op.drop_column("project_members", "can_edit_tasks")
    op.drop_column("project_members", "can_upload_documents")
    op.drop_column("project_members", "can_post_messages")
    op.drop_column("project_members", "can_view_project")
