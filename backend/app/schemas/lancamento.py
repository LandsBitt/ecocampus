from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import LancamentoTipo


class LancamentoBase(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    tipo: LancamentoTipo
    valor: Decimal
    mes_referencia: str = Field(..., alias="mesReferencia", pattern=r"^\d{4}-\d{2}$")

    model_config = ConfigDict(populate_by_name=True)


class LancamentoCreate(LancamentoBase):
    pass


class LancamentoUpdate(BaseModel):
    campus_id: int | None = Field(None, alias="campusId")
    tipo: LancamentoTipo | None = None
    valor: Decimal | None = None
    mes_referencia: str | None = Field(None, alias="mesReferencia", pattern=r"^\d{4}-\d{2}$")

    model_config = ConfigDict(populate_by_name=True)


class LancamentoOut(LancamentoBase):
    id: int
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
