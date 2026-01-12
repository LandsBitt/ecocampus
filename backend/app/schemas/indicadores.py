from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class IndicadorCampus(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str
    total: float
    eco_score: float = Field(..., alias="ecoScore")
    classificacao: str

    model_config = ConfigDict(populate_by_name=True)


class IndicadoresOut(BaseModel):
    campi: list[IndicadorCampus]

    model_config = ConfigDict(populate_by_name=True)


class PizzaItem(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str
    total: float

    model_config = ConfigDict(populate_by_name=True)


class PizzaOut(BaseModel):
    campi: list[PizzaItem]

    model_config = ConfigDict(populate_by_name=True)