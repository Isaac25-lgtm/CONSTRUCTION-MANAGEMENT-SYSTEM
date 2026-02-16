"""Add notifications and BOQ tables

Revision ID: 006
Revises: 005
Create Date: 2026-02-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("notification_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("idx_notifications_org", "notifications", ["organization_id"])
    op.create_index("idx_notifications_user", "notifications", ["user_id"])
    op.create_index("idx_notifications_project", "notifications", ["project_id"])
    op.create_index("idx_notifications_type", "notifications", ["notification_type"])
    op.create_index("idx_notifications_is_read", "notifications", ["is_read"])
    op.create_index(
        "idx_notifications_user_created",
        "notifications",
        ["user_id", "created_at"],
    )

    op.create_table(
        "boq_headers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="UGX"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("idx_boq_headers_org_project", "boq_headers", ["organization_id", "project_id"])
    op.create_index("idx_boq_headers_project", "boq_headers", ["project_id"])

    op.create_table(
        "boq_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "header_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boq_headers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boq_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("item_code", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("quantity", sa.Numeric(15, 4), nullable=False, server_default="0"),
        sa.Column("rate", sa.Numeric(15, 4), nullable=False, server_default="0"),
        sa.Column("budget_cost", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("weight_out_of_10", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("percent_complete", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actual_cost", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("idx_boq_items_header", "boq_items", ["header_id"])
    op.create_index("idx_boq_items_parent", "boq_items", ["parent_item_id"])
    op.create_index("idx_boq_items_org_project", "boq_items", ["organization_id", "project_id"])


def downgrade():
    op.drop_index("idx_boq_items_org_project", table_name="boq_items")
    op.drop_index("idx_boq_items_parent", table_name="boq_items")
    op.drop_index("idx_boq_items_header", table_name="boq_items")
    op.drop_table("boq_items")

    op.drop_index("idx_boq_headers_project", table_name="boq_headers")
    op.drop_index("idx_boq_headers_org_project", table_name="boq_headers")
    op.drop_table("boq_headers")

    op.drop_index("idx_notifications_user_created", table_name="notifications")
    op.drop_index("idx_notifications_is_read", table_name="notifications")
    op.drop_index("idx_notifications_type", table_name="notifications")
    op.drop_index("idx_notifications_project", table_name="notifications")
    op.drop_index("idx_notifications_user", table_name="notifications")
    op.drop_index("idx_notifications_org", table_name="notifications")
    op.drop_table("notifications")
