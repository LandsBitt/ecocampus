from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.models import Campus, Lancamento, LancamentoOrigem, LancamentoTipo
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.resumo import ResumoCampus, ResumoResponse

router = APIRouter()

# Todo número exibido é consumo físico (`consumo`). A carga antiga do script
# CPFL fica de fora; importados sem consumo somem sozinhos da soma (NULL).
_CONTA_NOS_INDICADORES = Lancamento.origem != LancamentoOrigem.cpfl_legado.value


def _campus_totals(db: Session, mes: str | None = None, campus_id: int | None = None):
    join_condition = and_(Lancamento.campus_id == Campus.id, _CONTA_NOS_INDICADORES)
    if mes:
        join_condition = and_(join_condition, Lancamento.mes_referencia == mes)

    stmt = (
        select(
            Campus.id,
            Campus.nome,
            Campus.populacao,
            Campus.area_construida_m2,
            func.coalesce(
                func.sum(case((Lancamento.tipo == LancamentoTipo.agua, Lancamento.consumo), else_=0)),
                0,
            ).label("agua"),
            func.coalesce(
                func.sum(case((Lancamento.tipo == LancamentoTipo.luz, Lancamento.consumo), else_=0)),
                0,
            ).label("luz"),
            func.coalesce(func.sum(Lancamento.consumo), 0).label("total"),
        )
        .select_from(Campus)
        .outerjoin(Lancamento, join_condition)
        .group_by(Campus.id)
        .order_by(Campus.id)
    )
    if campus_id:
        stmt = stmt.where(Campus.id == campus_id)

    return db.execute(stmt).all()


def _total_geral(db: Session, mes: str | None = None):
    stmt = select(
        func.coalesce(
            func.sum(case((Lancamento.tipo == LancamentoTipo.agua, Lancamento.consumo), else_=0)),
            0,
        ).label("agua"),
        func.coalesce(
            func.sum(case((Lancamento.tipo == LancamentoTipo.luz, Lancamento.consumo), else_=0)),
            0,
        ).label("luz"),
        func.coalesce(func.sum(Lancamento.consumo), 0).label("total"),
    ).where(_CONTA_NOS_INDICADORES)
    if mes:
        stmt = stmt.where(Lancamento.mes_referencia == mes)
    return db.execute(stmt).one()


def _pontos_sem_consumo(db: Session, mes: str | None = None, campus_id: int | None = None) -> int:
    stmt = select(func.count()).where(
        Lancamento.origem == LancamentoOrigem.importado.value,
        Lancamento.consumo.is_(None),
    )
    if mes:
        stmt = stmt.where(Lancamento.mes_referencia == mes)
    if campus_id:
        stmt = stmt.where(Lancamento.campus_id == campus_id)
    return db.execute(stmt).scalar_one()


@router.get("/resumo", response_model=ResumoResponse)
def resumo(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    total_geral = _total_geral(db, mes)
    total_geral_out = ResumoCampus(
        campusId=0,
        nome="Universidade",
        agua=float(total_geral.agua or 0),
        luz=float(total_geral.luz or 0),
        total=float(total_geral.total or 0),
    )

    if user.role == "campus":
        rows = _campus_totals(db, mes=mes, campus_id=user.campusId)
        if rows:
            row = rows[0]
            campus_out = ResumoCampus(
                campusId=row.id,
                nome=row.nome,
                agua=float(row.agua or 0),
                luz=float(row.luz or 0),
                total=float(row.total or 0),
            )
        else:
            campus_out = ResumoCampus(
                campusId=user.campusId,
                nome=None,
                agua=0.0,
                luz=0.0,
                total=0.0,
            )
        return ResumoResponse(
            mes=mes,
            campus=campus_out,
            totalGeral=total_geral_out,
            pontosSemConsumo=_pontos_sem_consumo(db, mes, user.campusId),
        )

    rows = _campus_totals(db, mes=mes)
    campi = [
        ResumoCampus(
            campusId=row.id,
            nome=row.nome,
            agua=float(row.agua or 0),
            luz=float(row.luz or 0),
            total=float(row.total or 0),
        )
        for row in rows
    ]
    return ResumoResponse(
        mes=mes,
        campi=campi,
        totalGeral=total_geral_out,
        pontosSemConsumo=_pontos_sem_consumo(db, mes),
    )
