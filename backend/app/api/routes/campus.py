from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_super
from app.db.models import Campus
from app.db.session import get_db
from app.schemas.campus import CampusOut

router = APIRouter()


@router.get("/campus", response_model=list[CampusOut])
def list_campus(
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    return db.scalars(select(Campus).order_by(Campus.id)).all()