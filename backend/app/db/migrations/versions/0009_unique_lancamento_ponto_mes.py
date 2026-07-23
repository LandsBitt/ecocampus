"""unicidade de lancamentos por ponto de medicao e mes

Revision ID: 0009_unique_lancamento_ponto_mes
Revises: 0008_seed_pontos_medicao
Create Date: 2026-07-16 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_unique_lancamento_ponto_mes"
down_revision = "0008_seed_pontos_medicao"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove duplicatas criadas antes da constraint (mantém o registro mais antigo).
    op.execute(
        """
        DELETE FROM lancamentos a
        USING lancamentos b
        WHERE a.ponto_medicao_id IS NOT NULL
          AND a.ponto_medicao_id = b.ponto_medicao_id
          AND a.mes_referencia = b.mes_referencia
          AND a.id > b.id
        """
    )
    # Índice único parcial: lançamentos manuais (ponto_medicao_id IS NULL) ficam fora.
    op.create_index(
        "uq_lancamentos_ponto_mes",
        "lancamentos",
        ["ponto_medicao_id", "mes_referencia"],
        unique=True,
        postgresql_where=sa.text("ponto_medicao_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_lancamentos_ponto_mes", table_name="lancamentos")
