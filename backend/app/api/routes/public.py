from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.resumo import _campus_totals
from app.db.models import Campus
from app.db.session import get_db
from app.schemas.campus import CampusComUnidades
from app.schemas.indicadores import IndicadorCampus, PizzaItem
from app.services.indicadores import calcular_indicadores

router = APIRouter()


@router.get("/public/campus", response_model=list[CampusComUnidades])
def public_campus(db: Session = Depends(get_db)):
    stmt = (
        select(Campus)
        .options(selectinload(Campus.pontos_medicao))
        .order_by(Campus.id)
    )
    return db.scalars(stmt).all()


@router.get("/public/ranking", response_model=list[IndicadorCampus])
def public_ranking(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    output = calcular_indicadores(_campus_totals(db, mes=mes))
    return sorted(output, key=lambda x: x.eco_score, reverse=True)


@router.get("/public/pizza", response_model=list[PizzaItem])
def public_pizza(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    rows = _campus_totals(db, mes=mes)
    return [
        {"campusId": row.id, "nome": row.nome, "total": float(row.total or 0)}
        for row in rows
    ]
