"""SPEC 1.8: a importação não aceita número errado em silêncio."""
from __future__ import annotations

import io
from pathlib import Path

import pytest

from app.api.routes.importar import parse_numero

MES = "2026-01"
DOCS = Path(__file__).resolve().parents[2] / "Docs"


# --- parser ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("694", 694.0),
        ("6940,69", 6940.69),
        ("1.234,56", 1234.56),          # milhar com vírgula decimal: sem ambiguidade
        ("12.345.678,9", 12345678.9),
        ("R$ 100,00", 100.0),
        ("R$ 1.234,56", 1234.56),
        ("  12 ", 12.0),
        ("12.5", 12.5),                 # ponto decimal que não pode ser milhar
        ("1234.56", 1234.56),
        ("0", 0.0),
    ],
)
def test_numeros_aceitos(texto, esperado):
    assert parse_numero(texto) == (esperado, None)


@pytest.mark.parametrize("texto", ["", "   ", None])
def test_vazio_nao_e_erro(texto):
    assert parse_numero(texto) == (None, None)


@pytest.mark.parametrize(
    ("texto", "trecho_do_erro"),
    [
        ("18.500", "ambíguo"),          # 18500 ou 18,5? Antes virava 18,5 em silêncio.
        ("1.234", "ambíguo"),
        ("1.234.567", "ambíguo"),
        ("-50", "negativo"),
        ("1,234.56", "não é um número"),  # formato americano
        ("abc", "não é um número"),
        ("12,5,3", "não é um número"),
    ],
)
def test_numeros_recusados_com_explicacao(texto, trecho_do_erro):
    valor, erro = parse_numero(texto)
    assert valor is None
    assert trecho_do_erro in erro


def test_erro_de_ambiguidade_diz_como_corrigir():
    _, erro = parse_numero("18.500")
    assert "18500" in erro and "18,500" in erro


# --- prévia --------------------------------------------------------------------

CABECALHO_LUZ = "ano;mes;endereco;numero_uc;numero_instalacao;local;consumo_kwh;valor_fatura_rs"
CABECALHO_AGUA = "ano;mes;ENDEREÇO;PDE/RGI;LOCAL;consumo_m3;valor_fatura"


def _previa(cliente, linhas, tipo="luz", mes=MES, codificacao="utf-8-sig"):
    conteudo = "\r\n".join(linhas).encode(codificacao)
    return cliente.post(
        "/importar/preview",
        files={"file": ("planilha.csv", io.BytesIO(conteudo), "text/csv")},
        data={"tipo": tipo, "mes_referencia": mes},
    )


@pytest.fixture()
def pontos_luz(ponto_de):
    return [ponto_de(2, "luz", i) for i in range(4)]


def test_numero_ambiguo_ou_invalido_vira_erro_por_linha(como, pontos_luz):
    a, b, c, d = pontos_luz
    resposta = _previa(
        como("super"),
        [
            CABECALHO_LUZ,
            f"2026;1;X;{a.identificador};{a.codigo_instalacao};A;18.500;12.345,67",
            f"2026;1;X;{b.identificador};{b.codigo_instalacao};B;950;1.000,00",
            f"2026;1;X;{c.identificador};{c.codigo_instalacao};C;-10;50,00",
            f"2026;1;X;{d.identificador};{d.codigo_instalacao};D;300;abc",
        ],
    )
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()

    # Só a linha B está correta — e o valor com ponto de milhar é lido certo.
    assert [(m["pontoMedicaoId"], m["consumoFisico"], m["valorFatura"]) for m in corpo["matched"]] == [
        (b.id, 950, 1000.0)
    ]
    erros = {u["linha"]: u["motivo"] for u in corpo["unmatched"]}
    assert set(erros) == {2, 4, 5}
    assert "ambíguo" in erros[2] and erros[2].startswith("Consumo inválido")
    assert "negativo" in erros[4]
    assert erros[5].startswith("Valor da fatura inválido")
    # Nenhuma linha virou 18,5.
    assert 18.5 not in [u["consumoFisico"] for u in corpo["unmatched"]]


def test_linha_de_outro_mes_e_recusada(como, pontos_luz):
    a, b, *_ = pontos_luz
    corpo = _previa(
        como("super"),
        [
            CABECALHO_LUZ,
            f"2026;1;X;{a.identificador};;A;100;80,00",
            f"2025;12;X;{b.identificador};;B (dezembro);200;160,00",
        ],
    ).json()
    assert [m["pontoMedicaoId"] for m in corpo["matched"]] == [a.id]
    assert [(u["linha"], u["motivo"]) for u in corpo["unmatched"]] == [
        (3, "A linha é de 12/2025, mas o mês escolhido é 01/2026")
    ]


def test_ponto_repetido_nao_entra_e_nao_infla_o_total(como, pontos_luz):
    a, b, *_ = pontos_luz
    corpo = _previa(
        como("super"),
        [
            CABECALHO_LUZ,
            f"2026;1;X;{a.identificador};;A;100;80,00",
            f"2026;1;X;{b.identificador};;B;50;40,00",
            f"2026;1;X;{a.identificador};;A de novo;200;160,00",
        ],
    ).json()
    assert [m["pontoMedicaoId"] for m in corpo["matched"]] == [b.id]
    assert corpo["totalValor"] == 40.0
    assert [(u["linha"], u["motivo"]) for u in corpo["unmatched"]] == [
        (2, "Ponto repetido no arquivo (linhas 2, 4)"),
        (4, "Ponto repetido no arquivo (linhas 2, 4)"),
    ]


def test_linha_sem_conta_no_mes_e_pulada_sem_erro(como, pontos_luz):
    a, b, *_ = pontos_luz
    corpo = _previa(
        como("super"),
        [CABECALHO_LUZ, f"2026;1;X;{a.identificador};;A;;", f"2026;1;X;{b.identificador};;B;10;"],
    ).json()
    assert len(corpo["matched"]) == 1
    assert corpo["unmatched"] == []


