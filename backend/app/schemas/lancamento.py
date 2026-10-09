from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import LancamentoOrigem, LancamentoTipo


class LancamentoCreate(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    tipo: LancamentoTipo
    # Consumo físico: m³ para água, kWh para luz.
    consumo: Decimal
    valor_rs: Decimal | None = Field(None, alias="valorRs")
    mes_referencia: str = Field(..., alias="mesReferencia", pattern=r"^\d{4}-\d{2}$")

    model_config = ConfigDict(populate_by_name=True)


class LancamentoUpdate(BaseModel):
    campus_id: int | None = Field(None, alias="campusId")
    tipo: LancamentoTipo | None = None
    consumo: Decimal | None = None
    valor_rs: Decimal | None = Field(None, alias="valorRs")
    mes_referencia: str | None = Field(None, alias="mesReferencia", pattern=r"^\d{4}-\d{2}$")

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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
