"""add dream reactions

Revision ID: 9b1e3db2a71a
Revises: c07d6fc5e0ed
Create Date: 2026-10-12 14:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9b1e3db2a71a"
down_revision: str | Sequence[str] | None = "c07d6fc5e0ed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "dream_reactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dream_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dream_id"], ["dreams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dream_id", "user_id", name="uq_dream_reaction_user"),
    )
    op.create_index(
        op.f("ix_dream_reactions_dream_id"),
        "dream_reactions",
        ["dream_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dream_reactions_user_id"),
        "dream_reactions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_dream_reactions_user_id"), table_name="dream_reactions")
    op.drop_index(op.f("ix_dream_reactions_dream_id"), table_name="dream_reactions")
    op.drop_table("dream_reactions")
