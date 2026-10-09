"""registra de onde vieram populacao e area de cada campus

Revision ID: 0011_campus_demografia_fonte
Revises: 0010_consumo_valor_rs_origem
Create Date: 2026-10-09 00:00:00.000000

`demografia_fonte` guarda o setor que forneceu os números (ou 'FICTÍCIO' para
dados de desenvolvimento) e `demografia_referencia` a data a que se referem.
Sem isso não dá para distinguir, no banco, um valor real de um valor de teste.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0011_campus_demografia_fonte"
down_revision = "0010_consumo_valor_rs_origem"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("campus", sa.Column("demografia_fonte", sa.String(200), nullable=True))
    op.add_column("campus", sa.Column("demografia_referencia", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("campus", "demografia_referencia")
    op.drop_column("campus", "demografia_fonte")
