"""SPEC 1.10: validação, unicidade, permissões e autoria do lançamento manual."""
from __future__ import annotations

import io
from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.limites import CONSUMO_MAXIMO
from app.core.security import autor
from app.db.models import Lancamento
from app.schemas.auth import UserClaims

MES = "2026-01"


def _novo(cliente, campus_id=1, tipo="agua", consumo=100, mes=MES, **extra):
    return cliente.post(
        "/lancamentos",
        json={"campusId": campus_id, "tipo": tipo, "consumo": consumo, "mesReferencia": mes, **extra},
    )


@pytest.fixture()
def importado(lancar, ponto_de):
    """Lançamento importado de água do campus 1, em MES."""
    ponto = ponto_de(1, "agua")
    return lancar(1, "agua", 500, origem="importado", valor_rs=900, ponto_medicao_id=ponto.id)


# --- validação (C7) -------------------------------------------------------------


@pytest.mark.parametrize(
    "corpo",
    [
        {"consumo": -500},
        {"mes": "2026-13"},
        {"mes": "0000-00"},
        {"mes": "2026-1"},
        {"consumo": float(CONSUMO_MAXIMO) + 1},
        {"consumo": 99999999999999},  # antes estourava Numeric(12, 3) como erro 500
        {"valorRs": -1},
    ],
)
def test_post_com_valor_ou_mes_invalido_devolve_422(como, corpo):
    resposta = _novo(como("super"), **corpo)
    assert resposta.status_code == 422, resposta.text


def test_consumo_zero_e_o_teto_sao_aceitos(como):
    cliente = como("super")
    assert _novo(cliente, tipo="agua", consumo=0).status_code == 201
    assert _novo(cliente, tipo="luz", consumo=float(CONSUMO_MAXIMO)).status_code == 201


def test_put_com_valor_ou_mes_invalido_devolve_422(como, lancar):
    item = lancar(1, "agua", 100)
    cliente = como("super")
    assert cliente.put(f"/lancamentos/{item.id}", json={"consumo": -1}).status_code == 422
    assert cliente.put(f"/lancamentos/{item.id}", json={"mesReferencia": "2026-13"}).status_code == 422


@pytest.mark.parametrize(
    ("consumo", "mes", "valor_rs"),
    [(-1, MES, None), (CONSUMO_MAXIMO + 1, MES, None), (1, "2026-13", None), (1, MES, -5)],
)
def test_banco_recusa_o_que_a_api_recusa(db, consumo, mes, valor_rs):
    """CHECK equivalente no banco: nem script nem SQL manual gravam valor inválido."""
    with pytest.raises(IntegrityError, match="ck_lancamentos"):
        with db.begin_nested():
            db.add(Lancamento(campus_id=1, tipo="agua", consumo=consumo, valor_rs=valor_rs, origem="manual", mes_referencia=mes))
            db.flush()


# --- unicidade (C8, D4) ---------------------------------------------------------


def test_segundo_manual_do_mesmo_campus_tipo_e_mes_devolve_409(como):
    cliente = como("super")
    assert _novo(cliente).status_code == 201
    segundo = _novo(cliente, consumo=200)
    assert segundo.status_code == 409
    assert "manual" in segundo.json()["detail"]

    # Outro tipo, outro mês ou outro campus: pode.
    assert _novo(cliente, tipo="luz").status_code == 201
    assert _novo(cliente, mes="2025-12").status_code == 201
    assert _novo(cliente, campus_id=2).status_code == 201


def test_admin_de_campus_tambem_recebe_409(como):
    cliente = como("campus", 3)
    assert _novo(cliente, campus_id=3).status_code == 201
    assert _novo(cliente, campus_id=3).status_code == 409


def test_manual_sobre_mes_ja_importado_devolve_409(como, importado):
    resposta = _novo(como("super"), campus_id=1, tipo="agua")
    assert resposta.status_code == 409
    assert "importação" in resposta.json()["detail"]
    # O total não dobra.
    assert como("super").get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == 500


def test_banco_garante_um_manual_por_campus_tipo_e_mes(db, lancar):
    lancar(1, "agua", 100)
    with pytest.raises(IntegrityError, match="uq_lancamentos_manual_campus_tipo_mes"):
        with db.begin_nested():
            lancar(1, "agua", 200)
    # cpfl_legado não entra no índice: fica fora dos indicadores de qualquer forma.
    lancar(1, "agua", 300, origem="cpfl_legado")


def test_editar_manual_para_mes_ocupado_devolve_409(como, lancar, importado):
    alvo = lancar(1, "agua", 100, mes="2025-12")
    lancar(1, "agua", 100, mes="2025-11")
    cliente = como("super")
    assert cliente.put(f"/lancamentos/{alvo.id}", json={"mesReferencia": "2025-11"}).status_code == 409
    assert cliente.put(f"/lancamentos/{alvo.id}", json={"mesReferencia": MES}).status_code == 409
    # Editar sem mudar a chave não conflita consigo mesmo.
    assert cliente.put(f"/lancamentos/{alvo.id}", json={"consumo": 150}).status_code == 200


