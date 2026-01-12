from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.auth import UserClaims

router = APIRouter()


@router.get("/me", response_model=UserClaims)
def read_me(user: UserClaims = Depends(get_current_user)):
    return user