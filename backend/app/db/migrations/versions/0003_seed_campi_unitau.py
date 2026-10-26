"""seed campi UNITAU canonicos (limpa e recria)

Revision ID: 0003_seed_campi_unitau
Revises: 0002_campus_demographics
Create Date: 2026-05-12 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_seed_campi_unitau"
down_revision = "0002_campus_demographics"
branch_labels = None
depends_on = None


# Mantido inline para que a migration seja autocontida. Depois dela, a fonte
# dos campi é a própria tabela `campus` (não há mais cópia da lista no código).
CAMPI = [
    (1, "Campus da Juta"),
    (2, "Campus do Itaim"),
    (3, "Campus do Bom Conselho"),
    (4, "Polo da Saúde"),
    (5, "Direito"),
    (6, "Reitoria"),
]


def upgrade() -> None:
    # Limpa lançamentos antes (FK) e depois zera campus.
    op.execute("DELETE FROM lancamentos")
    op.execute("DELETE FROM campus")

    campus_table = sa.table(
        "campus",
        sa.column("id", sa.Integer()),
        sa.column("nome", sa.String()),
        sa.column("populacao", sa.Integer()),
        sa.column("area_construida_m2", sa.Integer()),
    )
    op.bulk_insert(
        campus_table,
        [
            {"id": cid, "nome": nome, "populacao": 0, "area_construida_m2": 0}
            for cid, nome in CAMPI
        ],
    )

    # Reseta a sequence (se o Postgres tiver criado uma pra coluna id).
    op.execute(
        "SELECT setval(pg_get_serial_sequence('campus','id'), "
        "(SELECT COALESCE(MAX(id), 1) FROM campus))"
    )


def downgrade() -> None:
    # Não restauramos o estado anterior (campi 1..8 legados foram apagados
    # intencionalmente). Apenas limpa os inseridos por esta migration.
    ids = ",".join(str(cid) for cid, _ in CAMPI)
    op.execute(f"DELETE FROM lancamentos WHERE campus_id IN ({ids})")
    op.execute(f"DELETE FROM campus WHERE id IN ({ids})")
