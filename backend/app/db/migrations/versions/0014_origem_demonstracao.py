"""origem 'demonstracao' para dados simulados

Revision ID: 0014_origem_demonstracao
Revises: 0013_lancamento_manual
Create Date: 2026-10-26 00:00:00.000000

SPEC R.0: sem dados reais, o sistema roda com dados de demonstração, e eles
precisam ser distinguíveis do que foi medido. Só `scripts/seed_fake_data.py`
grava esta origem. Entram nos cálculos como qualquer consumo; a API marca os
totais que os contêm.

- CHECK de `origem` passa a aceitar 'demonstracao'.
- Índice único parcial: um lançamento de demonstração por campus, tipo e mês.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0014_origem_demonstracao"
down_revision = "0013_lancamento_manual"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_lancamentos_origem", "lancamentos", type_="check")
    op.create_check_constraint(
        "ck_lancamentos_origem",
        "lancamentos",
        "origem IN ('manual', 'importado', 'cpfl_legado', 'demonstracao')",
    )
    op.create_index(
        "uq_lancamentos_demonstracao_campus_tipo_mes",
        "lancamentos",
        ["campus_id", "tipo", "mes_referencia"],
        unique=True,
        postgresql_where=sa.text("origem = 'demonstracao'"),
    )


def downgrade() -> None:
    # Voltar exige que não haja demonstração no banco: rode `seed_fake_data.py --wipe` antes.
    op.drop_index("uq_lancamentos_demonstracao_campus_tipo_mes", table_name="lancamentos")
    op.drop_constraint("ck_lancamentos_origem", "lancamentos", type_="check")
    op.create_check_constraint(
        "ck_lancamentos_origem", "lancamentos", "origem IN ('manual', 'importado', 'cpfl_legado')"
    )
