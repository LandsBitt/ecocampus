"""Fórmula do Eco Score, faixas e regras de quem recebe nota (sem banco)."""
from __future__ import annotations

from collections import namedtuple

import pytest

from app.core.eco_score import classify_score, compute_eco_score
from app.services.indicadores import calcular_indicadores, ordenar_ranking

Totais = namedtuple(
    "Totais",
    "id nome populacao area_construida_m2 agua luz total n_agua n_luz fora_do_ranking_motivo",
)


def campus(id, populacao, area, agua=None, luz=None, fora=None, nome=None):
    """Totais de um campus. `agua`/`luz` = None significa "sem lançamento no período"."""
    return Totais(
        id,
        nome or f"Campus {id}",
        populacao,
        area,
        agua or 0,
        luz or 0,
        (agua or 0) + (luz or 0),
        0 if agua is None else 1,
        0 if luz is None else 1,
        fora,
    )


def por_id(itens):
    return {i.campus_id: i for i in itens}


# --- fórmula ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("consumo", "referencia", "nota"),
    [
        (50, 100, 100.0),   # metade da referência ou menos: nota máxima
        (25, 100, 100.0),
        (80, 100, 70.0),
        (100, 100, 50.0),   # exatamente na referência
        (120, 100, 30.0),
        (150, 100, 0.0),    # 50% acima ou mais: nota mínima
        (300, 100, 0.0),
        (0, 100, 100.0),
    ],
)
def test_nota_pela_razao_com_a_referencia(consumo, referencia, nota):
    assert compute_eco_score(consumo, referencia) == pytest.approx(nota)


@pytest.mark.parametrize("referencia", [0, -1])
def test_referencia_nao_positiva_nao_divide_por_zero(referencia):
    assert compute_eco_score(10, referencia) == 100.0


@pytest.mark.parametrize(
    ("nota", "faixa"),
    [
        (100, "Ecológico"),
        (70, "Ecológico"),
        (69.99, "Na média"),
        (50, "Na média"),
        (40, "Na média"),
        (39.99, "Crítico"),
        (0, "Crítico"),
    ],
)
def test_faixas_de_classificacao(nota, faixa):
    assert classify_score(nota) == faixa


# --- exemplo calculado à mão -------------------------------------------------


def test_exemplo_da_metodologia_calculado_a_mao():
    """Exemplo para explicar a metodologia (usado no relatório final).

    Três campi, um mês:

        Campus   Pessoas   Área (m²)   Água (m³)   Energia (kWh)
        A          1.000      10.000        400          8.000
        B            500       5.000        350          7.000
        C          2.500      25.000      1.250         25.000
        Total      4.000      40.000      2.000         40.000

    Referência da universidade (ponderada = total ÷ total):
        água     2.000 m³ ÷ 4.000 pessoas = 0,50 m³/pessoa
        energia  40.000 kWh ÷ 40.000 m²   = 1,00 kWh/m²

    (A média simples dos três campi daria 0,533 m³/pessoa: B, o menor, pesaria
    tanto quanto C, que tem cinco vezes mais gente.)

    Nota de cada medida = 100 − (consumo ÷ referência − 0,5) × 100, entre 0 e 100.

        Campus   m³/pessoa  ÷ref  nota água   kWh/m²  ÷ref  nota energia   Eco Score
        A           0,40    0,80     70        0,80   0,80      70          70  Ecológico
        B           0,70    1,40     10        1,40   1,40      10          10  Crítico
        C           0,50    1,00     50        1,00   1,00      50          50  Na média

    kWh por pessoa (só exibido, não entra na nota): A = 8, B = 14, C = 10.
    """
    itens = por_id(
        calcular_indicadores(
            [
                campus(1, 1000, 10000, agua=400, luz=8000, nome="A"),
                campus(2, 500, 5000, agua=350, luz=7000, nome="B"),
                campus(3, 2500, 25000, agua=1250, luz=25000, nome="C"),
            ]
        )
    )
    a, b, c = itens[1], itens[2], itens[3]

    assert a.referencia_agua_per_capita == pytest.approx(0.50)
    assert a.referencia_luz_por_m2 == pytest.approx(1.00)

    assert (a.consumo_agua_per_capita, a.consumo_luz_por_m2) == pytest.approx((0.40, 0.80))
    assert (a.eco_score_agua, a.eco_score_luz, a.eco_score) == pytest.approx((70, 70, 70))
    assert a.classificacao == "Ecológico"

    assert (b.consumo_agua_per_capita, b.consumo_luz_por_m2) == pytest.approx((0.70, 1.40))
    assert (b.eco_score_agua, b.eco_score_luz, b.eco_score) == pytest.approx((10, 10, 10))
    assert b.classificacao == "Crítico"

    assert (c.consumo_agua_per_capita, c.consumo_luz_por_m2) == pytest.approx((0.50, 1.00))
    assert (c.eco_score_agua, c.eco_score_luz, c.eco_score) == pytest.approx((50, 50, 50))
    assert c.classificacao == "Na média"

    assert [i.consumo_luz_per_capita for i in (a, b, c)] == pytest.approx([8, 14, 10])


