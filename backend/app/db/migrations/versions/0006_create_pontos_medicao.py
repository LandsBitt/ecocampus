"""cria tabela pontos_medicao

Revision ID: 0006_create_pontos_medicao
Revises: 0005_add_campus_arquitetura
Create Date: 2026-06-01 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_create_pontos_medicao"
down_revision = "0005_add_campus_arquitetura"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pontos_medicao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campus_id", sa.Integer(), sa.ForeignKey("campus.id"), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("endereco", sa.String(300), nullable=True),
        sa.Column(
            "tipo",
            sa.Enum("agua", "luz", name="lancamento_tipo", create_type=False),
            nullable=False,
        ),
        sa.Column("identificador", sa.String(60), nullable=True),
        sa.Column("codigo_instalacao", sa.BigInteger(), nullable=True),
        sa.Column("area_m2", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("populacao", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_index("ix_pontos_medicao_campus_id", "pontos_medicao", ["campus_id"])
    op.create_index("ix_pontos_medicao_tipo", "pontos_medicao", ["tipo"])


def downgrade() -> None:
    op.drop_index("ix_pontos_medicao_tipo", table_name="pontos_medicao")
    op.drop_index("ix_pontos_medicao_campus_id", table_name="pontos_medicao")
    op.drop_table("pontos_medicao")
