"""SPEC 2.4: importação de ponta a ponta. Importar de novo atualiza em vez de duplicar."""
from __future__ import annotations

import io
from pathlib import Path

from sqlalchemy import func, select

from app.db.models import Lancamento

MES = "2026-01"
DOCS = Path(__file__).resolve().parents[2] / "Docs"
CABECALHO_AGUA = "ano;mes;ENDEREÇO;PDE/RGI;LOCAL;consumo_m3;valor_fatura"


def _importar(cliente, conteudo: bytes, tipo: str = "agua", mes: str = MES) -> dict:
    previa = cliente.post(
        "/importar/preview",
        files={"file": ("planilha.csv", io.BytesIO(conteudo), "text/csv")},
        data={"tipo": tipo, "mes_referencia": mes},
    )
    assert previa.status_code == 200, previa.text
    confirmado = cliente.post(
        "/importar/confirmar", json={"mesReferencia": mes, "lancamentos": previa.json()["matched"]}
    )
    assert confirmado.status_code == 200, confirmado.text
    return confirmado.json()


def _csv(linhas: list[str]) -> bytes:
    return "\r\n".join([CABECALHO_AGUA, *linhas]).encode("utf-8-sig")


def _quantos_importados(db, mes: str = MES) -> int:
    return db.scalar(
        select(func.count()).select_from(Lancamento).where(
            Lancamento.origem == "importado", Lancamento.mes_referencia == mes
        )
    )


def test_planilha_corrigida_atualiza_os_pontos_e_insere_so_o_novo(como, db, ponto_de):
    a, b, c = (ponto_de(1, "agua", 0), ponto_de(2, "agua", 0), ponto_de(3, "agua", 0))
    cliente = como("super")

    primeira = _importar(
        cliente,
        _csv([f"2026;1;X;{a.identificador};A;100;10,00", f"2026;1;X;{b.identificador};B;200;20,00"]),
    )
    assert (primeira["imported"], primeira["updated"]) == (2, 0)
    assert cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == 300

    # A planilha volta corrigida: A mudou, B igual, C apareceu.
    segunda = _importar(
        cliente,
        _csv(
            [
                f"2026;1;X;{a.identificador};A;150;15,00",
                f"2026;1;X;{b.identificador};B;200;20,00",
                f"2026;1;X;{c.identificador};C;50;5,00",
            ]
        ),
    )
    assert (segunda["imported"], segunda["updated"]) == (1, 2)
    assert _quantos_importados(db) == 3
    # 150 + 200 + 50: o valor antigo de A foi trocado, não somado.
    assert cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == 400

    gravados = {i["pontoMedicaoId"]: i for i in cliente.get(f"/lancamentos?mes={MES}").json()}
    assert (gravados[a.id]["consumo"], gravados[a.id]["valorRs"]) == (150, 15)


def test_o_mesmo_ponto_em_meses_diferentes_sao_lancamentos_diferentes(como, db, ponto_de):
    a = ponto_de(1, "agua", 0)
    cliente = como("super")
    _importar(cliente, _csv([f"2026;1;X;{a.identificador};A;100;"]))
    fevereiro = _importar(cliente, _csv([f"2026;2;X;{a.identificador};A;120;"]), mes="2026-02")
    assert (fevereiro["imported"], fevereiro["updated"]) == (1, 0)
    assert _quantos_importados(db) == 1
    assert _quantos_importados(db, "2026-02") == 1


def test_planilha_real_de_agua_importada_duas_vezes_nao_dobra(como, db):
    caminho = DOCS / "PLANILHA PADRÃO AGUA - TESTE.csv"
    cliente = como("super")

    primeira = _importar(cliente, caminho.read_bytes())
    total = cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"]
    segunda = _importar(cliente, caminho.read_bytes())

    assert (primeira["imported"], primeira["updated"]) == (39, 0)
    assert (segunda["imported"], segunda["updated"]) == (0, 39)
    assert _quantos_importados(db) == 39
    assert cliente.get(f"/resumo?mes={MES}").json()["totalGeral"]["agua"] == total
