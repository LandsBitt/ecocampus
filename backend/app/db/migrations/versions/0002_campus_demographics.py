"""campus demographics (populacao, area_construida_m2)

Revision ID: 0002_campus_demographics
Revises: 0001_initial
Create Date: 2026-05-08 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_campus_demographics"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "campus",
        sa.Column("populacao", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "campus",
        sa.Column("area_construida_m2", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("campus", "area_construida_m2")
    op.drop_column("campus", "populacao")
