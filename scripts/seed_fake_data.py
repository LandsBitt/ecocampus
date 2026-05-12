"""Semeia dados ficticios para teste local.

Uso (a partir da raiz do projeto, com o venv do backend ativo):

    python scripts/seed_fake_data.py            # 12 meses de lançamentos
    python scripts/seed_fake_data.py --months 6 # últimos 6 meses
    python scripts/seed_fake_data.py --wipe     # apaga TUDO (lançamentos + zera demografia)
    python scripts/seed_fake_data.py --reset    # wipe + seed novamente

Não é permanente — `--wipe` reverte o estado para o que a migration 0003 deixou
(6 campi, sem lançamentos, populacao=0, area=0).

Requer DATABASE_URL configurado em `backend/.env`.
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / "backend" / ".env")

from sqlalchemy import delete, update  # noqa: E402

from app.data.campus_mapping import CAMPI  # noqa: E402
from app.db.models import Campus, Lancamento, LancamentoTipo  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402


# Perfil ficticio por campus (consumo mensal médio, populacao, área).
# Valores inspirados nas planilhas CPFL anuais / 12 com variação.
PERFIL = {
    "Campus da Juta":          {"pop": 2200, "area": 12000, "luz": 10500, "agua": 480},
    "Campus do Itaim":         {"pop": 1800, "area": 18000, "luz": 18500, "agua": 850},
    "Campus do Bom Conselho":  {"pop": 1500, "area":  6500, "luz":  6200, "agua": 320},
    "Polo da Saúde":           {"pop":  900, "area":  4200, "luz":  4800, "agua": 280},
    "Direito":                 {"pop":  700, "area":  3000, "luz":  3500, "agua": 150},
    "Reitoria":                {"pop":  220, "area":  1800, "luz":  1900, "agua":  80},
}


def _ultimos_meses(n: int) -> list[str]:
    hoje = date.today().replace(day=1)
    meses = []
    y, m = hoje.year, hoje.month
    for _ in range(n):
        meses.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(meses))


def wipe(db) -> None:
    n_lanc = db.execute(delete(Lancamento)).rowcount
    db.execute(update(Campus).values(populacao=0, area_construida_m2=0))
    db.commit()
    print(f"[wipe] {n_lanc} lançamentos removidos, demografia zerada.")


def seed(db, meses: int) -> None:
    rng = random.Random(42)  # determinístico

    campi = db.query(Campus).all()
    nome_to_campus = {c.nome: c for c in campi}

    # Atualiza demografia
    for nome, perfil in PERFIL.items():
        c = nome_to_campus.get(nome)
        if not c:
            print(f"[aviso] campus '{nome}' não existe no banco — pulando.")
            continue
        c.populacao = perfil["pop"]
        c.area_construida_m2 = perfil["area"]

    lista_meses = _ultimos_meses(meses)
    novos = []
    for nome, perfil in PERFIL.items():
        c = nome_to_campus.get(nome)
        if not c:
            continue
        for mes in lista_meses:
            # Variação ±15% pra não ficar plano
            luz = perfil["luz"] * rng.uniform(0.85, 1.15)
            agua = perfil["agua"] * rng.uniform(0.85, 1.15)
            novos.append(Lancamento(
                campus_id=c.id,
                tipo=LancamentoTipo.luz,
                valor_numeric=Decimal(f"{luz:.2f}"),
                mes_referencia=mes,
            ))
            novos.append(Lancamento(
                campus_id=c.id,
                tipo=LancamentoTipo.agua,
                valor_numeric=Decimal(f"{agua:.2f}"),
                mes_referencia=mes,
            ))

    db.add_all(novos)
    db.commit()
    print(f"[seed] {len(novos)} lançamentos criados "
          f"({len(PERFIL)} campi × {meses} meses × 2 tipos). "
          f"Demografia atualizada.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed/wipe de dados ficticios.")
    parser.add_argument("--wipe", action="store_true", help="Apaga lançamentos e zera demografia.")
    parser.add_argument("--reset", action="store_true", help="Wipe + seed novamente.")
    parser.add_argument("--months", type=int, default=12, help="Meses a gerar (default 12).")
    args = parser.parse_args()

    with SessionLocal() as db:
        if args.wipe or args.reset:
            wipe(db)
        if args.wipe and not args.reset:
            return
        seed(db, args.months)


if __name__ == "__main__":
    main()
