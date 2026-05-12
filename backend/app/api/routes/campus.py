from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_super
from app.db.models import Campus
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.campus import CampusOut, CampusUpdate

router = APIRouter()


@router.get("/campus", response_model=list[CampusOut])
def list_campus(
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    stmt = select(Campus).order_by(Campus.id)
    if user.role == "campus":
        stmt = stmt.where(Campus.id == user.campusId)
    return db.scalars(stmt).all()


@router.patch("/campus/{campus_id}", response_model=CampusOut)
def update_campus(
    campus_id: int,
    payload: CampusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    campus = db.get(Campus, campus_id)
    if campus is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campus não encontrado")

    if payload.populacao is not None:
        campus.populacao = payload.populacao
    if payload.area_construida_m2 is not None:
        campus.area_construida_m2 = payload.area_construida_m2

    db.commit()
    db.refresh(campus)
    return campus
