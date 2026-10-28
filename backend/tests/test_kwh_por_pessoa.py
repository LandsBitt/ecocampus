"""SPEC R.1: kWh por pessoa por campus e da universidade (GreenMetric EC4), calculado à mão."""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.db.models import Campus

MES = "2026-01"


@pytest.fixture()
def reitoria_id(db) -> int:
    return db.scalar(select(Campus.id).where(Campus.nome == "Reitoria"))


def test_kwh_por_pessoa_da_universidade_usa_so_campi_com_energia_e_populacao(como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    cadastrar(2, 500, 5000)
    cadastrar(4, 2000, 8000)
    lancar(1, "luz", 8000)   # 8 kWh/pessoa
    lancar(2, "luz", 6000)   # 12 kWh/pessoa
    lancar(3, "luz", 3000)   # sem população: fora da conta
    lancar(4, "agua", 900)   # só água: fora da conta de energia

    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()

    # (8000 + 6000) ÷ (1000 + 500) = 9,333…  Somando o campus 3 daria 11,33; com a população do 4, 3,5.
    assert uni["kwhPorPessoa"] == pytest.approx(14000 / 1500)
    assert uni["kwh"] == 14000
    assert uni["populacao"] == 1500
    assert len(uni["campiConsiderados"]) == 2
    assert len(uni["campiSemPopulacao"]) == 1
    assert uni["demonstracao"] is False

    por_campus = {i["campusId"]: i for i in como("super").get(f"/indicadores?mes={MES}").json()}
    assert por_campus[1]["consumoLuzPerCapita"] == pytest.approx(8)
    assert por_campus[2]["consumoLuzPerCapita"] == pytest.approx(12)
    assert por_campus[3]["consumoLuzPerCapita"] is None


def test_campus_fora_do_ranking_entra_no_kwh_por_pessoa_da_universidade(como, cadastrar, lancar, reitoria_id):
    # Fora do ranking não é fora da universidade: sem nota, mas com energia e população.
    cadastrar(1, 1000, 10000)
    cadastrar(reitoria_id, 200, 1800)
    lancar(1, "luz", 8000)
    lancar(reitoria_id, "luz", 2000)

    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["kwhPorPessoa"] == pytest.approx(10000 / 1200)
    assert "Reitoria" in uni["campiConsiderados"]


def test_mes_sem_energia_nao_tem_kwh_por_pessoa(como, cadastrar):
    cadastrar(1, 1000, 10000)
    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["kwhPorPessoa"] is None
    assert uni["campiConsiderados"] == []


def test_admin_de_campus_ve_o_valor_da_universidade(como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    cadastrar(2, 500, 5000)
    lancar(1, "luz", 8000)
    lancar(2, "luz", 6000)
    uni = como("campus", 2).get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["kwhPorPessoa"] == pytest.approx(14000 / 1500)


def test_marca_demonstracao_quando_algum_campus_considerado_e_simulado(como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    lancar(1, "luz", 8000, origem="demonstracao")
    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["demonstracao"] is True
