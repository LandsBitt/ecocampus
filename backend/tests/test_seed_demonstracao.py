"""SPEC R.0: o seed de demonstração nunca cobre dado real e se apaga sozinho."""
from __future__ import annotations

import importlib.util
from pathlib import Path

from sqlalchemy import func, select

from app.db.models import Campus, Lancamento

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "seed_fake_data.py"


def _seed():
    spec = importlib.util.spec_from_file_location("seed_fake_data", SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def _contagem(db, **filtros) -> int:
    stmt = select(func.count()).select_from(Lancamento)
    for campo, valor in filtros.items():
        stmt = stmt.where(getattr(Lancamento, campo) == valor)
    return db.scalar(stmt)


def test_seed_grava_demonstracao_e_pula_o_que_ja_e_real(db, lancar):
    seed = _seed()
    mes = seed._ultimos_meses(1)[0]
    real = lancar(1, "agua", 123, mes=mes)               # manual real no mês mais recente
    lancar(1, "luz", 456, mes=mes, origem="cpfl_legado")  # legado não conta: recebe demonstração

    campi = {c.nome: c for c in db.scalars(select(Campus)).all()}
    seed.seed_lancamentos(db, campi, meses=3)

    assert _contagem(db, origem="demonstracao") == 8 * 3 * 2 - 1
    assert _contagem(db, campus_id=1, tipo="agua", mes_referencia=mes) == 1
    assert db.get(Lancamento, real.id).consumo == 123
    assert _contagem(db, campus_id=1, tipo="luz", mes_referencia=mes, origem="demonstracao") == 1


def test_wipe_apaga_so_demonstracao(db, lancar):
    seed = _seed()
    lancar(1, "agua", 123)                                  # manual
    lancar(2, "agua", 500, origem="demonstracao")
    lancar(3, "luz", 456, origem="cpfl_legado")

    seed.wipe(db)

    assert _contagem(db, origem="demonstracao") == 0
    assert _contagem(db, origem="manual") == 1
    assert _contagem(db, origem="cpfl_legado") == 1


def test_demonstracao_segue_a_escala_do_consumo_real(db, lancar):
    # Sem calibrar, a demonstração ficaria ~7× abaixo da água real e o mês real viraria "pico".
    seed = _seed()
    mes_real = seed._ultimos_meses(3)[0]
    lancar(1, "agua", 10000, mes=mes_real, origem="importado")

    campi = {c.nome: c for c in db.scalars(select(Campus)).all()}
    seed.seed_lancamentos(db, campi, meses=3)

    simulados = db.scalars(
        select(Lancamento.consumo).where(
            Lancamento.campus_id == 1, Lancamento.tipo == "agua", Lancamento.origem == "demonstracao"
        )
    ).all()
    assert len(simulados) == 2
    assert all(8500 <= float(v) <= 11500 for v in simulados)   # ±15% em torno da média real
