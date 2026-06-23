"""Create user_achievements and leaderboard_entries tables

Revision ID: 002
Revises: 001
Create Date: 2026-06-22

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("achievement_key", sa.String(length=128), nullable=False),
        sa.Column("game_id", sa.String(length=64), nullable=True),
        sa.Column("unlocked_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement"),
    )
    op.create_index(op.f("ix_user_achievements_user_id"), "user_achievements", ["user_id"])

    op.create_table(
        "leaderboard_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("score_data", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_leaderboard_entries_game_id"), "leaderboard_entries", ["game_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_leaderboard_entries_game_id"), table_name="leaderboard_entries")
    op.drop_table("leaderboard_entries")
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_table("user_achievements")
