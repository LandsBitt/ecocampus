from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.grafico import pizza_por_campus
from app.api.routes.resumo import _campus_totals
from app.db.session import get_db
from app.schemas.indicadores import IndicadorCampus, PizzaItem
from app.services.indicadores import calcular_indicadores, ordenar_ranking

router = APIRouter()


@router.get("/public/ranking", response_model=list[IndicadorCampus])
def public_ranking(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return ordenar_ranking(calcular_indicadores(_campus_totals(db, mes=mes)))


@router.get("/public/pizza", response_model=list[PizzaItem])
def public_pizza(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return pizza_por_campus(_campus_totals(db, mes=mes))
