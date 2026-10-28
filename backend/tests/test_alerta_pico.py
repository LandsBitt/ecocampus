"""SPEC R.4: pico = mês > 1,3 × média dos 12 meses anteriores, com no mínimo 6 meses de histórico."""
from __future__ import annotations

import pytest

from app.core import alertas
from app.services.serie import deslocar_mes

MES = "2026-01"


def _historico(lancar, campus_id: int, tipo: str, valores: list[float], origem: str = "manual") -> None:
    """Lança `valores` nos meses imediatamente anteriores a MES, do mais recente para o mais antigo."""
    for i, valor in enumerate(valores, start=1):
        lancar(campus_id, tipo, valor, mes=deslocar_mes(MES, -i), origem=origem)


def _avaliado(corpo: dict, campus_id: int, medida: str) -> dict:
    return next(a for a in corpo["avaliados"] if a["campusId"] == campus_id and a["medida"] == medida)


def test_regra_e_uma_constante_unica():
    # Mudar a regra quebra este teste de propósito: ela está no SPEC (P5) e no relatório.
    assert (alertas.LIMIAR_PICO, alertas.JANELA_MESES, alertas.HISTORICO_MINIMO) == (1.3, 12, 6)


def test_pico_acima_de_1_3_vezes_a_media(como, lancar):
    _historico(lancar, 1, "luz", [1000] * 12)     # média 1.000
    lancar(1, "luz", 1450, mes=MES)                # 1,45 × → pico

    corpo = como("super").get(f"/alertas/picos?mes={MES}").json()
    assert (corpo["limiar"], corpo["janelaMeses"], corpo["historicoMinimo"]) == (1.3, 12, 6)
    alerta = _avaliado(corpo, 1, "luz")
    assert alerta["situacao"] == "pico"
    assert alerta["media"] == pytest.approx(1000)
    assert alerta["razao"] == pytest.approx(1.45)
    assert alerta["mesesNaMedia"] == 12


def test_exatamente_no_limiar_nao_e_pico(como, lancar):
    _historico(lancar, 1, "agua", [100] * 6)
    lancar(1, "agua", 130, mes=MES)                # 130 = 1,3 × 100: não passa de 1,3
    lancar(2, "agua", 131, mes=MES)
    _historico(lancar, 2, "agua", [100] * 6)       # 131 > 130 → pico

    corpo = como("super").get(f"/alertas/picos?mes={MES}").json()
    assert _avaliado(corpo, 1, "agua")["situacao"] == "normal"
    assert _avaliado(corpo, 2, "agua")["situacao"] == "pico"


def test_media_usa_so_meses_com_dado_da_janela(como, lancar):
    # 6 meses com 100 e 6 sem lançamento: média 100, não 50 (mês vazio não vale zero).
    for i in (1, 3, 5, 7, 9, 11):
        lancar(1, "agua", 100, mes=deslocar_mes(MES, -i))
    lancar(1, "agua", 120, mes=MES)
    lancar(1, "agua", 9999, mes=deslocar_mes(MES, -13))   # fora da janela de 12 meses

    alerta = _avaliado(como("super").get(f"/alertas/picos?mes={MES}").json(), 1, "agua")
    assert alerta["media"] == pytest.approx(100)
    assert alerta["mesesNaMedia"] == 6
    assert alerta["situacao"] == "normal"                  # 120 < 130


def test_menos_de_6_meses_de_historico_nao_avalia(como, lancar):
    _historico(lancar, 1, "luz", [1000] * 5)
    lancar(1, "luz", 5000, mes=MES)                        # salto enorme, mas sem base suficiente

    alerta = _avaliado(como("super").get(f"/alertas/picos?mes={MES}").json(), 1, "luz")
    assert alerta["situacao"] == "historico_insuficiente"
    assert alerta["media"] is None and alerta["razao"] is None
    assert alerta["mesesNaMedia"] == 5


def test_cada_medida_e_cada_campus_contra_o_proprio_historico(como, lancar):
    _historico(lancar, 1, "agua", [100] * 6)
    _historico(lancar, 1, "luz", [1000] * 6)
    lancar(1, "agua", 200, mes=MES)                        # pico de água
    lancar(1, "luz", 1000, mes=MES)                        # energia normal
    lancar(3, "luz", 999, mes=MES, origem="cpfl_legado")   # carga antiga: nem avaliada

    corpo = como("super").get(f"/alertas/picos?mes={MES}").json()
    assert [(a["campusId"], a["medida"], a["situacao"]) for a in corpo["avaliados"]] == [
        (1, "agua", "pico"),
        (1, "luz", "normal"),
    ]


def test_picos_vem_primeiro_do_maior_para_o_menor(como, lancar):
    for campus, atual in ((1, 140), (2, 200), (3, 110)):
        _historico(lancar, campus, "agua", [100] * 6)
        lancar(campus, "agua", atual, mes=MES)
    corpo = como("super").get(f"/alertas/picos?mes={MES}").json()
    assert [(a["campusId"], a["situacao"]) for a in corpo["avaliados"]] == [
        (2, "pico"),
        (1, "pico"),
        (3, "normal"),
    ]


def test_campus_ve_so_o_proprio(como, lancar):
    for campus in (1, 2):
        _historico(lancar, campus, "agua", [100] * 6)
        lancar(campus, "agua", 200, mes=MES)
    corpo = como("campus", 2).get(f"/alertas/picos?mes={MES}").json()
    assert [a["campusId"] for a in corpo["avaliados"]] == [2]


def test_marca_demonstracao_no_mes_ou_no_historico(como, lancar):
    _historico(lancar, 1, "agua", [100] * 6, origem="demonstracao")
    lancar(1, "agua", 200, mes=MES)
    alerta = _avaliado(como("super").get(f"/alertas/picos?mes={MES}").json(), 1, "agua")
    assert alerta["demonstracao"] is True
