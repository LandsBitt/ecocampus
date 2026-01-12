from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ResumoCampus(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str | None = None
    agua: float
    luz: float
    total: float

    model_config = ConfigDict(populate_by_name=True)


class ResumoResponse(BaseModel):
    mes: str | None = None
    campus: ResumoCampus | None = None
    campi: list[ResumoCampus] | None = None
    total_geral: ResumoCampus = Field(..., alias="totalGeral")

    model_config = ConfigDict(populate_by_name=True)


class ResumoOut(ResumoResponse):
    pass