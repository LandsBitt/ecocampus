from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.resumo import _campus_totals
from app.core.security import require_super
from app.db.session import get_db
from app.schemas.indicadores import PizzaItem

router = APIRouter()


def pizza_por_campus(rows) -> list[PizzaItem]:
    """Consumo de cada campus por medida; o front monta uma pizza para cada uma."""
    return [
        PizzaItem(campusId=row.id, nome=row.nome, agua=float(row.agua or 0), luz=float(row.luz or 0))
        for row in rows
    ]


@router.get("/grafico/pizza", response_model=list[PizzaItem])
def grafico_pizza(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    return pizza_por_campus(_campus_totals(db, mes=mes))
