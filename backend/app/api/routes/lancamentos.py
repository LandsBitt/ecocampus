from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_super
from app.db.models import Campus, Lancamento, LancamentoTipo
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.lancamento import LancamentoCreate, LancamentoOut, LancamentoUpdate

router = APIRouter()

ALLOWED_TIPOS = {LancamentoTipo.agua, LancamentoTipo.luz}


def _validate_campus_id(db: Session, value: int | None) -> None:
    if value is None or db.get(Campus, value) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="campusId inexistente",
        )


def _to_lancamento_out(item: Lancamento) -> LancamentoOut:
    return LancamentoOut.model_validate(item)


@router.get("/lancamentos", response_model=list[LancamentoOut])
def list_lancamentos(
    campus_id: int | None = Query(default=None, alias="campusId"),
    mes: str | None = None,
    tipo: LancamentoTipo | None = None,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    resolved_campus_id = user.campusId if user.role == "campus" else campus_id

    stmt = select(Lancamento).order_by(Lancamento.created_at.desc())
    if resolved_campus_id is not None:
        stmt = stmt.where(Lancamento.campus_id == resolved_campus_id)
    if mes:
        stmt = stmt.where(Lancamento.mes_referencia == mes)
    if tipo:
        stmt = stmt.where(Lancamento.tipo == tipo)

    items = db.scalars(stmt).all()
    return [_to_lancamento_out(item) for item in items]


@router.post("/lancamentos", response_model=LancamentoOut, status_code=status.HTTP_201_CREATED)
def create_lancamento(
    payload: LancamentoCreate,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    if payload.tipo not in ALLOWED_TIPOS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo inválido")

    campus_id = payload.campus_id
    if user.role == "campus":
        campus_id = user.campusId

    _validate_campus_id(db, campus_id)

    item = Lancamento(
        campus_id=campus_id,
        tipo=payload.tipo,
        valor_numeric=payload.valor,
        mes_referencia=payload.mes_referencia,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_lancamento_out(item)


@router.put("/lancamentos/{lancamento_id}", response_model=LancamentoOut)
def update_lancamento(
    lancamento_id: int,
    payload: LancamentoUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    item = db.get(Lancamento, lancamento_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")

    if payload.campus_id is not None:
        _validate_campus_id(db, payload.campus_id)
        item.campus_id = payload.campus_id
    if payload.tipo is not None:
        if payload.tipo not in ALLOWED_TIPOS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo inválido")
        item.tipo = payload.tipo
    if payload.valor is not None:
        item.valor_numeric = payload.valor
    if payload.mes_referencia is not None:
        item.mes_referencia = payload.mes_referencia

    db.commit()
    db.refresh(item)
    return _to_lancamento_out(item)


@router.delete("/lancamentos/{lancamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lancamento(
    lancamento_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    item = db.get(Lancamento, lancamento_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")
    db.delete(item)
    db.commit()
    return None
