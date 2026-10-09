"""Fórmula do Eco Score e faixas de classificação (sem banco)."""
from __future__ import annotations

from collections import namedtuple

import pytest

from app.core.eco_score import classify_score, compute_eco_score
from app.services.indicadores import calcular_indicadores

Totais = namedtuple("Totais", "id nome populacao area_construida_m2 agua luz total")


@pytest.mark.parametrize(
    ("consumo", "media", "nota"),
    [
        (50, 100, 100.0),   # metade da média ou menos: nota máxima
        (25, 100, 100.0),
        (80, 100, 70.0),
        (100, 100, 50.0),   # na média
        (120, 100, 30.0),
        (150, 100, 0.0),    # 50% acima ou mais: nota mínima
        (300, 100, 0.0),
        (0, 100, 100.0),
    ],
)
def test_nota_pela_razao_com_a_media(consumo, media, nota):
    assert compute_eco_score(consumo, media) == pytest.approx(nota)


@pytest.mark.parametrize("media", [0, -1])
def test_media_nao_positiva_nao_divide_por_zero(media):
    assert compute_eco_score(10, media) == 100.0


@pytest.mark.parametrize(
    ("nota", "faixa"),
    [
        (100, "Ecológico"),
        (70, "Ecológico"),
        (69.99, "Atenção"),
        (40, "Atenção"),
        (39.99, "Crítico"),
        (0, "Crítico"),
    ],
)
def test_faixas_de_classificacao(nota, faixa):
    assert classify_score(nota) == faixa


def test_campus_so_com_populacao_recebe_nota_so_de_agua():
    itens = calcular_indicadores(
        [
            Totais(1, "A", 1000, 0, 500, 10000, 10500),
            Totais(2, "B", 1000, 10000, 700, 14000, 14700),
        ]
    )
    a = itens[0]
    assert a.consumo_luz_por_m2 is None
    assert a.eco_score_luz is None
    assert a.eco_score == a.eco_score_agua
    assert a.normalizado is True


def test_lista_vazia():
    assert calcular_indicadores([]) == []
