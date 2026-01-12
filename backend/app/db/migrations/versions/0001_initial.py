"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-01-12 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campus",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=120), nullable=False, unique=True),
    )
    op.create_table(
        "lancamentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campus_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.Enum("agua", "luz", name="lancamento_tipo"), nullable=False),
        sa.Column("valor_numeric", sa.Numeric(12, 2), nullable=False),
        sa.Column("mes_referencia", sa.String(length=7), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["campus_id"], ["campus.id"]),
    )
    op.create_index("ix_lancamentos_campus_id", "lancamentos", ["campus_id"])
    op.create_index("ix_lancamentos_mes_referencia", "lancamentos", ["mes_referencia"])


def downgrade() -> None:
    op.drop_index("ix_lancamentos_mes_referencia", table_name="lancamentos")
    op.drop_index("ix_lancamentos_campus_id", table_name="lancamentos")
    op.drop_table("lancamentos")
    op.drop_table("campus")
    op.execute("DROP TYPE IF EXISTS lancamento_tipo")
