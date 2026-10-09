from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ok            tem cadastro e consumo no período: recebe nota e entra no ranking
# sem_dados     tem cadastro, mas nenhum lançamento no período
# sem_cadastro  falta população ou área construída
# em_revisao    fora do ranking por decisão registrada no campus (ver motivo)
Situacao = Literal["ok", "sem_dados", "sem_cadastro", "em_revisao"]


class IndicadorCampus(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str

    populacao: int = 0
    area_construida_m2: int = Field(0, alias="areaConstruidaM2")

    situacao: Situacao
    motivo_fora_do_ranking: str | None = Field(default=None, alias="motivoForaDoRanking")
    tem_dados: bool = Field(False, alias="temDados")

    total: float
    # Consumo físico do período: água em m³, energia em kWh.
    total_agua: float = Field(0.0, alias="totalAgua")
    total_luz: float = Field(0.0, alias="totalLuz")

    # Indicadores individuais: aparecem sempre que há o dado, mesmo sem nota.
    consumo_agua_per_capita: float | None = Field(default=None, alias="consumoAguaPerCapita")
    consumo_luz_por_m2: float | None = Field(default=None, alias="consumoLuzPorM2")
    # kWh por pessoa (GreenMetric EC4). Informativo: não entra na nota.
    consumo_luz_per_capita: float | None = Field(default=None, alias="consumoLuzPerCapita")

    # Referência da universidade usada na nota (igual em todas as linhas).
    referencia_agua_per_capita: float | None = Field(default=None, alias="referenciaAguaPerCapita")
    referencia_luz_por_m2: float | None = Field(default=None, alias="referenciaLuzPorM2")

    # Nulos quando o campus não tem nota (situacao != "ok").
    eco_score: float | None = Field(default=None, alias="ecoScore")
    eco_score_agua: float | None = Field(default=None, alias="ecoScoreAgua")
    eco_score_luz: float | None = Field(default=None, alias="ecoScoreLuz")
    classificacao: str | None = None

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
