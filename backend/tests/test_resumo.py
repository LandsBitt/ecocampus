"""SPEC 2.6: agregação do /resumo com mês, sem mês e campus sem lançamento."""
from __future__ import annotations

MES = "2026-01"


def _por_campus(corpo: dict) -> dict[int, dict]:
    return {c["campusId"]: c for c in corpo["campi"]}


def test_com_mes_soma_por_campus_e_no_total(como, lancar):
    lancar(1, "agua", 100)
    lancar(1, "luz", 1000)
    lancar(2, "agua", 40)
    lancar(1, "agua", 999, mes="2025-12")                 # outro mês: fora
    lancar(3, "luz", 777, origem="cpfl_legado")           # carga antiga: fora

    corpo = como("super").get(f"/resumo?mes={MES}").json()
    campi = _por_campus(corpo)

    assert corpo["mes"] == MES
    assert (campi[1]["agua"], campi[1]["luz"]) == (100, 1000)
    assert (campi[2]["agua"], campi[2]["luz"]) == (40, 0)
    assert (corpo["totalGeral"]["agua"], corpo["totalGeral"]["luz"]) == (140, 1000)
    assert corpo["campus"] is None


def test_campus_sem_lancamento_aparece_com_zero(como, lancar):
    lancar(1, "agua", 100)
    campi = _por_campus(como("super").get(f"/resumo?mes={MES}").json())
    assert len(campi) == 8
    assert (campi[5]["agua"], campi[5]["luz"]) == (0, 0)
    assert campi[5]["nome"]


def test_sem_mes_soma_todo_o_historico(como, lancar):
    lancar(1, "agua", 100, mes="2025-11")
    lancar(1, "agua", 50, mes="2025-12")
    lancar(1, "agua", 25)
    lancar(1, "agua", 999, mes="2025-10", origem="cpfl_legado")

    corpo = como("super").get("/resumo").json()
    assert corpo["mes"] is None
    assert _por_campus(corpo)[1]["agua"] == 175
    assert corpo["totalGeral"]["agua"] == 175


def test_mes_vazio_zera_tudo_sem_quebrar(como):
    corpo = como("super").get(f"/resumo?mes={MES}").json()
    assert (corpo["totalGeral"]["agua"], corpo["totalGeral"]["luz"]) == (0, 0)
    assert all((c["agua"], c["luz"]) == (0, 0) for c in corpo["campi"])
    assert corpo["pontosSemConsumo"] == 0


def test_papel_campus_recebe_o_proprio_bloco_e_a_universidade_como_referencia(como, lancar):
    lancar(2, "agua", 40)
    lancar(1, "agua", 100)

    corpo = como("campus", 2).get(f"/resumo?mes={MES}").json()
    assert corpo["campi"] is None
    assert (corpo["campus"]["campusId"], corpo["campus"]["agua"]) == (2, 40)
    assert corpo["totalGeral"]["agua"] == 140      # D11: referência da universidade


def test_papel_campus_sem_lancamento_recebe_bloco_zerado(como, lancar):
    lancar(1, "agua", 100)
    corpo = como("campus", 4).get(f"/resumo?mes={MES}").json()
    assert (corpo["campus"]["campusId"], corpo["campus"]["agua"], corpo["campus"]["luz"]) == (4, 0, 0)


def test_pontos_sem_consumo_contam_so_importados_do_escopo(como, lancar, ponto_de):
    lancar(1, "agua", None, origem="importado", valor_rs=50, ponto_medicao_id=ponto_de(1, "agua").id)
    lancar(2, "agua", None, origem="importado", valor_rs=60, ponto_medicao_id=ponto_de(2, "agua").id)

    assert como("super").get(f"/resumo?mes={MES}").json()["pontosSemConsumo"] == 2
    assert como("campus", 2).get(f"/resumo?mes={MES}").json()["pontosSemConsumo"] == 1