def test_referencia_e_ponderada_e_nao_media_simples():
    # Critério de aceite do SPEC: A (1.000 pessoas, 500 m³) e B (100 pessoas, 100 m³).
    itens = calcular_indicadores([campus(1, 1000, 1, agua=500), campus(2, 100, 1, agua=100)])
    assert itens[0].referencia_agua_per_capita == pytest.approx(600 / 1100)
    assert itens[0].referencia_agua_per_capita != pytest.approx((0.5 + 1.0) / 2)


# --- quem recebe nota --------------------------------------------------------


def test_campus_sem_lancamento_nao_tem_nota_nem_pesa_na_referencia():
    """Achado C2: antes, sem dado = consumo zero = nota 100 e 1º lugar."""
    itens = por_id(
        calcular_indicadores(
            [
                campus(1, 1000, 10000, agua=500, luz=10000),
                campus(2, 1000, 10000, agua=700, luz=14000),
                campus(3, 1000, 10000),  # cadastro completo, nenhum lançamento
            ]
        )
    )
    sem = itens[3]
    assert sem.situacao == "sem_dados"
    assert sem.tem_dados is False
    assert (sem.eco_score, sem.classificacao) == (None, None)
    assert (sem.consumo_agua_per_capita, sem.consumo_luz_por_m2) == (None, None)
    # A referência usa só A e B: 1.200 m³ ÷ 2.000 pessoas (com C seria 0,4).
    assert itens[1].referencia_agua_per_capita == pytest.approx(0.6)


def test_mes_sem_nenhum_lancamento_nao_gera_nota():
    itens = calcular_indicadores([campus(1, 1000, 10000), campus(2, 0, 0)])
    assert [i.eco_score for i in itens] == [None, None]
    assert [i.situacao for i in itens] == ["sem_dados", "sem_cadastro"]
    assert itens[0].referencia_agua_per_capita is None


def test_consumo_zero_lancado_e_dado_e_recebe_nota():
    itens = por_id(calcular_indicadores([campus(1, 1000, 10000, agua=0), campus(2, 1000, 10000, agua=600)]))
    assert itens[1].situacao == "ok"
    assert itens[1].eco_score == 100.0


@pytest.mark.parametrize(("populacao", "area"), [(0, 0), (1000, 0), (0, 10000)])
def test_nota_exige_populacao_e_area(populacao, area):
    """Achado C3 / P3: sem um dos dois, fica fora do ranking e da referência."""
    itens = por_id(
        calcular_indicadores(
            [
                campus(1, populacao, area, agua=500, luz=10000),
                campus(2, 1000, 10000, agua=600, luz=12000),
            ]
        )
    )
    fora = itens[1]
    assert fora.situacao == "sem_cadastro"
    assert fora.eco_score is None
    assert fora.tem_dados is True
    # O consumo continua aparecendo, e o indicador individual existe quando há o dado.
    assert (fora.total_agua, fora.total_luz) == (500, 10000)
    assert fora.consumo_agua_per_capita == (pytest.approx(0.5) if populacao else None)
    assert fora.consumo_luz_por_m2 == (pytest.approx(1.0) if area else None)
    # A referência é só a do campus 2.
    assert itens[2].referencia_agua_per_capita == pytest.approx(0.6)
    assert itens[2].eco_score == pytest.approx(50)


def test_campus_fora_do_ranking_nao_tem_nota_nem_pesa_na_referencia():
    itens = por_id(
        calcular_indicadores(
            [
                campus(6, 220, 1800, agua=5000, luz=90000, fora="Pontos em revisão"),
                campus(2, 1000, 10000, agua=600, luz=12000),
            ]
        )
    )
    assert itens[6].situacao == "em_revisao"
    assert itens[6].motivo_fora_do_ranking == "Pontos em revisão"
    assert itens[6].eco_score is None
    assert itens[6].total_agua == 5000
    assert itens[2].eco_score == pytest.approx(50)


def test_campus_so_com_agua_no_mes_recebe_nota_so_de_agua():
    itens = por_id(
        calcular_indicadores(
            [
                campus(1, 1000, 10000, agua=400),
                campus(2, 1000, 10000, agua=600, luz=12000),
            ]
        )
    )
    a = itens[1]
    assert (a.eco_score_luz, a.consumo_luz_por_m2, a.consumo_luz_per_capita) == (None, None, None)
    assert a.eco_score == a.eco_score_agua == pytest.approx(70)
    # A referência de energia usa só quem tem energia lançada.
    assert a.referencia_luz_por_m2 == pytest.approx(1.2)


def test_um_unico_campus_com_nota_fica_na_referencia():
    [item] = calcular_indicadores([campus(1, 1000, 10000, agua=500, luz=9000)])
    assert item.eco_score == pytest.approx(50)
    assert item.classificacao == "Na média"


def test_ranking_poe_quem_nao_tem_nota_no_fim():
    itens = calcular_indicadores(
        [
            campus(1, 1000, 10000),               # sem dados
            campus(2, 1000, 10000, agua=700),
            campus(3, 0, 0, agua=10),             # sem cadastro
            campus(4, 1000, 10000, agua=300),
        ]
    )
    assert [i.campus_id for i in ordenar_ranking(itens)] == [4, 2, 1, 3]


def test_lista_vazia():
    assert calcular_indicadores([]) == []
