"""permite deixar um campus fora do ranking, com motivo

Revision ID: 0012_campus_fora_do_ranking
Revises: 0011_campus_demografia_fonte
Create Date: 2026-10-09 00:00:00.000000

A Reitoria concentra 41 dos 72 pontos de medição (clínicas, EAD, DCE...), então
o consumo por pessoa dela não é comparável. Até os pontos serem reatribuídos
(SPEC 1.12), ela fica fora do ranking; o consumo continua no total da universidade.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0012_campus_fora_do_ranking"
down_revision = "0011_campus_demografia_fonte"
branch_labels = None
depends_on = None

MOTIVO_REITORIA = "Pontos de medição em revisão: parte das contas pertence a outras unidades."


def upgrade() -> None:
    op.add_column("campus", sa.Column("fora_do_ranking_motivo", sa.String(200), nullable=True))
    op.get_bind().execute(
        sa.text("UPDATE campus SET fora_do_ranking_motivo = :motivo WHERE nome = 'Reitoria'"),
        {"motivo": MOTIVO_REITORIA},
    )


def downgrade() -> None:
    op.drop_column("campus", "fora_do_ranking_motivo")
