from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.resumo import _campus_totals
from app.core.eco_score import classify_score, compute_eco_score
from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.indicadores import IndicadorCampus

router = APIRouter()


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


@router.get("/indicadores", response_model=list[IndicadorCampus])
def indicadores(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    # When the user is a campus admin, they only see their own row, but the
    # benchmark (averages) must still be computed against ALL campi. Otherwise
    # a single-row dataset would always return score 100.
    full_rows = _campus_totals(db, mes=mes)

    enriched = []
    for row in full_rows:
        total_agua = float(row.agua or 0)
        total_luz = float(row.luz or 0)
        total = float(row.total or 0)
        per_capita_agua = (total_agua / row.populacao) if row.populacao and row.populacao > 0 else None
        por_m2_luz = (total_luz / row.area_construida_m2) if row.area_construida_m2 and row.area_construida_m2 > 0 else None
        enriched.append(
            {
                "row": row,
                "total_agua": total_agua,
                "total_luz": total_luz,
                "total": total,
                "per_capita_agua": per_capita_agua,
                "por_m2_luz": por_m2_luz,
            }
        )

    avg_per_capita_agua = _avg([e["per_capita_agua"] for e in enriched if e["per_capita_agua"] is not None])
    avg_por_m2_luz = _avg([e["por_m2_luz"] for e in enriched if e["por_m2_luz"] is not None])
    avg_total = _avg([e["total"] for e in enriched])

    visible_campus_id = user.campusId if user.role == "campus" else None

    output: list[IndicadorCampus] = []
    for e in enriched:
        row = e["row"]
        if visible_campus_id is not None and row.id != visible_campus_id:
            continue

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
            # Fallback legado: campus sem população/área cadastradas.
            # Mantém comportamento atual (consumo absoluto vs média absoluta)
            # para não quebrar dashboards enquanto o admin não preenche os dados.
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
    return output
