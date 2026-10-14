"""Semeia dados FICTÍCIOS para desenvolvimento local.

Uso (a partir da raiz do projeto, com o venv do backend ativo):

    python scripts/seed_fake_data.py               # demografia fictícia + 12 meses de lançamentos
    python scripts/seed_fake_data.py --months 6    # últimos 6 meses
    python scripts/seed_fake_data.py --demografia  # só população/área fictícias, sem lançamentos
    python scripts/seed_fake_data.py --wipe        # remove o que este script criou
    python scripts/seed_fake_data.py --reset       # wipe + seed novamente

Nada aqui é dado real. População e área ficam gravadas com a fonte "FICTÍCIO"
(`campus.demografia_fonte`), que a tela de Campi exibe; quando os números reais
forem cadastrados, a marca some. O script recusa bancos que não sejam locais.

`--wipe` remove só lançamentos manuais sem ponto de medição e zera a demografia
marcada como fictícia. Importações e a carga antiga do script CPFL não são tocadas.

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

from app.db.models import Campus, Lancamento, LancamentoOrigem, LancamentoTipo  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402

FONTE_FICTICIA = "FICTÍCIO"

# Perfil FICTÍCIO por campus: população, área (m²) e consumo mensal médio
# (luz em kWh, água em m³). Serve só para o ranking funcionar em desenvolvimento.
PERFIL = {
    "Campus da Juta":          {"pop": 2200, "area": 12000, "luz": 10500, "agua": 480},
    "Campus do Itaim":         {"pop": 1800, "area": 18000, "luz": 18500, "agua": 850},
    "Campus do Bom Conselho":  {"pop": 1500, "area":  6500, "luz":  6200, "agua": 320},
    "Polo da Saúde":           {"pop":  900, "area":  4200, "luz":  4800, "agua": 280},
    "Direito":                 {"pop":  700, "area":  3000, "luz":  3500, "agua": 150},
    "Reitoria":                {"pop":  220, "area":  1800, "luz":  1900, "agua":  80},
    "Colégio UNITAU":          {"pop":  600, "area":  3500, "luz":  3200, "agua": 210},
    "Campus de Arquitetura":   {"pop":  450, "area":  2800, "luz":  2600, "agua": 110},
}


def _exige_banco_local() -> None:
    host = engine.url.host or ""
    if host not in {"localhost", "127.0.0.1"}:
        raise SystemExit(f"Dados fictícios só entram no banco local (host atual: {host!r}).")


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
    n_lanc = db.execute(
        delete(Lancamento).where(
            Lancamento.origem == LancamentoOrigem.manual.value,
            Lancamento.ponto_medicao_id.is_(None),
        )
    ).rowcount
    n_campi = db.execute(
        update(Campus)
        .where(Campus.demografia_fonte == FONTE_FICTICIA)
        .values(populacao=0, area_construida_m2=0, demografia_fonte=None, demografia_referencia=None)
    ).rowcount
    db.commit()
    print(f"[wipe] {n_lanc} lançamentos manuais removidos; demografia fictícia zerada em {n_campi} campi.")


def seed_demografia(db) -> dict[str, Campus]:
    nome_to_campus = {c.nome: c for c in db.query(Campus).all()}
    marcados = 0
    for nome, perfil in PERFIL.items():
        c = nome_to_campus.get(nome)
        if not c:
            print(f"[aviso] campus '{nome}' não existe no banco — pulando.")
            continue
        # Nunca sobrescreve número real: só preenche campus vazio ou já fictício.
        if (c.populacao or c.area_construida_m2) and c.demografia_fonte not in (None, FONTE_FICTICIA):
            print(f"[aviso] '{nome}' já tem demografia de '{c.demografia_fonte}' — mantida.")
            continue
        c.populacao = perfil["pop"]
        c.area_construida_m2 = perfil["area"]
        c.demografia_fonte = FONTE_FICTICIA
        c.demografia_referencia = None
        marcados += 1
    db.commit()
    print(f"[seed] demografia {FONTE_FICTICIA} gravada em {marcados} campi.")
    return nome_to_campus


def seed_lancamentos(db, nome_to_campus: dict[str, Campus], meses: int) -> None:
    rng = random.Random(42)  # determinístico

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
            for tipo, consumo in ((LancamentoTipo.luz, luz), (LancamentoTipo.agua, agua)):
                novos.append(Lancamento(
                    campus_id=c.id,
                    tipo=tipo,
                    consumo=Decimal(f"{consumo:.2f}"),
                    origem=LancamentoOrigem.manual.value,
                    mes_referencia=mes,
                    criado_por="scripts/seed_fake_data.py",
                ))

    db.add_all(novos)
    db.commit()
    print(f"[seed] {len(novos)} lançamentos fictícios criados "
          f"({len(PERFIL)} campi × {meses} meses × 2 tipos).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed/wipe de dados FICTÍCIOS (somente banco local).")
    parser.add_argument("--wipe", action="store_true", help="Remove o que este script criou.")
    parser.add_argument("--reset", action="store_true", help="Wipe + seed novamente.")
    parser.add_argument("--demografia", action="store_true", help="Só população/área fictícias, sem lançamentos.")
    parser.add_argument("--months", type=int, default=12, help="Meses a gerar (default 12).")
    args = parser.parse_args()

    _exige_banco_local()
    with SessionLocal() as db:
        if args.wipe or args.reset:
            wipe(db)
        if args.wipe and not args.reset:
            return
        campi = seed_demografia(db)
        if not args.demografia:
            seed_lancamentos(db, campi, args.months)


if __name__ == "__main__":
    main()
