"""SPEC R.0: dado de demonstração conta nos números, mas nunca se passa por medição real."""
from __future__ import annotations

import io

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import Lancamento

MES = "2026-01"
CABECALHO_LUZ = "ano;mes;endereco;numero_uc;numero_instalacao;local;consumo_kwh;valor_fatura_rs"


def _origens(db, campus_id: int, tipo: str, mes: str = MES) -> list[str]:
    return sorted(
        db.scalars(
            select(Lancamento.origem).where(
                Lancamento.campus_id == campus_id, Lancamento.tipo == tipo, Lancamento.mes_referencia == mes
            )
        ).all()
    )


# --- banco ---------------------------------------------------------------------


def test_banco_aceita_um_lancamento_de_demonstracao_por_campus_tipo_mes(db, lancar):
    lancar(1, "agua", 100, origem="demonstracao")
    lancar(1, "agua", 100, origem="demonstracao", mes="2025-12")  # outro mês: ok
    lancar(1, "luz", 100, origem="demonstracao")                   # outro tipo: ok
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            lancar(1, "agua", 200, origem="demonstracao")


# --- dado real substitui demonstração --------------------------------------------


def test_lancamento_manual_substitui_a_demonstracao_do_mes(como, db, lancar):
    lancar(2, "agua", 500, origem="demonstracao")
    lancar(2, "luz", 900, origem="demonstracao")  # outro tipo: fica

    resposta = como("super").post(
        "/lancamentos", json={"campusId": 2, "tipo": "agua", "consumo": 120, "mesReferencia": MES}
    )
    assert resposta.status_code == 201
    assert _origens(db, 2, "agua") == ["manual"]
    assert _origens(db, 2, "luz") == ["demonstracao"]

    # O total é só o real: sem a substituição daria 620.
    campus = como("super").get(f"/resumo?mes={MES}").json()["campi"][1]
    assert campus["agua"] == 120
    assert campus["demonstracao"] is True  # ainda há energia simulada no mês


def test_manual_movido_para_mes_com_demonstracao_a_substitui(como, db, lancar):
    item = lancar(2, "agua", 120, mes="2025-12")
    lancar(2, "agua", 500, origem="demonstracao")

    resposta = como("super").put(f"/lancamentos/{item.id}", json={"mesReferencia": MES})
    assert resposta.status_code == 200
    assert _origens(db, 2, "agua") == ["manual"]


def test_demonstracao_nao_se_edita_pela_api(como, lancar):
    item = lancar(2, "agua", 500, origem="demonstracao")
    resposta = como("super").put(f"/lancamentos/{item.id}", json={"consumo": 10})
    assert resposta.status_code == 422
    assert "demonstração" in resposta.json()["detail"]


def test_admin_de_campus_nao_exclui_demonstracao(como, lancar):
    item = lancar(2, "agua", 500, origem="demonstracao")
    assert como("campus", 2).delete(f"/lancamentos/{item.id}").status_code == 403


def test_importacao_substitui_a_demonstracao_e_avisa_na_previa(como, db, ponto_de, lancar):
    ponto = ponto_de(2, "luz")
    lancar(2, "luz", 7777, origem="demonstracao")
    lancar(3, "luz", 8888, origem="demonstracao")  # outro campus: fica

    cliente = como("super")
    conteudo = "\r\n".join([CABECALHO_LUZ, f"2026;1;X;{ponto.identificador};;A;1000;800,00"]).encode("utf-8-sig")
    previa = cliente.post(
        "/importar/preview",
        files={"file": ("planilha.csv", io.BytesIO(conteudo), "text/csv")},
        data={"tipo": "luz", "mes_referencia": MES},
    ).json()
    assert previa["demonstracaoSubstituida"] == 1
    assert previa["manuaisSubstituidos"] == 0

    confirmado = cliente.post(
        "/importar/confirmar", json={"mesReferencia": MES, "lancamentos": previa["matched"]}
    ).json()
    assert confirmado["demonstracaoRemovida"] == 1
    assert _origens(db, 2, "luz") == ["importado"]
    assert _origens(db, 3, "luz") == ["demonstracao"]


# --- a API diz o que é simulado ----------------------------------------------------


def test_resumo_e_indicadores_marcam_o_que_tem_demonstracao(como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    cadastrar(2, 1000, 10000)
    lancar(1, "agua", 400)                           # real
    lancar(2, "agua", 500, origem="demonstracao")    # simulado

    resumo = como("super").get(f"/resumo?mes={MES}").json()
    por_campus = {c["campusId"]: c for c in resumo["campi"]}
    assert por_campus[1]["demonstracao"] is False
    assert por_campus[2]["demonstracao"] is True
    assert por_campus[3]["demonstracao"] is False    # sem lançamento algum
    assert resumo["totalGeral"]["demonstracao"] is True
    assert resumo["totalGeral"]["agua"] == 900       # demonstração conta no total

    indicadores = {i["campusId"]: i for i in como("super").get(f"/indicadores?mes={MES}").json()}
    assert indicadores[1]["demonstracao"] is False
    assert indicadores[2]["demonstracao"] is True
    assert indicadores[2]["ecoScore"] is not None    # e na nota


def test_mes_so_com_dado_real_nao_e_marcado(como, lancar):
    lancar(1, "agua", 400)
    lancar(1, "agua", 500, origem="demonstracao", mes="2025-12")  # outro mês

    resumo = como("super").get(f"/resumo?mes={MES}").json()
    assert resumo["totalGeral"]["demonstracao"] is False


def test_campus_ve_a_marca_do_proprio_campus(como, lancar):
    lancar(2, "agua", 500, origem="demonstracao")
    resumo = como("campus", 2).get(f"/resumo?mes={MES}").json()
    assert resumo["campus"]["demonstracao"] is True
