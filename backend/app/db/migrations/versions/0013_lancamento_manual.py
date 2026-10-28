"""lancamento manual: limites, um por campus/tipo/mes e autoria

Revision ID: 0013_lancamento_manual
Revises: 0012_campus_fora_do_ranking
Create Date: 2026-10-14 00:00:00.000000

SPEC 1.10 (achados C7, C8, B2, B4; decisões D4 e D5):

- CHECK de consumo e valor em R$ (>= 0 e até 10 milhões) e do formato do mês.
  São os mesmos limites de app/core/limites.py, copiados aqui de propósito: a
  migration precisa continuar criando o que criava mesmo que a constante mude.
- Índice único parcial: um lançamento manual por campus, tipo e mês. Se o banco
  tiver manuais duplicados, a criação do índice falha e nada é apagado; resolva
  os duplicados à mão antes.
- Colunas `criado_por` (nula nos registros antigos) e `atualizado_em`
  (registros antigos recebem a data de criação).
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0013_lancamento_manual"
down_revision = "0012_campus_fora_do_ranking"
branch_labels = None
depends_on = None

TETO = "10000000"


def upgrade() -> None:
    op.create_check_constraint(
        "ck_lancamentos_consumo", "lancamentos", f"consumo IS NULL OR (consumo >= 0 AND consumo <= {TETO})"
    )
    op.create_check_constraint(
        "ck_lancamentos_valor_rs", "lancamentos", f"valor_rs IS NULL OR (valor_rs >= 0 AND valor_rs <= {TETO})"
    )
    op.create_check_constraint(
        "ck_lancamentos_mes", "lancamentos", "mes_referencia ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'"
    )
    op.create_index(
        "uq_lancamentos_manual_campus_tipo_mes",
        "lancamentos",
        ["campus_id", "tipo", "mes_referencia"],
        unique=True,
        postgresql_where=sa.text("origem = 'manual'"),
    )

    op.add_column("lancamentos", sa.Column("criado_por", sa.String(254), nullable=True))
    op.add_column(
        "lancamentos",
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("UPDATE lancamentos SET atualizado_em = created_at")


def downgrade() -> None:
    op.drop_column("lancamentos", "atualizado_em")
    op.drop_column("lancamentos", "criado_por")
    op.drop_index("uq_lancamentos_manual_campus_tipo_mes", table_name="lancamentos")
    op.drop_constraint("ck_lancamentos_mes", "lancamentos", type_="check")
    op.drop_constraint("ck_lancamentos_valor_rs", "lancamentos", type_="check")
    op.drop_constraint("ck_lancamentos_consumo", "lancamentos", type_="check")
