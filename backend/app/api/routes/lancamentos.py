from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.errors import UniqueViolation
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import autor, get_current_user
from app.db.models import Campus, Lancamento, LancamentoOrigem, LancamentoTipo
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.lancamento import LancamentoCreate, LancamentoOut, LancamentoUpdate

router = APIRouter()

ALLOWED_TIPOS = {LancamentoTipo.agua, LancamentoTipo.luz}
NOME_TIPO = {LancamentoTipo.agua: "água", LancamentoTipo.luz: "energia"}


def _validate_campus_id(db: Session, value: int | None) -> None:
    if value is None or db.get(Campus, value) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="campusId inexistente",
        )


def _to_lancamento_out(item: Lancamento) -> LancamentoOut:
    return LancamentoOut.model_validate(item)


def _exige_permissao(user: UserClaims, item: Lancamento) -> None:
    """D5: o admin de campus altera só lançamentos manuais do próprio campus; o super, tudo."""
    if user.role == "super":
        return
    if item.origem != LancamentoOrigem.manual.value or item.campus_id != user.campusId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode alterar lançamentos manuais do seu campus. Importados e de outros campi ficam com a reitoria.",
        )


def _exige_mes_livre(
    db: Session,
    origem: str,
    campus_id: int,
    tipo: LancamentoTipo,
    mes: str,
    ignorar_id: int | None = None,
) -> None:
    """D4: um manual por campus/tipo/mês, e manual nunca soma com importado.

    O índice único parcial garante o primeiro caso no banco; a consulta aqui só
    existe para devolver uma mensagem que diga o que fazer.
    """
    if origem == LancamentoOrigem.cpfl_legado.value:
        return  # fora de todos os indicadores: não soma com nada
    stmt = select(Lancamento.origem).where(
        Lancamento.campus_id == campus_id,
        Lancamento.tipo == tipo,
        Lancamento.mes_referencia == mes,
        Lancamento.origem.in_([LancamentoOrigem.manual.value, LancamentoOrigem.importado.value]),
    )
    if ignorar_id is not None:
        stmt = stmt.where(Lancamento.id != ignorar_id)
    existentes = set(db.scalars(stmt).all())

    nome, periodo = NOME_TIPO[tipo], f"{mes[5:]}/{mes[:4]}"
    if origem == LancamentoOrigem.manual.value and LancamentoOrigem.manual.value in existentes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um lançamento manual de {nome} para este campus em {periodo}. Edite o existente.",
        )
    if origem == LancamentoOrigem.manual.value and LancamentoOrigem.importado.value in existentes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"O consumo de {nome} deste campus em {periodo} já veio da importação da planilha, que prevalece.",
        )
    if origem == LancamentoOrigem.importado.value and LancamentoOrigem.manual.value in existentes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Este campus tem lançamento manual de {nome} em {periodo}; o consumo contaria em dobro.",
        )


def _commit(db: Session) -> None:
    """Grava; violação de índice único (corrida entre dois cliques, mês de ponto já importado) vira 409."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um lançamento para este campus (ou ponto de medição), tipo e mês.",
            ) from exc
        raise


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
    _exige_mes_livre(db, LancamentoOrigem.manual.value, campus_id, payload.tipo, payload.mes_referencia)

    item = Lancamento(
        campus_id=campus_id,
        tipo=payload.tipo,
        consumo=payload.consumo,
        valor_rs=payload.valor_rs,
        origem=LancamentoOrigem.manual.value,
        mes_referencia=payload.mes_referencia,
        criado_por=autor(user),
    )
    db.add(item)
    _commit(db)
    db.refresh(item)
    return _to_lancamento_out(item)


@router.put("/lancamentos/{lancamento_id}", response_model=LancamentoOut)
def update_lancamento(
    lancamento_id: int,
    payload: LancamentoUpdate,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    item = db.get(Lancamento, lancamento_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")
    _exige_permissao(user, item)

    campus_id = payload.campus_id if payload.campus_id is not None else item.campus_id
    tipo = payload.tipo if payload.tipo is not None else item.tipo
    mes = payload.mes_referencia if payload.mes_referencia is not None else item.mes_referencia

    if user.role == "campus" and campus_id != user.campusId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode lançar para o seu campus.",
        )
    # Importado pertence a um ponto de medição: trocar campus ou tipo o
    # desencontraria do ponto (achado B4). Corrige-se pela importação.
    if item.ponto_medicao_id is not None and (campus_id != item.campus_id or tipo != item.tipo):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lançamento importado segue o ponto de medição: campus e tipo não podem ser trocados.",
        )
    if tipo not in ALLOWED_TIPOS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo inválido")
    if campus_id != item.campus_id:
        _validate_campus_id(db, campus_id)
    if (campus_id, tipo, mes) != (item.campus_id, item.tipo, item.mes_referencia):
        _exige_mes_livre(db, item.origem, campus_id, tipo, mes, ignorar_id=item.id)

    item.campus_id = campus_id
    item.tipo = tipo
    item.mes_referencia = mes
    if payload.consumo is not None:
        item.consumo = payload.consumo
    # O valor em R$ é opcional: enviar `null` apaga, omitir o campo mantém.
    if "valor_rs" in payload.model_fields_set:
        item.valor_rs = payload.valor_rs

    _commit(db)
    db.refresh(item)
    return _to_lancamento_out(item)


@router.delete("/lancamentos/{lancamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lancamento(
    lancamento_id: int,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    item = db.get(Lancamento, lancamento_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")
    _exige_permissao(user, item)
    db.delete(item)
    db.commit()
    return None
