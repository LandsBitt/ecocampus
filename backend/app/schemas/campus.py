from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CampusOut(BaseModel):
    id: int
    nome: str
    populacao: int = 0
    area_construida_m2: int = Field(0, alias="areaConstruidaM2")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CampusUpdate(BaseModel):
    populacao: int | None = Field(default=None, ge=0)
    area_construida_m2: int | None = Field(default=None, alias="areaConstruidaM2", ge=0)

    model_config = ConfigDict(populate_by_name=True)
