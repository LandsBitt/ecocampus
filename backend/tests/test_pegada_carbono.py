"""SPEC R.2: pegada de carbono da energia = kWh × fator médio anual do SIN, calculado à mão."""
from __future__ import annotations

import pytest

from app.db.models import FatorEmissao

MES = "2026-01"
FONTE = "MCTI – fator médio anual do SIN (teste)"


@pytest.fixture()
def fator(db):
    def _fator(ano: int, valor: float, provisorio: bool = False) -> None:
        db.add(FatorEmissao(ano=ano, fator=valor, provisorio=provisorio, fonte=FONTE))
        db.flush()

    return _fator


def test_emissao_por_campus_e_da_universidade(como, cadastrar, lancar, fator):
    fator(2026, 0.0461)
    cadastrar(1, 1000, 10000)
    lancar(1, "luz", 10000)   # 10.000 kWh × 0,0461 kgCO₂/kWh = 461 kg
    lancar(2, "luz", 2000)    # sem população: fora do kWh/pessoa, mas dentro da pegada → 92,2 kg
    lancar(3, "agua", 500)    # só água: sem pegada

    por_campus = {i["campusId"]: i for i in como("super").get(f"/indicadores?mes={MES}").json()}
    assert por_campus[1]["emissaoKgCo2"] == pytest.approx(461)
    assert por_campus[2]["emissaoKgCo2"] == pytest.approx(92.2)
    assert por_campus[3]["emissaoKgCo2"] is None

    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["emissaoKgCo2"] == pytest.approx(553.2)
    assert uni["fatorEmissao"] == {
        "anoReferencia": 2026,
        "anoDoFator": 2026,
        "fator": 0.0461,
        "provisorio": False,
        "fonte": FONTE,
    }


def test_ano_sem_fator_usa_o_ultimo_publicado_antes_e_marca_provisorio(como, lancar, fator):
    fator(2024, 0.0545)
    fator(2025, 0.0461)
    lancar(1, "luz", 1000)

    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["fatorEmissao"]["anoDoFator"] == 2025
    assert uni["fatorEmissao"]["provisorio"] is True
    assert uni["emissaoKgCo2"] == pytest.approx(46.1)


def test_fator_do_proprio_ano_marcado_provisorio_continua_provisorio(como, lancar, fator):
    fator(2026, 0.0461, provisorio=True)
    lancar(1, "luz", 1000)
    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["fatorEmissao"]["provisorio"] is True


def test_cada_ano_usa_o_proprio_fator(como, lancar, fator):
    fator(2024, 0.0545)
    fator(2025, 0.0461)
    lancar(1, "luz", 1000, mes="2024-06")
    uni = como("super").get("/indicadores/universidade?mes=2024-06").json()
    assert uni["emissaoKgCo2"] == pytest.approx(54.5)
    assert uni["fatorEmissao"]["provisorio"] is False


def test_sem_fator_cadastrado_nao_ha_pegada_nem_zero(como, lancar, fator):
    fator(2027, 0.05)   # só fator de ano posterior: não serve para 2026
    lancar(1, "luz", 1000)

    uni = como("super").get(f"/indicadores/universidade?mes={MES}").json()
    assert uni["fatorEmissao"] is None
    assert uni["emissaoKgCo2"] is None
    campus = como("super").get(f"/indicadores?mes={MES}").json()[0]
    assert campus["emissaoKgCo2"] is None


def test_super_grava_fator_e_admin_de_campus_so_le(como):
    corpo = {"fator": 0.0461, "provisorio": True, "fonte": FONTE}
    assert como("campus", 2).put("/fatores-emissao/2026", json=corpo).status_code == 403

    gravado = como("super").put("/fatores-emissao/2026", json=corpo)
    assert gravado.status_code == 200
    assert gravado.json() == {"ano": 2026, **corpo}

    # Gravar de novo o mesmo ano atualiza em vez de duplicar.
    como("super").put("/fatores-emissao/2026", json={**corpo, "fator": 0.05, "provisorio": False})
    lista = como("campus", 2).get("/fatores-emissao").json()
    assert lista == [{"ano": 2026, "fator": 0.05, "provisorio": False, "fonte": FONTE}]


@pytest.mark.parametrize("corpo", [{"fator": 0}, {"fator": 5}, {"fonte": ""}])
def test_fator_invalido_e_recusado(como, corpo):
    payload = {"fator": 0.0461, "provisorio": False, "fonte": FONTE, **corpo}
    assert como("super").put("/fatores-emissao/2026", json=payload).status_code == 422
    assert como("super").put("/fatores-emissao/1999", json={**payload, **{"fator": 0.0461, "fonte": FONTE}}).status_code == 422
