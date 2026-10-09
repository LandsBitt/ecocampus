"""Indicadores pela API: rota autenticada e ranking público."""
from __future__ import annotations

import pytest

MES = "2026-01"
REITORIA = 6

CAMPOS_INDICADOR = {
    "campusId",
    "nome",
    "populacao",
    "areaConstruidaM2",
    "situacao",
    "motivoForaDoRanking",
    "temDados",
    "total",
    "totalAgua",
    "totalLuz",
    "consumoAguaPerCapita",
    "consumoLuzPorM2",
    "consumoLuzPerCapita",
    "referenciaAguaPerCapita",
    "referenciaLuzPorM2",
    "ecoScore",
    "ecoScoreAgua",
    "ecoScoreLuz",
    "classificacao",
}


@pytest.fixture()
def tres_campi(cadastrar, lancar):
    # Referência ponderada: água 1.500 m³ ÷ 2.500 pessoas = 0,6; energia 30.000 kWh ÷ 25.000 m² = 1,2.
    cadastrar(1, 1000, 10000)
    lancar(1, "agua", 500)
    lancar(1, "luz", 10000)
    cadastrar(2, 1000, 10000)
    lancar(2, "agua", 700)
    lancar(2, "luz", 14000)
    cadastrar(3, 500, 5000)
    lancar(3, "agua", 300)
    lancar(3, "luz", 6000)


def _por_campus(resposta) -> dict[int, dict]:
    assert resposta.status_code == 200, resposta.text
    return {item["campusId"]: item for item in resposta.json()}


def test_contrato_camel_case(como, tres_campi):
    itens = como("super").get(f"/indicadores?mes={MES}").json()
    assert len(itens) == 8
    assert set(itens[0]) == CAMPOS_INDICADOR


def test_valores_por_campus(como, tres_campi):
    campi = _por_campus(como("super").get(f"/indicadores?mes={MES}"))

    assert campi[1]["referenciaAguaPerCapita"] == pytest.approx(0.6)
    assert campi[1]["referenciaLuzPorM2"] == pytest.approx(1.2)

    # 0,5 m³/pessoa é 83,3% da referência → nota 66,67
    assert campi[1]["consumoAguaPerCapita"] == pytest.approx(0.5)
    assert campi[1]["consumoLuzPorM2"] == pytest.approx(1.0)
    assert campi[1]["consumoLuzPerCapita"] == pytest.approx(10.0)
    assert campi[1]["ecoScore"] == pytest.approx(66.667, abs=0.01)
    assert campi[1]["classificacao"] == "Na média"
    assert campi[1]["situacao"] == "ok"

    # 116,7% da referência → nota 33,33
    assert campi[2]["ecoScore"] == pytest.approx(33.333, abs=0.01)
    assert campi[2]["classificacao"] == "Crítico"

    # Exatamente na referência → 50
    assert campi[3]["ecoScore"] == pytest.approx(50.0)
    assert campi[3]["classificacao"] == "Na média"


def test_campus_sem_dado_ou_sem_cadastro_nao_tem_nota(como, tres_campi, cadastrar, lancar):
    cadastrar(4, 900, 4200)   # cadastro completo, sem lançamento
    lancar(5, "agua", 150)    # lançamento, sem cadastro
    campi = _por_campus(como("super").get(f"/indicadores?mes={MES}"))

    assert (campi[4]["situacao"], campi[4]["ecoScore"], campi[4]["classificacao"]) == ("sem_dados", None, None)
    assert (campi[5]["situacao"], campi[5]["ecoScore"]) == ("sem_cadastro", None)
    assert campi[5]["totalAgua"] == 150
    # Nenhum dos dois mexe na referência dos demais.
    assert campi[1]["referenciaAguaPerCapita"] == pytest.approx(0.6)


def test_reitoria_fica_fora_do_ranking_mas_conta_no_total(como, tres_campi, cadastrar, lancar):
    cadastrar(REITORIA, 220, 1800)
    lancar(REITORIA, "agua", 5000)
    cliente = como("super")
    campi = _por_campus(cliente.get(f"/indicadores?mes={MES}"))

    assert campi[REITORIA]["situacao"] == "em_revisao"
    assert campi[REITORIA]["motivoForaDoRanking"]
    assert campi[REITORIA]["ecoScore"] is None
    assert campi[1]["referenciaAguaPerCapita"] == pytest.approx(0.6)
    assert cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == 500 + 700 + 300 + 5000


def test_mes_sem_lancamentos_nao_tem_nota_em_lugar_nenhum(client, como, cadastrar):
    cadastrar(1, 1000, 10000)
    for resposta in (como("super").get("/indicadores?mes=2020-01"), client.get("/public/ranking?mes=2020-01")):
        assert {item["ecoScore"] for item in resposta.json()} == {None}
        assert {item["classificacao"] for item in resposta.json()} == {None}


def test_campus_ve_so_a_propria_linha_com_a_referencia_de_todos(como, tres_campi):
    itens = como("campus", 2).get(f"/indicadores?mes={MES}").json()
    assert [item["campusId"] for item in itens] == [2]
    assert itens[0]["ecoScore"] == pytest.approx(33.333, abs=0.01)


def test_filtro_de_mes(como, tres_campi, lancar):
    lancar(1, "agua", 9999, mes="2025-12")
    campi = _por_campus(como("super").get(f"/indicadores?mes={MES}"))
    assert campi[1]["totalAgua"] == 500


def test_ranking_publico_ordena_por_nota_e_deixa_sem_nota_no_fim(client, como, tres_campi):
    publico = client.get(f"/public/ranking?mes={MES}")
    assert publico.status_code == 200
    notas = [item["ecoScore"] for item in publico.json()]
    assert notas[:3] == sorted(notas[:3], reverse=True)
    assert notas[3:] == [None] * 5

    autenticado = _por_campus(como("super").get(f"/indicadores?mes={MES}"))
    assert _por_campus(publico) == autenticado
