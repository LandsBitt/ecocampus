"""Série histórica (SPEC R.5), comparação mensal e anual (SPEC R.3) e alerta de pico (SPEC R.4)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.alertas import HISTORICO_MINIMO, JANELA_MESES, LIMIAR_PICO
from app.core.limites import MES_PATTERN
from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.serie import AlertasOut, ComparacaoOut, PontoSerie
from app.services import serie as servico

router = APIRouter()


def _campus_do_escopo(user: UserClaims, campus_id: int | None) -> int | None:
    # O papel campus só enxerga o próprio campus, seja qual for o parâmetro.
    return user.campusId if user.role == "campus" else campus_id


@router.get("/serie", response_model=list[PontoSerie])
def serie(
    ate: str = Query(..., pattern=MES_PATTERN, description="Último mês da série (AAAA-MM)"),
    meses: int = Query(12, ge=1, le=36),
    campus_id: int | None = Query(default=None, alias="campusId"),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    return servico.serie(db, ate, meses, _campus_do_escopo(user, campus_id))


@router.get("/comparacao", response_model=ComparacaoOut)
def comparacao(
    mes: str = Query(..., pattern=MES_PATTERN),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    escopo, campi = servico.comparacao(db, mes, _campus_do_escopo(user, None))
    return ComparacaoOut(
        mes=mes,
        mesAnterior=servico.deslocar_mes(mes, -1),
        anoAnterior=servico.deslocar_mes(mes, -12),
        escopo=escopo,
        campi=campi,
    )


@router.get("/alertas/picos", response_model=AlertasOut)
def alertas_de_pico(
    mes: str = Query(..., pattern=MES_PATTERN),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    return AlertasOut(
        mes=mes,
        limiar=LIMIAR_PICO,
        janelaMeses=JANELA_MESES,
        historicoMinimo=HISTORICO_MINIMO,
        avaliados=servico.picos(db, mes, _campus_do_escopo(user, None)),
    )
