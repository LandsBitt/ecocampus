from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.resumo import _campus_totals
from app.core.security import require_super
from app.db.session import get_db
from app.schemas.indicadores import PizzaItem

router = APIRouter()


@router.get("/grafico/pizza", response_model=list[PizzaItem])
def grafico_pizza(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    rows = _campus_totals(db, mes=mes)
    return [
        {
            "campusId": row.id,
            "nome": row.nome,
            "total": float(row.total or 0),
        }
        for row in rows
    ]