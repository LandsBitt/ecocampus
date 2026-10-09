"""Exclui os lançamentos marcados como carga antiga do script CPFL.

A migration 0010 apenas MARCA esses registros (`origem = 'cpfl_legado'`) e os
indicadores já os ignoram. Este script é o passo separado e explícito que os
remove de vez, depois de você conferir a lista.

Uso (a partir da raiz do projeto, com o venv do backend ativo):

    python scripts/excluir_cpfl_legado.py                # PRÉVIA: lista e não grava nada
    python scripts/excluir_cpfl_legado.py --confirmar    # grava um backup em CSV e exclui

Por padrão só roda contra o banco local. Para outro banco é preciso passar
`--permitir-remoto`, de propósito.
"""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / "backend" / ".env")

from sqlalchemy import delete, select  # noqa: E402

from app.db.models import Campus, Lancamento, LancamentoOrigem  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402

LEGADO = LancamentoOrigem.cpfl_legado.value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--confirmar", action="store_true", help="Exclui de fato (sem isto, só mostra).")
    parser.add_argument("--permitir-remoto", action="store_true", help="Permite rodar fora do banco local.")
    args = parser.parse_args()

    host = engine.url.host or ""
    if host not in {"localhost", "127.0.0.1"} and not args.permitir_remoto:
        raise SystemExit(f"Banco não local (host: {host!r}). Use --permitir-remoto se for mesmo a intenção.")
    print(f"Banco: {host}/{engine.url.database}")

    with SessionLocal() as db:
        nomes = dict(db.execute(select(Campus.id, Campus.nome)).all())
        linhas = db.scalars(
            select(Lancamento)
            .where(Lancamento.origem == LEGADO)
            .order_by(Lancamento.campus_id, Lancamento.mes_referencia, Lancamento.id)
        ).all()

        if not linhas:
            print("Nenhum lançamento marcado como cpfl_legado. Nada a fazer.")
            return

        por_campus: dict[int, list[Lancamento]] = {}
        for linha in linhas:
            por_campus.setdefault(linha.campus_id, []).append(linha)

        print(f"\n{len(linhas)} lançamentos marcados como cpfl_legado:\n")
        for campus_id, itens in por_campus.items():
            meses = [i.mes_referencia for i in itens]
            valores = sorted({str(i.consumo) for i in itens})
            criados = sorted({i.created_at.strftime("%Y-%m-%d %H:%M") for i in itens})
            print(
                f"  [{campus_id}] {nomes.get(campus_id, '?'):<24} {itens[0].tipo.value:<4} "
                f"{len(itens):>3} registros  {min(meses)} a {max(meses)}  "
                f"consumo: {', '.join(valores)}  criado em: {', '.join(criados)}"
            )

        if not args.confirmar:
            print("\nPRÉVIA — nada foi excluído. Rode de novo com --confirmar para excluir.")
            return

        backup = ROOT / f"cpfl_legado_backup_{datetime.now():%Y%m%d_%H%M%S}.csv"
        with backup.open("w", encoding="utf-8-sig", newline="") as arquivo:
            escritor = csv.writer(arquivo, delimiter=";")
            escritor.writerow(["id", "campus_id", "tipo", "consumo", "valor_rs", "mes_referencia", "created_at"])
            for i in linhas:
                escritor.writerow(
                    [i.id, i.campus_id, i.tipo.value, i.consumo, i.valor_rs, i.mes_referencia, i.created_at.isoformat()]
                )
        print(f"\nBackup gravado em {backup}")

        removidos = db.execute(delete(Lancamento).where(Lancamento.origem == LEGADO)).rowcount
        db.commit()
        print(f"{removidos} lançamentos excluídos.")


if __name__ == "__main__":
    main()
