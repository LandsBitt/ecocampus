from __future__ import annotations

from pydantic import BaseModel


class LancamentoImportItem(BaseModel):
    ponto_medicao_id: int
    valor_fatura: float
    consumo_fisico: float | None = None


class ConfirmarPayload(BaseModel):
    mes_referencia: str
    lancamentos: list[LancamentoImportItem]


class PontoPreview(BaseModel):
    ponto_medicao_id: int
    nome: str
    campus_id: int
    campus_nome: str
    identificador: str | None
    consumo_fisico: float | None
    valor_fatura: float


class LinhaIgnorada(BaseModel):
    local: str
    identificador: str | None
    consumo_fisico: float | None
    valor_fatura: float | None
    motivo: str


class PreviewOut(BaseModel):
    mes_referencia: str
    tipo: str
    matched: list[PontoPreview]
    unmatched: list[LinhaIgnorada]
    total_valor: float


class ConfirmarOut(BaseModel):
    imported: int
    updated: int
