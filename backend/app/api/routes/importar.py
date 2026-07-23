from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.security import require_super
from app.db.models import Lancamento, PontoMedicao
from app.db.session import get_db
from app.schemas.importar import (
    ConfirmarOut,
    ConfirmarPayload,
    LinhaIgnorada,
    PontoPreview,
    PreviewOut,
)

router = APIRouter()


def _parse_float(value: str) -> float | None:
    if not value or not value.strip():
        return None
    try:
        return float(value.strip().replace(",", "."))
    except ValueError:
        return None


def _sniff_delimiter(raw: str) -> str:
    # As planilhas padrão da UNITAU usam ";" (separador brasileiro do Excel),
    # mas aceitamos "," para não quebrar exports em formato internacional.
    header = raw.splitlines()[0] if raw else ""
    return ";" if header.count(";") >= header.count(",") else ","


def _find_ponto(db: Session, tipo: str, ident: str | None, inst: int | None) -> PontoMedicao | None:
    if ident:
        ponto = db.scalars(
            select(PontoMedicao).where(
                PontoMedicao.tipo == tipo,
                PontoMedicao.identificador == ident,
            )
        ).first()
        if ponto:
            return ponto
    if tipo == "luz" and inst is not None:
        return db.scalars(
            select(PontoMedicao).where(
                PontoMedicao.tipo == "luz",
                PontoMedicao.codigo_instalacao == inst,
            )
        ).first()
    return None


@router.post("/importar/preview", response_model=PreviewOut)
def preview_csv(
    file: UploadFile = File(...),
    tipo: str = Form(...),
    mes_referencia: str = Form(...),
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    raw = file.file.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw), delimiter=_sniff_delimiter(raw))

    matched: list[PontoPreview] = []
    unmatched: list[LinhaIgnorada] = []

    for row in reader:
        if tipo == "agua":
            ident = str(row.get("PDE/RGI") or "").strip() or None
            local = str(row.get("LOCAL") or "").strip()
            consumo = _parse_float(str(row.get("consumo_m3") or ""))
            valor = _parse_float(str(row.get("valor_fatura") or ""))
            inst = None
        else:
            ident = str(row.get("numero_uc") or "").strip() or None
            local = str(row.get("local") or "").strip()
            consumo = _parse_float(str(row.get("consumo_kwh") or ""))
            valor = _parse_float(str(row.get("valor_fatura_rs") or ""))
            inst_str = str(row.get("numero_instalacao") or "").strip()
            try:
                inst = int(inst_str) if inst_str else None
            except ValueError:
                inst = None

        if consumo is None and valor is None:
            continue

        ponto = _find_ponto(db, tipo, ident, inst)

        if ponto and valor is not None:
            matched.append(
                PontoPreview(
                    ponto_medicao_id=ponto.id,
                    nome=ponto.nome,
                    campus_id=ponto.campus_id,
                    campus_nome=ponto.campus.nome,
                    identificador=ident,
                    consumo_fisico=consumo,
                    valor_fatura=valor,
                )
            )
        else:
            unmatched.append(
                LinhaIgnorada(
                    local=local,
                    identificador=ident,
                    consumo_fisico=consumo,
                    valor_fatura=valor,
                    motivo="Ponto de medição não encontrado" if ponto is None else "Valor da fatura ausente",
                )
            )

    total_valor = sum(m.valor_fatura for m in matched)
    return PreviewOut(
        mes_referencia=mes_referencia,
        tipo=tipo,
        matched=matched,
        unmatched=unmatched,
        total_valor=total_valor,
    )


@router.post("/importar/confirmar", response_model=ConfirmarOut)
def confirmar_importacao(
    payload: ConfirmarPayload,
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    inserted = 0
    updated = 0

    for item in payload.lancamentos:
        ponto = db.get(PontoMedicao, item.ponto_medicao_id)
        if ponto is None:
            continue

        # Upsert atômico protegido pelo índice único uq_lancamentos_ponto_mes:
        # importar o mesmo mês duas vezes (ou duplo clique) atualiza em vez de duplicar.
        stmt = (
            pg_insert(Lancamento)
            .values(
                campus_id=ponto.campus_id,
                tipo=ponto.tipo,
                valor_numeric=item.valor_fatura,
                mes_referencia=payload.mes_referencia,
                ponto_medicao_id=item.ponto_medicao_id,
                consumo_fisico=item.consumo_fisico,
            )
            .on_conflict_do_update(
                index_elements=[Lancamento.ponto_medicao_id, Lancamento.mes_referencia],
                index_where=Lancamento.ponto_medicao_id.isnot(None),
                set_={
                    "valor_numeric": item.valor_fatura,
                    "consumo_fisico": item.consumo_fisico,
                },
            )
            # xmax = 0 indica linha recém-inserida (PostgreSQL); senão foi update.
            .returning(text("xmax = 0"))
        )
        if db.execute(stmt).scalar_one():
            inserted += 1
        else:
            updated += 1

    db.commit()
    return ConfirmarOut(imported=inserted, updated=updated)