def test_editar_importado_para_mes_ja_importado_do_ponto_devolve_409_e_nao_500(como, lancar, importado):
    """Achado B4: o índice único do ponto estourava como erro 500."""
    lancar(1, "agua", 700, mes="2025-12", origem="importado", ponto_medicao_id=importado.ponto_medicao_id)
    resposta = como("super").put(f"/lancamentos/{importado.id}", json={"mesReferencia": "2025-12"})
    assert resposta.status_code == 409, resposta.text


def test_importado_nao_troca_de_campus_nem_de_tipo(como, importado):
    """Achado B4: o lançamento ficaria com campus diferente do ponto de medição."""
    cliente = como("super")
    assert cliente.put(f"/lancamentos/{importado.id}", json={"campusId": 2}).status_code == 422
    assert cliente.put(f"/lancamentos/{importado.id}", json={"tipo": "luz"}).status_code == 422


# --- permissões (B2, D5) --------------------------------------------------------


def test_admin_de_campus_edita_e_exclui_manual_do_proprio_campus(como, lancar):
    item = lancar(2, "agua", 100)
    cliente = como("campus", 2)
    editado = cliente.put(f"/lancamentos/{item.id}", json={"consumo": 120})
    assert editado.status_code == 200, editado.text
    assert editado.json()["consumo"] == 120
    assert cliente.delete(f"/lancamentos/{item.id}").status_code == 204


def test_admin_de_campus_recebe_403_para_importado(como, importado):
    cliente = como("campus", 1)
    assert cliente.put(f"/lancamentos/{importado.id}", json={"consumo": 1}).status_code == 403
    assert cliente.delete(f"/lancamentos/{importado.id}").status_code == 403


def test_admin_de_campus_recebe_403_para_outro_campus(como, lancar):
    item = lancar(1, "agua", 100)
    cliente = como("campus", 2)
    assert cliente.put(f"/lancamentos/{item.id}", json={"consumo": 1}).status_code == 403
    assert cliente.delete(f"/lancamentos/{item.id}").status_code == 403


def test_admin_de_campus_nao_move_manual_para_outro_campus(como, lancar):
    item = lancar(2, "agua", 100)
    assert como("campus", 2).put(f"/lancamentos/{item.id}", json={"campusId": 1}).status_code == 403


def test_super_edita_e_exclui_importado(como, importado):
    cliente = como("super")
    assert cliente.put(f"/lancamentos/{importado.id}", json={"valorRs": 950}).status_code == 200
    assert cliente.delete(f"/lancamentos/{importado.id}").status_code == 204


# --- auditoria (D5) -------------------------------------------------------------


def test_lancamento_novo_grava_quem_criou(como):
    criado = _novo(como("campus", 4), campus_id=4).json()
    assert criado["criadoPor"] == "campus@teste.local"
    assert criado["atualizadoEm"]

    do_super = _novo(como("super"), campus_id=5).json()
    assert do_super["criadoPor"] == "super@teste.local"


def test_sem_email_grava_o_uid():
    assert autor(UserClaims(uid="abc123", email=None, role="super")) == "abc123"


def test_edicao_atualiza_atualizado_em_e_mantem_o_autor(como, db, lancar):
    item = lancar(1, "agua", 100)
    item.criado_por = "quem@criou"
    item.atualizado_em = datetime(2020, 1, 1, tzinfo=timezone.utc)
    db.flush()

    corpo = como("super").put(f"/lancamentos/{item.id}", json={"consumo": 110}).json()
    assert corpo["criadoPor"] == "quem@criou"
    assert datetime.fromisoformat(corpo["atualizadoEm"]).year > 2020


def test_importacao_grava_quem_importou(como, ponto_de):
    ponto = ponto_de(2, "luz")
    cliente = como("super")
    cliente.post(
        "/importar/confirmar",
        json={"mesReferencia": MES, "lancamentos": [{"pontoMedicaoId": ponto.id, "consumoFisico": 10}]},
    )
    (item,) = cliente.get(f"/lancamentos?mes={MES}&campusId=2").json()
    assert item["criadoPor"] == "super@teste.local"


def test_previa_da_importacao_recusa_consumo_acima_do_teto(como, ponto_de):
    ponto = ponto_de(2, "luz")
    linhas = [
        "ano;mes;endereco;numero_uc;numero_instalacao;local;consumo_kwh;valor_fatura_rs",
        f"2026;1;X;{ponto.identificador};;A;99999999;10,00",
    ]
    resposta = como("super").post(
        "/importar/preview",
        files={"file": ("p.csv", io.BytesIO("\r\n".join(linhas).encode("utf-8")), "text/csv")},
        data={"tipo": "luz", "mes_referencia": MES},
    )
    corpo = resposta.json()
    assert corpo["matched"] == []
    assert "acima do limite" in corpo["unmatched"][0]["motivo"]
