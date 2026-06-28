"""Add leaderboard and save indexes

Revision ID: 003
Revises: 002
Create Date: 2026-06-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove duplicate leaderboard rows before unique constraint (keep oldest row per user/game)
    op.execute(
        sa.text("""
        DELETE FROM leaderboard_entries
        WHERE id NOT IN (
            SELECT MIN(id) FROM leaderboard_entries
            GROUP BY game_id, user_id
        )
        """)
    )

    # SQLite cannot ALTER TABLE to add constraints — use batch recreate
    with op.batch_alter_table("leaderboard_entries", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_lb_game_user", ["game_id", "user_id"])
        batch_op.create_index("ix_lb_game_user", ["game_id", "user_id"], unique=False)
        batch_op.create_index("ix_lb_game_submitted", ["game_id", "submitted_at"], unique=False)

    op.create_index("ix_game_saves_user_id", "game_saves", ["user_id"], unique=False)
    # ix_user_achievements_user_id already created in revision 002


def downgrade() -> None:
    op.drop_index("ix_game_saves_user_id", table_name="game_saves")

    with op.batch_alter_table("leaderboard_entries", schema=None) as batch_op:
        batch_op.drop_index("ix_lb_game_submitted")
        batch_op.drop_index("ix_lb_game_user")
        batch_op.drop_constraint("uq_lb_game_user", type_="unique")
