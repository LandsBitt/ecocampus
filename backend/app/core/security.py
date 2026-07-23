from __future__ import annotations

import json
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.schemas.auth import UserClaims


security_scheme = HTTPBearer(auto_error=False)


def init_firebase() -> None:
    if firebase_admin._apps:
        return
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        payload = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        cred = credentials.Certificate(payload)
        firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
    else:
        # Uses GOOGLE_APPLICATION_CREDENTIALS or default app credentials.
        firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})


init_firebase()


def _extract_claims(decoded: dict) -> UserClaims:
    role = decoded.get("role")
    campus_id = decoded.get("campusId")
    if role not in {"super", "campus"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid role claim",
        )
    if role == "campus":
        # Sanidade estrutural apenas; a existência do campus é validada
        # contra o banco nas rotas que usam o id (evita range hardcoded).
        if not isinstance(campus_id, int) or campus_id < 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing or invalid campusId claim",
            )
    else:
        campus_id = None
    return UserClaims(
        uid=decoded.get("uid"),
        email=decoded.get("email"),
        role=role,
        campusId=campus_id,
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> UserClaims:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:  # pragma: no cover - firebase errors vary
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc
    if decoded.get("aud") != settings.FIREBASE_PROJECT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token audience")
    issuer = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
    if decoded.get("iss") != issuer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer")
    return _extract_claims(decoded)


def require_super(user: UserClaims = Depends(get_current_user)) -> UserClaims:
    if user.role != "super":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super only")
    return user
