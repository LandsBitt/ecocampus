"""Pegada de carbono da energia (SPEC R.2, GreenMetric EC8).

emissão (kgCO₂) = consumo (kWh) × fator (tCO₂/MWh, que é o mesmo que kgCO₂/kWh).

O fator é o médio anual do SIN publicado pelo MCTI, um por ano. Ano sem fator
usa o último publicado ANTES dele, marcado como provisório. Sem nenhum fator
anterior não há pegada: a tela diz "sem fator cadastrado", nunca mostra zero.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import FatorEmissao
from app.schemas.carbono import FatorAplicado


def ano_do_mes(mes: str | None) -> int | None:
    return int(mes[:4]) if mes else None


def fator_para_ano(db: Session, ano: int | None) -> FatorAplicado | None:
    if ano is None:
        return None  # período sem mês: cada ano teria um fator diferente
    registro = db.scalars(
        select(FatorEmissao).where(FatorEmissao.ano <= ano).order_by(FatorEmissao.ano.desc()).limit(1)
    ).first()
    if registro is None:
        return None
    return FatorAplicado(
        anoReferencia=ano,
        anoDoFator=registro.ano,
        fator=float(registro.fator),
        provisorio=registro.provisorio or registro.ano != ano,
        fonte=registro.fonte,
    )


def emissao_kg(kwh: float, fator: FatorAplicado | None) -> float | None:
    return kwh * fator.fator if fator is not None else None
