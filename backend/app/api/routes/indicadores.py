from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.resumo import _campus_totals
from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.indicadores import IndicadorCampus, IndicadorUniversidade
from app.services.indicadores import calcular_indicadores, indicador_universidade

router = APIRouter()


@router.get("/indicadores", response_model=list[IndicadorCampus])
def indicadores(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    # When the user is a campus admin, they only see their own row, but the
    # benchmark (averages) must still be computed against ALL campi. Otherwise
    # a single-row dataset would always return score 100.
    output = calcular_indicadores(_campus_totals(db, mes=mes))
    if user.role == "campus":
        return [item for item in output if item.campus_id == user.campusId]
    return output


@router.get("/indicadores/universidade", response_model=IndicadorUniversidade)
def indicadores_universidade(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: UserClaims = Depends(get_current_user),
):
    # Agregado da universidade: o papel campus também vê (D11, "referência").
    return indicador_universidade(calcular_indicadores(_campus_totals(db, mes=mes)))
