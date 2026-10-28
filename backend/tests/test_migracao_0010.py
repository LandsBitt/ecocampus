"""Migração 0010: separa consumo de R$ e classifica a origem, sem apagar nada.

O banco de teste volta para a revisão 0009, recebe dados no formato antigo
reproduzindo cada caso, e sobe de novo. Os dados são gravados de verdade (fora
da transação dos demais testes) e removidos no final.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from alembic import command
from sqlalchemy import text

from app.db.session import engine

ANTES = "0009_unique_lancamento_ponto_mes"
CRIADO = datetime(2026, 5, 12, 17, 32, 53, tzinfo=timezone.utc)

INSERE = text(
    """
    INSERT INTO lancamentos (campus_id, tipo, valor_numeric, mes_referencia, ponto_medicao_id, consumo_fisico, created_at)
    VALUES (:campus, CAST(:tipo AS lancamento_tipo), :valor, :mes, :ponto, :fisico, :criado)
    """
)


def _meses(inicio_ano: int, inicio_mes: int, quantidade: int) -> list[str]:
    saida = []
    ano, mes = inicio_ano, inicio_mes
    for _ in range(quantidade):
        saida.append(f"{ano:04d}-{mes:02d}")
        mes += 1
        if mes == 13:
            ano, mes = ano + 1, 1
    return saida


@pytest.fixture(scope="module")
def migrado(alembic_cfg):
    engine.dispose()
    command.downgrade(alembic_cfg, ANTES)

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM lancamentos"))
        ponto_a, ponto_b = conn.execute(
            text("SELECT id, campus_id FROM pontos_medicao WHERE tipo = 'agua' ORDER BY id LIMIT 2")
        ).all()

        def insere(campus, tipo, valor, mes, ponto=None, fisico=None, criado=CRIADO):
            conn.execute(
                INSERE,
                {"campus": campus, "tipo": tipo, "valor": valor, "mes": mes, "ponto": ponto, "fisico": fisico, "criado": criado},
            )

        # Manual: o número digitado era o consumo físico.
        insere(1, "agua", 500, "2026-01")
        # Importado com consumo físico: valor_numeric era a fatura em R$.
        insere(ponto_a.campus_id, "agua", 6940.69, "2026-01", ponto=ponto_a.id, fisico=694)
        # Importado sem consumo físico (a importação antiga aceitava).
        insere(ponto_b.campus_id, "agua", 100, "2026-01", ponto=ponto_b.id, fisico=None)
        # Carga do script CPFL: 12 meses consecutivos, mesmo valor, mesmo instante.
        for mes in _meses(2025, 1, 12):
            insere(2, "luz", 20001.41, mes)
        # Manual legítimo com dois meses de valor igual: NÃO é legado.
        insere(3, "luz", 18500, "2026-01")
        insere(3, "luz", 18500, "2026-02")
        # Quase-assinaturas, cada uma falhando em uma condição.
        for mes in _meses(2025, 1, 11):  # só 11 meses
            insere(4, "luz", 7000, mes)
        for i, mes in enumerate(_meses(2025, 1, 12)):  # 12 meses, mas digitados em horas diferentes
            insere(5, "luz", 8000, mes, criado=CRIADO + timedelta(hours=i))
        for mes in _meses(2025, 1, 6) + _meses(2025, 8, 6):  # 12 registros com um mês de buraco
            insere(7, "luz", 9000, mes)
        for mes in _meses(2025, 1, 12):  # assinatura completa, mas é água
            insere(8, "agua", 300, mes)

    command.upgrade(alembic_cfg, "head")
    yield {"ponto_a": ponto_a.id, "ponto_b": ponto_b.id}

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM lancamentos"))
    engine.dispose()


def _linhas(where: str, **params):
    with engine.connect() as conn:
        return conn.execute(
            text(f"SELECT origem, consumo, valor_rs FROM lancamentos WHERE {where} ORDER BY mes_referencia"), params
        ).all()


def test_colunas_antigas_somem(migrado):
    with engine.connect() as conn:
        colunas = set(
            conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'lancamentos'")
            ).scalars()
        )
    assert {"consumo", "valor_rs", "origem"} <= colunas
    assert not {"valor_numeric", "consumo_fisico"} & colunas


def test_nada_e_apagado(migrado):
    with engine.connect() as conn:
        total = conn.execute(text("SELECT count(*) FROM lancamentos")).scalar()
    assert total == 1 + 1 + 1 + 12 + 2 + 11 + 12 + 12 + 12


def test_manual_vira_consumo(migrado):
    assert _linhas("campus_id = 1 AND tipo = 'agua'") == [("manual", 500, None)]


def test_importado_separa_consumo_e_reais(migrado):
    [(origem, consumo, valor_rs)] = _linhas("ponto_medicao_id = :p", p=migrado["ponto_a"])
    assert origem == "importado"
    assert float(consumo) == 694
    assert float(valor_rs) == 6940.69


def test_importado_sem_consumo_fica_nulo_com_reais(migrado):
    assert _linhas("ponto_medicao_id = :p", p=migrado["ponto_b"]) == [("importado", None, 100)]


def test_carga_cpfl_e_marcada_e_preservada(migrado):
    linhas = _linhas("campus_id = 2 AND tipo = 'luz'")
    assert len(linhas) == 12
    assert {origem for origem, _, _ in linhas} == {"cpfl_legado"}
    assert {float(consumo) for _, consumo, _ in linhas} == {20001.41}


@pytest.mark.parametrize(
    ("campus", "tipo", "quantidade", "caso"),
    [
        (3, "luz", 2, "dois meses de valor igual"),
        (4, "luz", 11, "só 11 meses"),
        (5, "luz", 12, "criados em horas diferentes"),
        (7, "luz", 12, "meses não consecutivos"),
        (8, "agua", 12, "é água, não luz"),
    ],
)
def test_o_que_nao_fecha_todas_as_condicoes_e_manual(migrado, campus, tipo, quantidade, caso):
    linhas = _linhas("campus_id = :c AND tipo = CAST(:t AS lancamento_tipo)", c=campus, t=tipo)
    assert len(linhas) == quantidade
    assert {origem for origem, _, _ in linhas} == {"manual"}, caso


def test_downgrade_restaura_o_formato_antigo(migrado, alembic_cfg):
    engine.dispose()
    command.downgrade(alembic_cfg, ANTES)
    try:
        with engine.connect() as conn:
            manual = conn.execute(
                text("SELECT valor_numeric, consumo_fisico FROM lancamentos WHERE campus_id = 1 AND tipo = 'agua'")
            ).one()
            importado = conn.execute(
                text("SELECT valor_numeric, consumo_fisico FROM lancamentos WHERE ponto_medicao_id = :p"),
                {"p": migrado["ponto_a"]},
            ).one()
        assert (float(manual.valor_numeric), manual.consumo_fisico) == (500, None)
        assert (float(importado.valor_numeric), float(importado.consumo_fisico)) == (6940.69, 694)
    finally:
        engine.dispose()
        command.upgrade(alembic_cfg, "head")
