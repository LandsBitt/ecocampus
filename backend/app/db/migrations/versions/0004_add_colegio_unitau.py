"""adiciona Colegio UNITAU (campus id=7)

Revision ID: 0004_add_colegio_unitau
Revises: 0003_seed_campi_unitau
Create Date: 2026-05-12 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_add_colegio_unitau"
down_revision = "0003_seed_campi_unitau"
branch_labels = None
depends_on = None


def upgrade() -> None:
    campus_table = sa.table(
        "campus",
        sa.column("id", sa.Integer()),
        sa.column("nome", sa.String()),
        sa.column("populacao", sa.Integer()),
        sa.column("area_construida_m2", sa.Integer()),
    )
    op.execute("DELETE FROM campus WHERE id = 7")
    op.bulk_insert(
        campus_table,
        [{"id": 7, "nome": "Colégio UNITAU", "populacao": 0, "area_construida_m2": 0}],
    )
    op.execute(
        "SELECT setval(pg_get_serial_sequence('campus','id'), "
        "(SELECT COALESCE(MAX(id), 1) FROM campus))"
    )


def downgrade() -> None:
    op.execute("DELETE FROM lancamentos WHERE campus_id = 7")
    op.execute("DELETE FROM campus WHERE id = 7")
