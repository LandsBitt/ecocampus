"""SPEC 4.3: a importação faz poucas consultas, seja qual for o tamanho da planilha."""
from __future__ import annotations

import io
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import event

DOCS = Path(__file__).resolve().parents[2] / "Docs"
PLANILHA_AGUA = DOCS / "PLANILHA PADRÃO AGUA - TESTE.csv"
MES = "2026-01"
TETO = 3


@contextmanager
def contando_consultas(db):
    """Conta as instruções SQL da rota; savepoints do teste não contam."""
    consultas: list[str] = []

    def anota(_conn, _cursor, sql, *_):
        if not sql.lstrip().upper().startswith(("SAVEPOINT", "RELEASE", "ROLLBACK")):
            consultas.append(sql)

    conexao = db.connection()
    event.listen(conexao, "before_cursor_execute", anota)
    try:
        yield consultas
    finally:
        event.remove(conexao, "before_cursor_execute", anota)


def _previa(cliente):
    return cliente.post(
        "/importar/preview",
        files={"file": ("agua.csv", io.BytesIO(PLANILHA_AGUA.read_bytes()), "text/csv")},
        data={"tipo": "agua", "mes_referencia": MES},
    )


def test_previa_da_planilha_real_faz_no_maximo_tres_consultas(como, db):
    cliente = como("super")
    with contando_consultas(db) as consultas:
        resposta = _previa(cliente)
    assert resposta.status_code == 200, resposta.text
    assert len(resposta.json()["matched"]) == 39
    assert len(consultas) <= TETO, f"{len(consultas)} consultas na prévia"


def test_confirmacao_da_planilha_real_faz_no_maximo_tres_consultas(como, db):
    cliente = como("super")
    itens = _previa(cliente).json()["matched"]
    with contando_consultas(db) as consultas:
        resposta = cliente.post("/importar/confirmar", json={"mesReferencia": MES, "lancamentos": itens})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["imported"] == 39
    assert len(consultas) <= TETO, f"{len(consultas)} consultas na confirmação"


PLANILHA_LUZ = DOCS / "PLANILHA PADRÃO ELETRICIDADE.csv"


def _luz_preenchida(uc_trocada: bool = False) -> bytes:
    """A planilha modelo de energia vem sem consumo; preenche 100 kWh em toda linha."""
    linhas = PLANILHA_LUZ.read_text(encoding="utf-8-sig").splitlines()
    cabecalho = linhas[0].split(";")
    i_consumo, i_uc = cabecalho.index("consumo_kwh"), cabecalho.index("numero_uc")
    saida = [linhas[0]]
    for linha in linhas[1:]:
        celulas = linha.split(";")
        if len(celulas) < len(cabecalho):
            continue
        celulas[i_consumo] = "100"
        if uc_trocada:
            celulas[i_uc] = "UC-QUE-NAO-EXISTE"
        saida.append(";".join(celulas))
    return "\r\n".join(saida).encode("utf-8-sig")


def _previa_luz(cliente, conteudo: bytes):
    return cliente.post(
        "/importar/preview",
        files={"file": ("luz.csv", io.BytesIO(conteudo), "text/csv")},
        data={"tipo": "luz", "mes_referencia": MES},
    )


def test_planilha_de_energia_acha_os_mesmos_pontos_pela_instalacao(como, db):
    cliente = como("super")
    with contando_consultas(db) as consultas:
        pela_uc = _previa_luz(cliente, _luz_preenchida())
    assert pela_uc.status_code == 200, pela_uc.text
    assert len(consultas) <= TETO
    pela_instalacao = _previa_luz(cliente, _luz_preenchida(uc_trocada=True))
    ids = lambda r: sorted(m["pontoMedicaoId"] for m in r.json()["matched"])  # noqa: E731
    assert ids(pela_uc) and ids(pela_instalacao) == ids(pela_uc)


def test_reimportar_atualiza_com_as_mesmas_tres_consultas(como, db):
    cliente = como("super")
    itens = _previa(cliente).json()["matched"]
    cliente.post("/importar/confirmar", json={"mesReferencia": MES, "lancamentos": itens})
    for item in itens:
        item["consumoFisico"] += 1
    with contando_consultas(db) as consultas:
        resposta = cliente.post("/importar/confirmar", json={"mesReferencia": MES, "lancamentos": itens})
    assert (resposta.json()["imported"], resposta.json()["updated"]) == (0, 39)
    assert len(consultas) <= TETO


def test_arquivo_grande_demais_e_recusado(como):
    grande = b"ano;mes;PDE/RGI;LOCAL;consumo_m3;valor_fatura\r\n" + b"x" * 1_000_001
    resposta = como("super").post(
        "/importar/preview",
        files={"file": ("grande.csv", io.BytesIO(grande), "text/csv")},
        data={"tipo": "agua", "mes_referencia": MES},
    )
    assert resposta.status_code == 413
    assert "1 MB" in resposta.json()["detail"]
