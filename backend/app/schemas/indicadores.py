from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class IndicadorCampus(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str

    populacao: int = 0
    area_construida_m2: int = Field(0, alias="areaConstruidaM2")

    total: float
    total_agua: float = Field(0.0, alias="totalAgua")
    total_luz: float = Field(0.0, alias="totalLuz")

    consumo_agua_per_capita: float | None = Field(default=None, alias="consumoAguaPerCapita")
    consumo_luz_por_m2: float | None = Field(default=None, alias="consumoLuzPorM2")

    eco_score: float = Field(..., alias="ecoScore")
    eco_score_agua: float | None = Field(default=None, alias="ecoScoreAgua")
    eco_score_luz: float | None = Field(default=None, alias="ecoScoreLuz")

    normalizado: bool = False

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
