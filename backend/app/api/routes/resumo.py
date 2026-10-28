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
# Água (m³) e energia (kWh) nunca são somadas entre si (SPEC 1.7).
_CONTA_NOS_INDICADORES = Lancamento.origem != LancamentoOrigem.cpfl_legado.value

# Quantos lançamentos de demonstração entram na soma (R.0): o total que os contém
# é marcado para nunca passar por medição real.
_N_DEMONSTRACAO = func.count(
    case((Lancamento.origem == LancamentoOrigem.demonstracao.value, Lancamento.id))
).label("n_demonstracao")


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
            Campus.fora_do_ranking_motivo,
            # Quantos lançamentos com consumo existem: distingue "consumiu zero" de "não tem dado".
            func.count(case((Lancamento.tipo == LancamentoTipo.agua, Lancamento.consumo))).label("n_agua"),
            func.count(case((Lancamento.tipo == LancamentoTipo.luz, Lancamento.consumo))).label("n_luz"),
            func.coalesce(
                func.sum(case((Lancamento.tipo == LancamentoTipo.agua, Lancamento.consumo), else_=0)),
                0,
            ).label("agua"),
            func.coalesce(
                func.sum(case((Lancamento.tipo == LancamentoTipo.luz, Lancamento.consumo), else_=0)),
                0,
            ).label("luz"),
            _N_DEMONSTRACAO,
        )
        .select_from(Campus)
        .outerjoin(Lancamento, join_condition)
        .group_by(Campus.id)
        .order_by(Campus.id)
    )
    if campus_id:
        stmt = stmt.where(Campus.id == campus_id)

    return db.execute(stmt).all()


def _resumo_do_campus(row) -> ResumoCampus:
    return ResumoCampus(
        campusId=row.id,
        nome=row.nome,
        agua=float(row.agua or 0),
        luz=float(row.luz or 0),
        demonstracao=row.n_demonstracao > 0,
    )


def _resumo_da_universidade(rows) -> ResumoCampus:
    # Todo lançamento tem campus, então a soma das linhas é o total da universidade.
    return ResumoCampus(
        campusId=0,
        nome="Universidade",
        agua=float(sum(row.agua or 0 for row in rows)),
        luz=float(sum(row.luz or 0 for row in rows)),
        demonstracao=any(row.n_demonstracao > 0 for row in rows),
    )


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
    rows = _campus_totals(db, mes=mes)
    total_geral = _resumo_da_universidade(rows)

    if user.role == "campus":
        proprio = next((row for row in rows if row.id == user.campusId), None)
        campus_out = (
            _resumo_do_campus(proprio)
            if proprio
            else ResumoCampus(campusId=user.campusId, nome=None, agua=0.0, luz=0.0)
        )
        return ResumoResponse(
            mes=mes,
            campus=campus_out,
            totalGeral=total_geral,
            pontosSemConsumo=_pontos_sem_consumo(db, mes, user.campusId),
        )

    return ResumoResponse(
        mes=mes,
        campi=[_resumo_do_campus(row) for row in rows],
        totalGeral=total_geral,
        pontosSemConsumo=_pontos_sem_consumo(db, mes),
    )
