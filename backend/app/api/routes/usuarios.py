"""Contas de acesso, mantidas no Firebase Auth. Só a administração central mexe aqui.

O papel (`role`) e o campus vão nas custom claims do token, as mesmas que
`scripts/set_claims.py` grava; o banco não guarda usuários.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
from firebase_admin.auth import EmailAlreadyExistsError, UserNotFoundError
from sqlalchemy.orm import Session

from app.core.security import esquecer_usuario, init_firebase, require_super
from app.db.models import Campus
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate

router = APIRouter()


def _firebase():
    """Ponto único de acesso ao Firebase Auth; os testes trocam por um falso."""
    init_firebase()
    return auth


def _claims(role: str, campus_id: int | None) -> dict[str, object]:
    return {"role": role, "campusId": campus_id} if role == "campus" else {"role": role}


def _para_saida(registro) -> UsuarioOut:
    claims = registro.custom_claims or {}
    role = claims.get("role") if claims.get("role") in {"super", "campus"} else None
    metadados = registro.user_metadata
    return UsuarioOut(
        uid=registro.uid,
        email=registro.email,
        role=role,
        campusId=claims.get("campusId") if role == "campus" else None,
        desativado=bool(registro.disabled),
        criadoEm=getattr(metadados, "creation_timestamp", None),
        ultimoAcesso=getattr(metadados, "last_sign_in_timestamp", None),
    )


def _exige_campus(db: Session, campus_id: int | None) -> None:
    if campus_id is not None and db.get(Campus, campus_id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Campus não encontrado.")


@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(_user: UserClaims = Depends(require_super)):
    usuarios = [_para_saida(r) for r in _firebase().list_users().iterate_all()]
    return sorted(usuarios, key=lambda u: (u.email or "").lower())


@router.post("/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    _user: UserClaims = Depends(require_super),
):
    _exige_campus(db, payload.campus_id)
    fb = _firebase()
    try:
        registro = fb.create_user(email=payload.email, password=payload.senha)
    except EmailAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Já existe uma conta com este e-mail."
        ) from exc

    try:
        fb.set_custom_user_claims(registro.uid, _claims(payload.role, payload.campus_id))
    except Exception:
        # Sem o papel a conta entraria e veria "acesso não liberado"; melhor não deixá-la pela metade.
        fb.delete_user(registro.uid)
        raise
    return _para_saida(fb.get_user(registro.uid))


@router.patch("/usuarios/{uid}", response_model=UsuarioOut)
def atualizar_usuario(
    uid: str,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(require_super),
):
    # Evita que a administração central se tranque para fora do sistema.
    if uid == user.uid and (payload.desativado or (payload.role and payload.role != "super")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar nem rebaixar a própria conta.",
        )
    _exige_campus(db, payload.campus_id)
    fb = _firebase()
    try:
        fb.get_user(uid)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.") from exc

    if payload.role is not None:
        fb.set_custom_user_claims(uid, _claims(payload.role, payload.campus_id))
    if payload.desativado is not None:
        fb.update_user(uid, disabled=payload.desativado)
    if payload.role is not None or payload.desativado:
        # Tokens já emitidos carregam o papel antigo; revogar obriga a entrar de novo.
        fb.revoke_refresh_tokens(uid)
        esquecer_usuario(uid)
    return _para_saida(fb.get_user(uid))
