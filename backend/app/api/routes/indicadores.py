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


@router.get("/indicadores", response_model=list[IndicadorCampus])
def indicadores(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    campus_id = user.campusId if user.role == "campus" else None
    rows = _campus_totals(db, mes=mes, campus_id=campus_id)
    totals = [float(row.total or 0) for row in rows]
    average = sum(totals) / len(totals) if totals else 0.0

    output: list[IndicadorCampus] = []
    for row in rows:
        total = float(row.total or 0)
        score = compute_eco_score(total, average)
        output.append(
            IndicadorCampus(
                campusId=row.id,
                nome=row.nome,
                total=total,
                ecoScore=score,
                classificacao=classify_score(score),
            )
        )
    return output