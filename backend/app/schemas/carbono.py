from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class FatorAplicado(BaseModel):
    """O fator usado num cálculo, com tudo que a tela precisa mostrar ao lado do número."""

    ano_referencia: int = Field(..., alias="anoReferencia")
    # Pode ser anterior ao ano de referência, quando este ainda não tem fator.
    ano_do_fator: int = Field(..., alias="anoDoFator")
    # tCO₂/MWh = kgCO₂/kWh
    fator: float
    provisorio: bool
    fonte: str

    model_config = ConfigDict(populate_by_name=True)


class FatorEmissaoOut(BaseModel):
    ano: int
    fator: float
    provisorio: bool
    fonte: str

    model_config = ConfigDict(from_attributes=True)


class FatorEmissaoIn(BaseModel):
    fator: float = Field(gt=0, lt=2, description="tCO₂/MWh")
    provisorio: bool = False
    fonte: str = Field(min_length=3, max_length=500)
