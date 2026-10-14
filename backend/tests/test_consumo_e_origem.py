"""SPEC 1.3: consumo físico e R$ em colunas separadas; origem do lançamento."""
from __future__ import annotations

import io

import pytest

MES = "2026-01"


def _campi(resposta) -> dict[int, dict]:
    assert resposta.status_code == 200, resposta.text
    return {item["campusId"]: item for item in resposta.json()}


def test_mesmo_consumo_da_a_mesma_nota_seja_manual_ou_importado(como, cadastrar, lancar, ponto_de):
    """Achado C1: antes, 600 m³ manuais e 600 m³ importados davam 100 e 0."""
    cadastrar(1, 1000, 10000)
    cadastrar(2, 1000, 10000)
    lancar(1, "agua", 600)
    ponto = ponto_de(2, "luz")  # só para ter um ponto do campus 2
    lancar(2, "agua", 600, origem="importado", valor_rs=6000, ponto_medicao_id=ponto.id)

    campi = _campi(como("super").get(f"/indicadores?mes={MES}"))
    assert campi[1]["totalAgua"] == campi[2]["totalAgua"] == 600
    assert campi[1]["ecoScoreAgua"] == campi[2]["ecoScoreAgua"]


def test_reais_nunca_entram_no_consumo(como, lancar):
    lancar(1, "luz", 1000, valor_rs=99999)
    resumo = como("super").get(f"/resumo?mes={MES}").json()
    assert resumo["totalGeral"]["luz"] == 1000


def test_cpfl_legado_fica_fora_de_todos_os_indicadores(client, como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    lancar(1, "luz", 10000)
    lancar(1, "luz", 50000, origem="cpfl_legado")

    super_ = como("super")
    assert super_.get(f"/resumo?mes={MES}").json()["totalGeral"]["luz"] == 10000
    assert _campi(super_.get(f"/indicadores?mes={MES}"))[1]["totalLuz"] == 10000
    assert _campi(super_.get(f"/grafico/pizza?mes={MES}"))[1]["luz"] == 10000
    assert _campi(client.get(f"/public/ranking?mes={MES}"))[1]["totalLuz"] == 10000
    # Continua no banco e aparece na listagem, identificado.
    origens = sorted(item["origem"] for item in super_.get(f"/lancamentos?mes={MES}").json())
    assert origens == ["cpfl_legado", "manual"]


def test_importado_sem_consumo_fica_fora_e_e_contado_no_aviso(como, lancar, ponto_de):
    ponto = ponto_de(1, "agua")
    lancar(1, "agua", 300)
    lancar(1, "agua", None, origem="importado", valor_rs=450, ponto_medicao_id=ponto.id)
    lancar(1, "agua", None, mes="2025-12", origem="importado", valor_rs=10, ponto_medicao_id=ponto.id)

    resumo = como("super").get(f"/resumo?mes={MES}").json()
    assert resumo["totalGeral"]["agua"] == 300
    assert resumo["pontosSemConsumo"] == 1

    # O papel campus só conta os pontos do próprio campus.
    assert como("campus", 2).get(f"/resumo?mes={MES}").json()["pontosSemConsumo"] == 0
    assert como("campus", 1).get(f"/resumo?mes={MES}").json()["pontosSemConsumo"] == 1


def test_lancamento_manual_pela_api(como):
    cliente = como("super")
    criado = cliente.post(
        "/lancamentos",
        json={"campusId": 3, "tipo": "agua", "consumo": 1240.5, "valorRs": 9876.54, "mesReferencia": MES},
    )
    assert criado.status_code == 201, criado.text
    corpo = criado.json()
    assert corpo["consumo"] == 1240.5
    assert corpo["valorRs"] == 9876.54
    assert corpo["origem"] == "manual"
    assert corpo["pontoMedicaoId"] is None
    assert "valor" not in corpo

    # R$ é opcional na criação e pode ser apagado na edição.
    sem_reais = cliente.post("/lancamentos", json={"campusId": 3, "tipo": "luz", "consumo": 18500, "mesReferencia": MES})
    assert sem_reais.json()["valorRs"] is None
    editado = cliente.put(f"/lancamentos/{corpo['id']}", json={"consumo": 1300, "valorRs": None}).json()
    assert (editado["consumo"], editado["valorRs"]) == (1300, None)
    # Omitir valorRs mantém o que estava.
    cliente.put(f"/lancamentos/{corpo['id']}", json={"valorRs": 50})
    assert cliente.put(f"/lancamentos/{corpo['id']}", json={"consumo": 1}).json()["valorRs"] == 50


def test_api_recusa_o_campo_antigo(como):
    resposta = como("super").post(
        "/lancamentos", json={"campusId": 3, "tipo": "agua", "valor": 100, "mesReferencia": MES}
    )
    assert resposta.status_code == 422


@pytest.fixture()
def csv_agua(ponto_de):
    a, b, c = (ponto_de(6, "agua", i) for i in range(3))
    linhas = [
        "ano;mes;ENDEREÇO;PDE/RGI;LOCAL;consumo_m3;valor_fatura",
        f"2026;1;X;{a.identificador};A;694;6940,69",   # consumo e fatura
        f"2026;1;X;{b.identificador};B;120;",          # só consumo: entra, sem R$
        f"2026;1;X;{c.identificador};C;;350,00",       # só fatura: fica de fora
    ]
    return "\r\n".join(linhas).encode("utf-8-sig"), (a, b, c)


def test_importacao_exige_consumo_e_trata_reais_como_opcional(como, csv_agua, db):
    conteudo, (a, b, c) = csv_agua
    cliente = como("super")
    previa = cliente.post(
        "/importar/preview",
        files={"file": ("agua.csv", io.BytesIO(conteudo), "text/csv")},
        data={"tipo": "agua", "mes_referencia": MES},
    )
    assert previa.status_code == 200, previa.text
    corpo = previa.json()
    assert [(m["pontoMedicaoId"], m["consumoFisico"], m["valorFatura"]) for m in corpo["matched"]] == [
        (a.id, 694, 6940.69),
        (b.id, 120, None),
    ]
    assert [(u["local"], u["motivo"]) for u in corpo["unmatched"]] == [("C", "Consumo ausente")]
    assert corpo["totalValor"] == 6940.69

    confirmado = cliente.post(
        "/importar/confirmar",
        json={"mesReferencia": MES, "lancamentos": corpo["matched"]},
    )
    assert confirmado.json() == {"imported": 2, "updated": 0, "ignored": 0, "manuaisRemovidos": 0}

    gravados = {item["pontoMedicaoId"]: item for item in cliente.get(f"/lancamentos?mes={MES}").json()}
    assert (gravados[a.id]["consumo"], gravados[a.id]["valorRs"], gravados[a.id]["origem"]) == (694, 6940.69, "importado")
    assert (gravados[b.id]["consumo"], gravados[b.id]["valorRs"]) == (120, None)
    # O que vale para os indicadores é o consumo, não a fatura.
    assert cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == 814

    # Importar de novo atualiza em vez de duplicar.
    de_novo = cliente.post("/importar/confirmar", json={"mesReferencia": MES, "lancamentos": corpo["matched"]})
    assert (de_novo.json()["imported"], de_novo.json()["updated"]) == (0, 2)


def test_confirmacao_recusa_item_sem_consumo(como, ponto_de):
    ponto = ponto_de(6, "agua")
    resposta = como("super").post(
        "/importar/confirmar",
        json={"mesReferencia": MES, "lancamentos": [{"pontoMedicaoId": ponto.id, "valorFatura": 100}]},
    )
    assert resposta.status_code == 422
