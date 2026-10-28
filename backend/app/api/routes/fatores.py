"""Fatores de emissão anuais do SIN (SPEC R.2). Leitura para todos; gravação só do super."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_super
from app.db.models import FatorEmissao
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.carbono import FatorEmissaoIn, FatorEmissaoOut

router = APIRouter()


@router.get("/fatores-emissao", response_model=list[FatorEmissaoOut])
def listar_fatores(db: Session = Depends(get_db), _user: UserClaims = Depends(get_current_user)):
    return db.scalars(select(FatorEmissao).order_by(FatorEmissao.ano)).all()


@router.put("/fatores-emissao/{ano}", response_model=FatorEmissaoOut)
def gravar_fator(
    payload: FatorEmissaoIn,
    ano: int = Path(ge=2000, le=2099),
    db: Session = Depends(get_db),
    _user: UserClaims = Depends(require_super),
):
    registro = db.get(FatorEmissao, ano) or FatorEmissao(ano=ano)
    registro.fator = payload.fator
    registro.provisorio = payload.provisorio
    registro.fonte = payload.fonte
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro
