"""adiciona ponto_medicao_id e consumo_fisico em lancamentos

Revision ID: 0007_add_consumo_fisico_to_lancamentos
Revises: 0006_create_pontos_medicao
Create Date: 2026-06-01 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_add_consumo_fisico_to_lancamentos"
down_revision = "0006_create_pontos_medicao"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lancamentos",
        sa.Column("ponto_medicao_id", sa.Integer(), sa.ForeignKey("pontos_medicao.id"), nullable=True),
    )
    op.add_column(
        "lancamentos",
        sa.Column("consumo_fisico", sa.Numeric(12, 3), nullable=True),
    )
    op.create_index("ix_lancamentos_ponto_medicao_id", "lancamentos", ["ponto_medicao_id"])


def downgrade() -> None:
    op.drop_index("ix_lancamentos_ponto_medicao_id", table_name="lancamentos")
    op.drop_column("lancamentos", "consumo_fisico")
    op.drop_column("lancamentos", "ponto_medicao_id")
