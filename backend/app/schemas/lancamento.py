from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.core.limites import CONSUMO_MAXIMO, MES_PATTERN, VALOR_RS_MAXIMO
from app.db.models import LancamentoOrigem, LancamentoTipo


class LancamentoCreate(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    tipo: LancamentoTipo
    # Consumo físico: m³ para água, kWh para luz.
    consumo: Decimal = Field(..., ge=0, le=CONSUMO_MAXIMO)
    valor_rs: Decimal | None = Field(None, alias="valorRs", ge=0, le=VALOR_RS_MAXIMO)
    mes_referencia: str = Field(..., alias="mesReferencia", pattern=MES_PATTERN)

    model_config = ConfigDict(populate_by_name=True)


class LancamentoUpdate(BaseModel):
    campus_id: int | None = Field(None, alias="campusId")
    tipo: LancamentoTipo | None = None
    consumo: Decimal | None = Field(None, ge=0, le=CONSUMO_MAXIMO)
    valor_rs: Decimal | None = Field(None, alias="valorRs", ge=0, le=VALOR_RS_MAXIMO)
    mes_referencia: str | None = Field(None, alias="mesReferencia", pattern=MES_PATTERN)

    model_config = ConfigDict(populate_by_name=True)


class LancamentoOut(BaseModel):
    id: int
    campus_id: int = Field(..., alias="campusId")
    tipo: LancamentoTipo
    consumo: float | None = None
    valor_rs: float | None = Field(None, alias="valorRs")
    origem: LancamentoOrigem
    ponto_medicao_id: int | None = Field(None, alias="pontoMedicaoId")
    mes_referencia: str = Field(..., alias="mesReferencia")
    created_at: datetime = Field(..., alias="createdAt")
    # E-mail (ou uid) de quem criou; nulo em registro anterior à trilha de auditoria.
    criado_por: str | None = Field(None, alias="criadoPor")
    atualizado_em: datetime = Field(..., alias="atualizadoEm")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