def test_ponto_desconhecido(como):
    corpo = _previa(como("super"), [CABECALHO_LUZ, "2026;1;X;UC-QUE-NAO-EXISTE;;Z;10;5,00"]).json()
    assert [u["motivo"] for u in corpo["unmatched"]] == ["Ponto de medição não encontrado"]


def test_planilha_de_agua_enviada_como_energia_e_recusada(como):
    resposta = _previa(como("super"), [CABECALHO_AGUA, "2026;1;X;397052340;COPESA;694;6940,69"], tipo="luz")
    assert resposta.status_code == 422
    assert "planilha de energia" in resposta.json()["detail"]
    assert "numero_uc" in resposta.json()["detail"]


@pytest.mark.parametrize(
    ("tipo", "mes"),
    [("qualquer-coisa", MES), ("luz", "2026-13"), ("luz", "janeiro"), ("luz", "")],
)
def test_tipo_e_mes_invalidos_sao_recusados(como, tipo, mes):
    assert _previa(como("super"), [CABECALHO_LUZ], tipo=tipo, mes=mes).status_code == 422


def test_cabecalho_em_maiusculas_ou_minusculas(como, ponto_de):
    ponto = ponto_de(6, "agua")
    corpo = _previa(
        como("super"),
        ["ANO;MES;endereço;pde/rgi;Local;CONSUMO_M3;Valor_Fatura", f"2026;1;X;{ponto.identificador};A;694;6940,69"],
        tipo="agua",
    ).json()
    assert [(m["consumoFisico"], m["valorFatura"]) for m in corpo["matched"]] == [(694, 6940.69)]


def test_arquivo_salvo_pelo_excel_em_cp1252(como, ponto_de):
    ponto = ponto_de(6, "agua")
    corpo = _previa(
        como("super"),
        [CABECALHO_AGUA, f"2026;1;RUA BARÃO;{ponto.identificador};COPESA;694;6940,69"],
        tipo="agua",
        codificacao="cp1252",
    ).json()
    assert len(corpo["matched"]) == 1


def test_planilha_de_exemplo_de_agua_entra_inteira(como):
    """O CSV preenchido de Docs/ é o caso real de referência."""
    arquivo = DOCS / "PLANILHA PADRÃO AGUA - TESTE.csv"
    resposta = como("super").post(
        "/importar/preview",
        files={"file": (arquivo.name, arquivo.open("rb"), "text/csv")},
        data={"tipo": "agua", "mes_referencia": MES},
    )
    corpo = resposta.json()
    assert len(corpo["matched"]) == 39
    assert corpo["unmatched"] == []
    assert all(m["consumoFisico"] > 0 for m in corpo["matched"])


@pytest.mark.parametrize(("arquivo", "tipo"), [("PLANILHA PADRÃO AGUA.csv", "agua"), ("PLANILHA PADRÃO ELETRICIDADE.csv", "luz")])
def test_modelo_em_branco_nao_gera_linha_nem_erro(como, arquivo, tipo):
    caminho = DOCS / arquivo
    corpo = como("super").post(
        "/importar/preview",
        files={"file": (caminho.name, caminho.open("rb"), "text/csv")},
        data={"tipo": tipo, "mes_referencia": MES},
    ).json()
    assert (corpo["matched"], corpo["unmatched"]) == ([], [])


# --- confirmação ---------------------------------------------------------------


def test_importacao_substitui_o_lancamento_manual_do_mesmo_campus_tipo_e_mes(como, pontos_luz, lancar):
    a, *_ = pontos_luz                       # ponto de luz do campus 2
    lancar(2, "luz", 9999)                   # manual que será substituído
    lancar(2, "agua", 111)                   # outro tipo: fica
    lancar(2, "luz", 222, mes="2025-12")     # outro mês: fica
    lancar(3, "luz", 333)                    # outro campus: fica

    cliente = como("super")
    previa = _previa(cliente, [CABECALHO_LUZ, f"2026;1;X;{a.identificador};;A;1000;800,00"]).json()
    assert previa["manuaisSubstituidos"] == 1

    confirmado = cliente.post(
        "/importar/confirmar", json={"mesReferencia": MES, "lancamentos": previa["matched"]}
    ).json()
    assert confirmado == {"imported": 1, "updated": 0, "ignored": 0, "manuaisRemovidos": 1}

    resumo = cliente.get(f"/resumo?mes={MES}").json()
    campus2 = next(c for c in resumo["campi"] if c["campusId"] == 2)
    assert (campus2["luz"], campus2["agua"]) == (1000, 111)   # 1000, não 1000 + 9999
    assert next(c for c in resumo["campi"] if c["campusId"] == 3)["luz"] == 333
    assert cliente.get("/resumo?mes=2025-12").json()["totalGeral"]["luz"] == 222


def test_confirmacao_informa_itens_ignorados_e_recusa_negativos(como, pontos_luz):
    a, *_ = pontos_luz
    cliente = como("super")
    confirmado = cliente.post(
        "/importar/confirmar",
        json={
            "mesReferencia": MES,
            "lancamentos": [
                {"pontoMedicaoId": a.id, "consumoFisico": 10},
                {"pontoMedicaoId": 999999, "consumoFisico": 10},
            ],
        },
    ).json()
    assert (confirmado["imported"], confirmado["ignored"]) == (1, 1)

    negativo = cliente.post(
        "/importar/confirmar",
        json={"mesReferencia": MES, "lancamentos": [{"pontoMedicaoId": a.id, "consumoFisico": -1}]},
    )
    assert negativo.status_code == 422
