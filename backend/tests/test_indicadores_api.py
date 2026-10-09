"""Indicadores pela API: rota autenticada e ranking público.

Os valores esperados seguem a metodologia vigente (média simples entre campi).
As tarefas 1.4 a 1.6 do SPEC mudam essa metodologia e estes números com ela.
"""
from __future__ import annotations

import pytest

MES = "2026-01"

CAMPOS_INDICADOR = {
    "campusId",
    "nome",
    "populacao",
    "areaConstruidaM2",
    "total",
    "totalAgua",
    "totalLuz",
    "consumoAguaPerCapita",
    "consumoLuzPorM2",
    "ecoScore",
    "ecoScoreAgua",
    "ecoScoreLuz",
    "normalizado",
    "classificacao",
}


@pytest.fixture()
def tres_campi(cadastrar, lancar):
    # Médias simples: água 0,6 m³/pessoa; energia 1,2 kWh/m².
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

    # 0,5 m³/pessoa é 83,3% da média → (0,833 − 0,5) / 1,0 = 0,333 → nota 66,67
    assert campi[1]["consumoAguaPerCapita"] == pytest.approx(0.5)
    assert campi[1]["consumoLuzPorM2"] == pytest.approx(1.0)
    assert campi[1]["ecoScoreAgua"] == pytest.approx(66.667, abs=0.01)
    assert campi[1]["ecoScoreLuz"] == pytest.approx(66.667, abs=0.01)
    assert campi[1]["ecoScore"] == pytest.approx(66.667, abs=0.01)
    assert campi[1]["classificacao"] == "Atenção"
    assert campi[1]["normalizado"] is True

    # 116,7% da média → nota 33,33
    assert campi[2]["ecoScore"] == pytest.approx(33.333, abs=0.01)
    assert campi[2]["classificacao"] == "Crítico"

    # Exatamente na média → 50
    assert campi[3]["ecoScore"] == pytest.approx(50.0)
    assert campi[3]["classificacao"] == "Atenção"

    assert campi[1]["totalAgua"] == 500
    assert campi[1]["totalLuz"] == 10000


def test_campus_ve_so_a_propria_linha_com_a_media_de_todos(como, tres_campi):
    itens = como("campus", 2).get(f"/indicadores?mes={MES}").json()
    assert [item["campusId"] for item in itens] == [2]
    # Mesma nota que o super vê: a média continua sendo a de todos os campi.
    assert itens[0]["ecoScore"] == pytest.approx(33.333, abs=0.01)


def test_filtro_de_mes(como, tres_campi, lancar):
    lancar(1, "agua", 9999, mes="2025-12")
    campi = _por_campus(como("super").get(f"/indicadores?mes={MES}"))
    assert campi[1]["totalAgua"] == 500


def test_ranking_publico_tem_os_mesmos_numeros_da_rota_autenticada(client, como, tres_campi):
    publico = client.get(f"/public/ranking?mes={MES}")
    assert publico.status_code == 200
    notas = [item["ecoScore"] for item in publico.json()]
    assert notas == sorted(notas, reverse=True)

    autenticado = _por_campus(como("super").get(f"/indicadores?mes={MES}"))
    assert _por_campus(publico) == autenticado
