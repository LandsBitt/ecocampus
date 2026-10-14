from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.core.limites import CONSUMO_MAXIMO, MES_PATTERN, VALOR_RS_MAXIMO


class LancamentoImportItem(BaseModel):
    ponto_medicao_id: int = Field(..., alias="pontoMedicaoId")
    # O consumo físico é obrigatório; o valor da fatura é complementar.
    consumo_fisico: float = Field(..., alias="consumoFisico", ge=0, le=CONSUMO_MAXIMO)
    valor_fatura: float | None = Field(default=None, alias="valorFatura", ge=0, le=VALOR_RS_MAXIMO)

    model_config = ConfigDict(populate_by_name=True)


class ConfirmarPayload(BaseModel):
    mes_referencia: str = Field(..., alias="mesReferencia", pattern=MES_PATTERN)
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
    # Número da linha no arquivo (o cabeçalho é a linha 1).
    linha: int | None = None
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
    # Lançamentos manuais do mesmo campus/tipo/mês, que a confirmação vai remover.
    manuais_substituidos: int = Field(0, alias="manuaisSubstituidos")

    model_config = ConfigDict(populate_by_name=True)


class ConfirmarOut(BaseModel):
    imported: int
    updated: int
    # Itens cujo ponto de medição não existe mais.
    ignored: int = 0
    manuais_removidos: int = Field(0, alias="manuaisRemovidos")

    model_config = ConfigDict(populate_by_name=True)
