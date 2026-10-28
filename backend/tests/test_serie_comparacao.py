"""SPEC R.5 (série histórica) e R.3 (comparação com o mês e o ano anteriores), calculados à mão."""
from __future__ import annotations

import pytest

from app.services.serie import deslocar_mes, meses_ate, variacao_percentual


@pytest.mark.parametrize(
    ("mes", "n", "esperado"),
    [("2026-01", -1, "2025-12"), ("2026-01", -12, "2025-01"), ("2025-12", 1, "2026-01"), ("2026-03", -14, "2025-01")],
)
def test_deslocar_mes(mes, n, esperado):
    assert deslocar_mes(mes, n) == esperado


def test_meses_ate_vem_do_mais_antigo_ao_mais_recente():
    assert meses_ate("2026-02", 4) == ["2025-11", "2025-12", "2026-01", "2026-02"]


@pytest.mark.parametrize(
    ("atual", "base", "esperado"),
    [(110, 100, 10.0), (75, 100, -25.0), (100, None, None), (None, 100, None), (50, 0, None)],
)
def test_variacao_sem_base_nao_vira_zero(atual, base, esperado):
    assert variacao_percentual(atual, base) == (pytest.approx(esperado) if esperado is not None else None)


# --- série -----------------------------------------------------------------------


def test_serie_soma_campi_por_mes_e_preenche_meses_vazios(como, lancar):
    lancar(1, "agua", 100, mes="2025-12")
    lancar(2, "agua", 50, mes="2025-12")
    lancar(1, "luz", 1000, mes="2026-02")
    lancar(3, "luz", 999, mes="2026-02", origem="cpfl_legado")  # fora dos números

    serie = como("super").get("/serie?ate=2026-02&meses=3").json()

    assert [p["mes"] for p in serie] == ["2025-12", "2026-01", "2026-02"]
    assert serie[0] == {"mes": "2025-12", "agua": 150, "luz": 0, "temAgua": True, "temLuz": False, "demonstracao": False}
    assert serie[1] == {"mes": "2026-01", "agua": 0, "luz": 0, "temAgua": False, "temLuz": False, "demonstracao": False}
    assert serie[2]["luz"] == 1000


def test_serie_do_campus_ve_so_o_proprio(como, lancar):
    lancar(1, "agua", 100)
    lancar(2, "agua", 40)
    # campusId=1 é ignorado para o papel campus.
    serie = como("campus", 2).get("/serie?ate=2026-01&meses=1&campusId=1").json()
    assert serie[0]["agua"] == 40
    # O super pode filtrar.
    assert como("super").get("/serie?ate=2026-01&meses=1&campusId=1").json()[0]["agua"] == 100


def test_serie_marca_mes_com_demonstracao(como, lancar):
    lancar(1, "agua", 100, mes="2025-12", origem="demonstracao")
    lancar(1, "agua", 100, mes="2026-01")
    serie = como("super").get("/serie?ate=2026-01&meses=2").json()
    assert [p["demonstracao"] for p in serie] == [True, False]


@pytest.mark.parametrize("query", ["ate=2026-13", "ate=2026-01&meses=0", "ate=2026-01&meses=37"])
def test_serie_recusa_parametro_invalido(como, query):
    assert como("super").get(f"/serie?{query}").status_code == 422


# --- comparação ----------------------------------------------------------------------


def test_comparacao_com_mes_e_ano_anteriores(como, lancar):
    lancar(1, "agua", 120, mes="2026-01")
    lancar(1, "agua", 100, mes="2025-12")
    lancar(1, "agua", 150, mes="2025-01")
    lancar(2, "agua", 30, mes="2026-01")   # só no mês atual: sem base para o campus 2
    lancar(1, "luz", 1000, mes="2026-01")
    lancar(1, "luz", 800, mes="2025-12")   # energia sem ano anterior

    corpo = como("super").get("/comparacao?mes=2026-01").json()
    assert (corpo["mesAnterior"], corpo["anoAnterior"]) == ("2025-12", "2025-01")

    agua = corpo["escopo"]["agua"]
    assert (agua["atual"], agua["mesAnterior"], agua["anoAnterior"]) == (150, 100, 150)
    assert agua["variacaoMensal"] == pytest.approx(50.0)    # 150 vs 100
    assert agua["variacaoAnual"] == pytest.approx(0.0)      # 150 vs 150: zero de verdade

    luz = corpo["escopo"]["luz"]
    assert luz["variacaoMensal"] == pytest.approx(25.0)     # 1000 vs 800
    assert luz["anoAnterior"] is None                       # "sem base"
    assert luz["variacaoAnual"] is None

    campi = {c["campusId"]: c for c in corpo["campi"]}
    assert len(campi) == 8
    assert campi[1]["agua"]["variacaoMensal"] == pytest.approx(20.0)   # 120 vs 100
    assert campi[1]["agua"]["variacaoAnual"] == pytest.approx(-20.0)   # 120 vs 150
    assert campi[2]["agua"]["atual"] == 30
    assert campi[2]["agua"]["variacaoMensal"] is None
    assert campi[3]["agua"]["atual"] is None                            # sem dado no mês


def test_comparacao_do_campus_sem_lista_de_campi(como, lancar):
    lancar(2, "agua", 60, mes="2026-01")
    lancar(2, "agua", 40, mes="2025-12")
    lancar(1, "agua", 999, mes="2026-01")   # outro campus: não entra

    corpo = como("campus", 2).get("/comparacao?mes=2026-01").json()
    assert corpo["escopo"]["campusId"] == 2
    assert corpo["escopo"]["agua"]["variacaoMensal"] == pytest.approx(50.0)
    assert corpo["campi"] == []


def test_comparacao_marca_demonstracao_por_medida_em_qualquer_dos_tres_meses(como, lancar):
    lancar(1, "agua", 100, mes="2026-01")
    lancar(1, "agua", 100, mes="2025-01", origem="demonstracao")
    corpo = como("super").get("/comparacao?mes=2026-01").json()
    assert corpo["escopo"]["agua"]["demonstracao"] is True
    assert corpo["escopo"]["luz"]["demonstracao"] is False  # água simulada não marca a energia
