from __future__ import annotations

import json
import threading
import time
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


# Conferir se o token foi revogado é uma ida ao Firebase (~280 ms medidos em
# 2026-10-28) em TODA requisição, e o Painel faz várias de uma vez (achado B3).
# O token conferido vale por este tempo, nunca além do vencimento dele. A tela
# Usuários esquece o usuário na hora em que revoga; noutro processo do servidor,
# a revogação vale em até este tempo.
REVOGACAO_TTL_SEGUNDOS = 300
_MAX_TOKENS_EM_CACHE = 1000

_tokens_conferidos: dict[str, tuple[float, dict]] = {}
_trava = threading.Lock()


def _decodificar(token: str) -> dict:
    agora = time.monotonic()
    with _trava:
        guardado = _tokens_conferidos.get(token)
        if guardado and guardado[0] > agora:
            return guardado[1]

    decoded = auth.verify_id_token(token, check_revoked=True)

    restante_do_token = max(0.0, float(decoded.get("exp", 0)) - time.time())
    valido_ate = agora + min(REVOGACAO_TTL_SEGUNDOS, restante_do_token)
    with _trava:
        if len(_tokens_conferidos) >= _MAX_TOKENS_EM_CACHE:
            vencidos = [t for t, (ate, _) in _tokens_conferidos.items() if ate <= agora]
            for t in vencidos:
                del _tokens_conferidos[t]
            if len(_tokens_conferidos) >= _MAX_TOKENS_EM_CACHE:
                _tokens_conferidos.clear()
        _tokens_conferidos[token] = (valido_ate, decoded)
    return decoded


def esquecer_usuario(uid: str) -> None:
    """Depois de revogar: a próxima requisição dele volta a conferir no Firebase."""
    with _trava:
        for t in [t for t, (_, d) in _tokens_conferidos.items() if d.get("uid") == uid]:
            del _tokens_conferidos[t]


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
    # Inicialização sob demanda: importar este módulo não exige credenciais
    # do Firebase (os testes trocam esta dependência por um usuário fixo).
    init_firebase()
    try:
        decoded = _decodificar(token)
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


def autor(user: UserClaims) -> str | None:
    """Como o usuário fica registrado em `criado_por`: o e-mail, ou o uid se não houver e-mail."""
    return user.email or user.uid
