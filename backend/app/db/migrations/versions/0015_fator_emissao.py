"""fator de emissão anual do SIN

Revision ID: 0015_fator_emissao
Revises: 0014_origem_demonstracao
Create Date: 2026-10-26 00:00:00.000000

SPEC R.2 (GreenMetric EC8): pegada de carbono da energia = kWh × fator médio
anual do Sistema Interligado Nacional publicado pelo MCTI, em tCO₂/MWh (que é o
mesmo que kgCO₂/kWh). Um fator por ano. A tabela nasce vazia: os valores
entram pelo seed local ou pela API, nunca por migration.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0015_fator_emissao"
down_revision = "0014_origem_demonstracao"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fator_emissao",
        sa.Column("ano", sa.Integer(), primary_key=True),
        sa.Column("fator", sa.Numeric(8, 5), nullable=False),
        sa.Column("provisorio", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fonte", sa.String(500), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("ano BETWEEN 2000 AND 2099", name="ck_fator_emissao_ano"),
        sa.CheckConstraint("fator > 0 AND fator < 2", name="ck_fator_emissao_fator"),
    )


def downgrade() -> None:
    op.drop_table("fator_emissao")
