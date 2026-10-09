"""Importa planilhas anuais da CPFL (ConsumoAnual / ConsumoAnualCabines) para
o banco como lançamentos de energia (tipo='luz').

Cada UC tem só o total anual de kWh. O schema é mensal (`mes_referencia` YYYY-MM),
então o script divide por 12 e cria 12 lançamentos — um pra cada mês do último ano.

Uso (a partir da raiz do projeto, com o venv do backend ativo):

    pip install openpyxl   # uma vez

    python scripts/import_consumo_cpfl.py "caminho/arquivo.xlsx"
    python scripts/import_consumo_cpfl.py arquivo1.xlsx arquivo2.xlsx
    python scripts/import_consumo_cpfl.py *.xlsx --dry-run
    python scripts/import_consumo_cpfl.py *.xlsx --wipe-luz   # limpa lanc de luz antes

Não toca em lançamentos de água. Use `seed_fake_data.py --wipe` para limpar tudo.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / "backend" / ".env")

try:
    import openpyxl  # noqa: E402
except ImportError:
    print("Falta openpyxl. Rode: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

from sqlalchemy import delete  # noqa: E402

from app.data.campus_mapping import (  # noqa: E402
    campus_id_por_endereco,
    CAMPI,
    ENDERECOS_FORA_UNITAU,
)
from app.db.models import Lancamento, LancamentoTipo  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402


# Index de colunas por layout (0-based). Detectado pelo cabeçalho.
LAYOUTS = {
    "convencional": {
        # ConsumoAnual: UC, kWh 12m, R$ 12m, instalação, endereço
        "consumo": 1,
        "endereco": 4,
        "instalacao": 3,
        "uc": 0,
    },
    "cabine": {
        # ConsumoAnualCabines: UC, instalação, Cons. Ponta Ind., Ponta,
        # Ponta Cap., Demanda, Demanda Não Util., Total fatura, ERE, Endereço
        # Para o tipo='luz' usamos a soma dos 3 ativos.
        "ponta_ind": 2,
        "ponta": 3,
        "ponta_cap": 4,
        "endereco": 9,
        "instalacao": 1,
        "uc": 0,
    },
}


def _ultimos_12_meses() -> list[str]:
    hoje = date.today().replace(day=1)
    meses, y, m = [], hoje.year, hoje.month
    for _ in range(12):
        meses.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(meses))


def _detecta_layout(header: tuple) -> str:
    h = [str(c or "").lower() for c in header]
    if any("demanda" in c for c in h):
        return "cabine"
    return "convencional"


def _consumo_kwh(layout: str, row: tuple) -> float | None:
    cols = LAYOUTS[layout]
    if layout == "convencional":
        v = row[cols["consumo"]]
        return float(v) if v is not None else None
    # cabine: soma dos 3 ativos (ponta indutiva + ponta + ponta capacitiva)
    partes = [row[cols[k]] for k in ("ponta_ind", "ponta", "ponta_cap")]
    if all(p is None for p in partes):
        return None
    return float(sum(p or 0 for p in partes))


def _processa_arquivo(path: Path) -> list[dict]:
    """Retorna lista de dicts {endereco, uc, consumo_anual_kwh, instalacao}."""
    wb = openpyxl.load_workbook(path, data_only=True)
    if "Dados" not in wb.sheetnames:
        print(f"  [aviso] {path.name}: aba 'Dados' não encontrada — pulando.")
        return []
    ws = wb["Dados"]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    header = rows[0]
    layout = _detecta_layout(header)
    cols = LAYOUTS[layout]
    print(f"  layout detectado: {layout}")

    saida = []
    for row in rows[1:]:
        endereco = row[cols["endereco"]] if cols["endereco"] < len(row) else None
        if not endereco:
            continue
        consumo = _consumo_kwh(layout, row)
        if not consumo or consumo <= 0:
            continue
        saida.append({
            "uc": row[cols["uc"]],
            "instalacao": row[cols["instalacao"]],
            "endereco": str(endereco).strip(),
            "consumo_anual_kwh": consumo,
        })
    return saida


def main() -> None:
    # Aposentado (SPEC, decisão D2): gravava o total anual ÷ 12 como se fosse
    # dado mensal, sem ponto de medição. O que ele já gravou está marcado como
    # `cpfl_legado` e fora dos indicadores. Use a importação de planilha do sistema.
    raise SystemExit(
        "Script aposentado: os dados anuais ÷ 12 não podem entrar como consumo mensal. "
        "Use a tela Importar planilha. Para remover a carga antiga: scripts/excluir_cpfl_legado.py"
    )
    parser = argparse.ArgumentParser(description="Importa planilhas CPFL para lançamentos de luz.")
    parser.add_argument("arquivos", nargs="+", help="Caminho(s) de XLSX")
    parser.add_argument("--dry-run", action="store_true", help="Não grava — só mostra o que faria.")
    parser.add_argument("--wipe-luz", action="store_true", help="Apaga lançamentos de luz antes.")
    args = parser.parse_args()

    id_nome = {c["id"]: c["nome"] for c in CAMPI}

    todos: list[dict] = []
    for raw in args.arquivos:
        p = Path(raw)
        if not p.exists():
            print(f"[erro] arquivo não encontrado: {p}", file=sys.stderr)
            continue
        print(f"\n>> {p.name}")
        todos.extend(_processa_arquivo(p))

    if not todos:
        print("Nada para importar.")
        return

    # Agrupa por campus, separa não mapeados, ignora endereços fora da UNITAU.
    casados: dict[int, list[dict]] = {}
    nao_casaram: list[dict] = []
    fora_unitau: list[dict] = []
    for r in todos:
        end_upper = r["endereco"].upper().strip()
        if any(end_upper.startswith(prefix) for prefix in ENDERECOS_FORA_UNITAU):
            fora_unitau.append(r)
            continue
        cid = campus_id_por_endereco(r["endereco"])
        if cid is None:
            nao_casaram.append(r)
        else:
            casados.setdefault(cid, []).append(r)

    print("\n=== Resumo ===")
    total_kwh = 0.0
    for cid, ucs in sorted(casados.items()):
        soma = sum(u["consumo_anual_kwh"] for u in ucs)
        total_kwh += soma
        print(f"  [{cid}] {id_nome[cid]:25s} {len(ucs):>2} UCs  {soma:>12,.0f} kWh/ano")
    if nao_casaram:
        print(f"\n  [!] {len(nao_casaram)} UCs sem campus (ignoradas):")
        for r in nao_casaram:
            print(f"      {r['endereco']}  ({r['consumo_anual_kwh']:.0f} kWh)")
    if fora_unitau:
        print(f"\n  (i) {len(fora_unitau)} UCs marcadas como nao-UNITAU (ignoradas silenciosamente):")
        for r in fora_unitau:
            print(f"      {r['endereco']}  ({r['consumo_anual_kwh']:.0f} kWh)")
    print(f"\n  TOTAL importável: {total_kwh:,.0f} kWh/ano")

    meses = _ultimos_12_meses()

    if args.dry_run:
        print("\n[dry-run] nada foi gravado.")
        return

    with SessionLocal() as db:
        if args.wipe_luz:
            n = db.execute(
                delete(Lancamento).where(Lancamento.tipo == LancamentoTipo.luz)
            ).rowcount
            db.commit()
            print(f"\n[wipe-luz] {n} lançamentos de luz removidos.")

        novos = []
        for cid, ucs in casados.items():
            soma_anual = sum(u["consumo_anual_kwh"] for u in ucs)
            mensal = soma_anual / 12.0
            for mes in meses:
                novos.append(Lancamento(
                    campus_id=cid,
                    tipo=LancamentoTipo.luz,
                    valor_numeric=Decimal(f"{mensal:.2f}"),
                    mes_referencia=mes,
                ))
        db.add_all(novos)
        db.commit()
        print(f"\n[ok] {len(novos)} lançamentos de luz criados "
              f"({len(casados)} campi × 12 meses).")


if __name__ == "__main__":
    main()
