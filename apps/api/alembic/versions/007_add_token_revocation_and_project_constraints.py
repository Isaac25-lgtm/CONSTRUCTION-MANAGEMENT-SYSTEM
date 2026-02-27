"""Add token revocation table and project data constraints

Revision ID: 007
Revises: 006
Create Date: 2026-02-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "revoked_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("jti", sa.String(), nullable=False),
        sa.Column("token_type", sa.String(), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("idx_revoked_tokens_jti", "revoked_tokens", ["jti"], unique=True)
    op.create_index("idx_revoked_tokens_user_id", "revoked_tokens", ["user_id"])
    op.create_index("idx_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])

    # Normalize any out-of-range legacy rows before applying strict check constraints.
    op.execute("UPDATE projects SET total_budget = 0 WHERE total_budget < 0")
    op.execute("UPDATE projects SET end_date = start_date WHERE end_date < start_date")

    op.create_check_constraint(
        "ck_projects_end_date_after_start_date",
        "projects",
        "end_date >= start_date",
    )
    op.create_check_constraint(
        "ck_projects_total_budget_non_negative",
        "projects",
        "total_budget >= 0",
    )


def downgrade():
    op.drop_constraint("ck_projects_total_budget_non_negative", "projects", type_="check")
    op.drop_constraint("ck_projects_end_date_after_start_date", "projects", type_="check")

    op.drop_index("idx_revoked_tokens_expires_at", table_name="revoked_tokens")
    op.drop_index("idx_revoked_tokens_user_id", table_name="revoked_tokens")
    op.drop_index("idx_revoked_tokens_jti", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
