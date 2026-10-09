from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class LancamentoImportItem(BaseModel):
    ponto_medicao_id: int = Field(..., alias="pontoMedicaoId")
    # O consumo físico é obrigatório; o valor da fatura é complementar.
    consumo_fisico: float = Field(..., alias="consumoFisico")
    valor_fatura: float | None = Field(default=None, alias="valorFatura")

    model_config = ConfigDict(populate_by_name=True)


class ConfirmarPayload(BaseModel):
    mes_referencia: str = Field(..., alias="mesReferencia", pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    lancamentos: list[LancamentoImportItem]

    model_config = ConfigDict(populate_by_name=True)


class PontoPreview(BaseModel):
    ponto_medicao_id: int = Field(..., alias="pontoMedicaoId")
    nome: str
    campus_id: int = Field(..., alias="campusId")
    campus_nome: str = Field(..., alias="campusNome")
    identificador: str | None
    consumo_fisico: float = Field(..., alias="consumoFisico")
    valor_fatura: float | None = Field(default=None, alias="valorFatura")

    model_config = ConfigDict(populate_by_name=True)


class LinhaIgnorada(BaseModel):
    local: str
    identificador: str | None
    consumo_fisico: float | None = Field(default=None, alias="consumoFisico")
    valor_fatura: float | None = Field(default=None, alias="valorFatura")
    motivo: str

    model_config = ConfigDict(populate_by_name=True)


class PreviewOut(BaseModel):
    mes_referencia: str = Field(..., alias="mesReferencia")
    tipo: str
    matched: list[PontoPreview]
    unmatched: list[LinhaIgnorada]
    total_valor: float = Field(..., alias="totalValor")

    model_config = ConfigDict(populate_by_name=True)


class ConfirmarOut(BaseModel):
    imported: int
    updated: int
