"""separa consumo fisico de valor em R$ e classifica a origem dos lancamentos

Revision ID: 0010_consumo_valor_rs_origem
Revises: 0009_unique_lancamento_ponto_mes
Create Date: 2026-10-09 00:00:00.000000

Antes: `valor_numeric` guardava consumo físico (lançamento manual), R$ da fatura
(importação) ou kWh (script CPFL), e tudo era somado junto.

Depois:
  consumo   físico — m³ para água, kWh para luz. Nulo só em importado antigo
            que veio sem consumo; esses ficam fora dos indicadores físicos.
  valor_rs  R$ da fatura, opcional.
  origem    'manual' | 'importado' | 'cpfl_legado'.

Esta migration só CLASSIFICA, não apaga nada. Os indicadores ignoram
'cpfl_legado'; a exclusão física é feita por `scripts/excluir_cpfl_legado.py`.
"""
from __future__ import annotations

from collections import defaultdict

from alembic import op
import sqlalchemy as sa


revision = "0010_consumo_valor_rs_origem"
down_revision = "0009_unique_lancamento_ponto_mes"
branch_labels = None
depends_on = None

MESES_CONSECUTIVOS = 12


def _indice_do_mes(mes: str) -> int | None:
    try:
        ano, numero = mes.split("-")
        return int(ano) * 12 + int(numero) - 1
    except (AttributeError, ValueError):
        return None


def ids_cpfl_legado(linhas) -> set[int]:
    """Identifica a carga do script CPFL (total anual ÷ 12).

    `linhas`: (id, campus_id, valor, mes_referencia, created_at) dos lançamentos
    de luz sem ponto de medição. Uma linha é legado quando faz parte de uma
    sequência de 12 ou mais meses consecutivos, no mesmo campus, com exatamente
    o mesmo valor e criados no mesmo minuto. Qualquer coisa que não feche todas
    as condições fica de fora (e vira 'manual').
    """
    grupos: dict[tuple, dict[int, list[int]]] = defaultdict(lambda: defaultdict(list))
    for id_, campus_id, valor, mes, criado_em in linhas:
        indice = _indice_do_mes(mes)
        if indice is None:
            continue
        minuto = criado_em.replace(second=0, microsecond=0) if criado_em is not None else None
        grupos[(campus_id, valor, minuto)][indice].append(id_)

    legado: set[int] = set()
    for por_mes in grupos.values():
        meses = sorted(por_mes)
        inicio = 0
        for i in range(1, len(meses) + 1):
            fim_da_sequencia = i == len(meses) or meses[i] != meses[i - 1] + 1
            if not fim_da_sequencia:
                continue
            if i - inicio >= MESES_CONSECUTIVOS:
                for mes in meses[inicio:i]:
                    legado.update(por_mes[mes])
            inicio = i
    return legado


def upgrade() -> None:
    conn = op.get_bind()

    op.add_column("lancamentos", sa.Column("consumo", sa.Numeric(12, 3), nullable=True))
    op.add_column("lancamentos", sa.Column("valor_rs", sa.Numeric(12, 2), nullable=True))
    op.add_column("lancamentos", sa.Column("origem", sa.String(20), nullable=True))

    # 1. Importado: o consumo físico já estava em coluna própria; valor_numeric era R$.
    conn.execute(
        sa.text(
            """
            UPDATE lancamentos
               SET consumo = consumo_fisico, valor_rs = valor_numeric, origem = 'importado'
             WHERE ponto_medicao_id IS NOT NULL
            """
        )
    )

    # 2. Carga do script CPFL: valor_numeric era kWh. Fica marcada, não é apagada.
    candidatos = conn.execute(
        sa.text(
            """
            SELECT id, campus_id, valor_numeric, mes_referencia, created_at
              FROM lancamentos
             WHERE ponto_medicao_id IS NULL AND tipo = 'luz'
            """
        )
    ).all()
    legado = sorted(ids_cpfl_legado(candidatos))
    if legado:
        conn.execute(
            sa.text(
                "UPDATE lancamentos SET consumo = valor_numeric, origem = 'cpfl_legado' WHERE id = ANY(:ids)"
            ),
            {"ids": legado},
        )

    # 3. O resto é lançamento manual: valor_numeric era o consumo físico digitado.
    conn.execute(
        sa.text("UPDATE lancamentos SET consumo = valor_numeric, origem = 'manual' WHERE origem IS NULL")
    )

    op.alter_column("lancamentos", "origem", nullable=False)
    op.create_check_constraint(
        "ck_lancamentos_origem", "lancamentos", "origem IN ('manual', 'importado', 'cpfl_legado')"
    )
    op.create_index("ix_lancamentos_origem", "lancamentos", ["origem"])
    op.drop_column("lancamentos", "valor_numeric")
    op.drop_column("lancamentos", "consumo_fisico")

    contagem = conn.execute(
        sa.text(
            """
            SELECT campus_id, tipo, origem, count(*) AS n,
                   count(*) FILTER (WHERE consumo IS NULL) AS sem_consumo
              FROM lancamentos
             GROUP BY campus_id, tipo, origem
             ORDER BY origem, tipo, campus_id
            """
        )
    ).all()
    print("\n[0010] lançamentos classificados (campus | tipo | origem | n | sem consumo):")
    for campus_id, tipo, origem, n, sem_consumo in contagem:
        print(f"[0010]   campus {campus_id:>2} | {tipo:<4} | {origem:<11} | {n:>4} | {sem_consumo}")
    if not contagem:
        print("[0010]   (tabela vazia)")


def downgrade() -> None:
    # Volta ao modelo de uma coluna só. A marcação de origem se perde.
    op.add_column("lancamentos", sa.Column("valor_numeric", sa.Numeric(12, 2), nullable=True))
    op.add_column("lancamentos", sa.Column("consumo_fisico", sa.Numeric(12, 3), nullable=True))
    op.execute(
        """
        UPDATE lancamentos
           SET valor_numeric = COALESCE(valor_rs, 0), consumo_fisico = consumo
         WHERE origem = 'importado'
        """
    )
    op.execute("UPDATE lancamentos SET valor_numeric = COALESCE(consumo, 0) WHERE origem <> 'importado'")
    op.alter_column("lancamentos", "valor_numeric", nullable=False)
    op.drop_index("ix_lancamentos_origem", table_name="lancamentos")
    op.drop_constraint("ck_lancamentos_origem", "lancamentos", type_="check")
    op.drop_column("lancamentos", "origem")
    op.drop_column("lancamentos", "valor_rs")
    op.drop_column("lancamentos", "consumo")
