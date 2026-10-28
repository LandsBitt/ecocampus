from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.carbono import FatorAplicado

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
    # O consumo do período inclui lançamento de demonstração (SPEC R.0).
    demonstracao: bool = False

    # Consumo físico do período: água em m³, energia em kWh.
    total_agua: float = Field(0.0, alias="totalAgua")
    total_luz: float = Field(0.0, alias="totalLuz")

    # Indicadores individuais: aparecem sempre que há o dado, mesmo sem nota.
    consumo_agua_per_capita: float | None = Field(default=None, alias="consumoAguaPerCapita")
    consumo_luz_por_m2: float | None = Field(default=None, alias="consumoLuzPorM2")
    # kWh por pessoa (GreenMetric EC4). Informativo: não entra na nota.
    consumo_luz_per_capita: float | None = Field(default=None, alias="consumoLuzPerCapita")
    # Pegada de carbono da energia (R.2): kWh × fator do ano. Nula sem energia ou sem fator.
    emissao_kg_co2: float | None = Field(default=None, alias="emissaoKgCo2")

    # Referência da universidade usada na nota (igual em todas as linhas).
    referencia_agua_per_capita: float | None = Field(default=None, alias="referenciaAguaPerCapita")
    referencia_luz_por_m2: float | None = Field(default=None, alias="referenciaLuzPorM2")

    # Nulos quando o campus não tem nota (situacao != "ok").
    eco_score: float | None = Field(default=None, alias="ecoScore")
    eco_score_agua: float | None = Field(default=None, alias="ecoScoreAgua")
    eco_score_luz: float | None = Field(default=None, alias="ecoScoreLuz")
    classificacao: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class IndicadorUniversidade(BaseModel):
    """Indicadores da universidade inteira no período (GreenMetric EC4)."""

    # kWh total ÷ população total, só sobre os campi que têm energia E população
    # no período: numerador e denominador vêm do mesmo conjunto de campi.
    kwh_por_pessoa: float | None = Field(default=None, alias="kwhPorPessoa")
    kwh: float = 0.0
    populacao: int = 0
    campi_considerados: list[str] = Field(default_factory=list, alias="campiConsiderados")
    # Têm consumo de energia no período mas não têm população: o kWh deles fica fora da conta.
    campi_sem_populacao: list[str] = Field(default_factory=list, alias="campiSemPopulacao")
    demonstracao: bool = False
    # Pegada de carbono da energia de TODOS os campi (não só os com população) e o fator usado.
    emissao_kg_co2: float | None = Field(default=None, alias="emissaoKgCo2")
    fator_emissao: FatorAplicado | None = Field(default=None, alias="fatorEmissao")

    model_config = ConfigDict(populate_by_name=True)


class IndicadoresOut(BaseModel):
    campi: list[IndicadorCampus]

    model_config = ConfigDict(populate_by_name=True)


class PizzaItem(BaseModel):
    """Participação de um campus no consumo do mês, uma medida por campo."""

    campus_id: int = Field(..., alias="campusId")
    nome: str
    # Água em m³ e energia em kWh. Cada pizza usa uma medida só.
    agua: float
    luz: float

    model_config = ConfigDict(populate_by_name=True)


class PizzaOut(BaseModel):
    campi: list[PizzaItem]

    model_config = ConfigDict(populate_by_name=True)
