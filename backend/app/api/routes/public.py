from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.indicadores import _avg
from app.api.routes.resumo import _campus_totals
from app.core.eco_score import classify_score, compute_eco_score
from app.db.models import Campus
from app.db.session import get_db
from app.schemas.campus import CampusComUnidades
from app.schemas.indicadores import IndicadorCampus, PizzaItem

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
    full_rows = _campus_totals(db, mes=mes)

    enriched = []
    for row in full_rows:
        total_agua = float(row.agua or 0)
        total_luz = float(row.luz or 0)
        total = float(row.total or 0)
        per_capita_agua = (total_agua / row.populacao) if row.populacao and row.populacao > 0 else None
        por_m2_luz = (total_luz / row.area_construida_m2) if row.area_construida_m2 and row.area_construida_m2 > 0 else None
        enriched.append({
            "row": row,
            "total_agua": total_agua,
            "total_luz": total_luz,
            "total": total,
            "per_capita_agua": per_capita_agua,
            "por_m2_luz": por_m2_luz,
        })

    avg_per_capita_agua = _avg([e["per_capita_agua"] for e in enriched if e["per_capita_agua"] is not None])
    avg_por_m2_luz = _avg([e["por_m2_luz"] for e in enriched if e["por_m2_luz"] is not None])
    avg_total = _avg([e["total"] for e in enriched])

    output: list[IndicadorCampus] = []
    for e in enriched:
        row = e["row"]
        score_agua = (
            compute_eco_score(e["per_capita_agua"], avg_per_capita_agua)
            if e["per_capita_agua"] is not None
            else None
        )
        score_luz = (
            compute_eco_score(e["por_m2_luz"], avg_por_m2_luz)
            if e["por_m2_luz"] is not None
            else None
        )

        partial = [s for s in (score_agua, score_luz) if s is not None]
        if partial:
            eco_score = sum(partial) / len(partial)
            normalizado = True
        else:
            eco_score = compute_eco_score(e["total"], avg_total)
            normalizado = False

        output.append(
            IndicadorCampus(
                campusId=row.id,
                nome=row.nome,
                populacao=row.populacao or 0,
                areaConstruidaM2=row.area_construida_m2 or 0,
                total=e["total"],
                totalAgua=e["total_agua"],
                totalLuz=e["total_luz"],
                consumoAguaPerCapita=e["per_capita_agua"],
                consumoLuzPorM2=e["por_m2_luz"],
                ecoScore=eco_score,
                ecoScoreAgua=score_agua,
                ecoScoreLuz=score_luz,
                normalizado=normalizado,
                classificacao=classify_score(eco_score),
            )
        )

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
