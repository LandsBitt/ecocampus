from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PontoMedicaoOut(BaseModel):
    id: int
    nome: str
    endereco: str | None = None
    tipo: str
    identificador: str | None = None
    codigo_instalacao: int | None = Field(default=None, alias="codigoInstalacao")
    ativo: bool = True

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CampusOut(BaseModel):
    id: int
    nome: str
    populacao: int = 0
    area_construida_m2: int = Field(0, alias="areaConstruidaM2")
    demografia_fonte: str | None = Field(None, alias="demografiaFonte")
    demografia_referencia: str | None = Field(None, alias="demografiaReferencia")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CampusComUnidades(BaseModel):
    id: int
    nome: str
    populacao: int = 0
    area_construida_m2: int = Field(0, alias="areaConstruidaM2")
    pontos_medicao: list[PontoMedicaoOut] = Field(default_factory=list, alias="pontosMedicao")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CampusUpdate(BaseModel):
    populacao: int | None = Field(default=None, ge=0)
    area_construida_m2: int | None = Field(default=None, alias="areaConstruidaM2", ge=0)
    demografia_fonte: str | None = Field(default=None, alias="demografiaFonte", max_length=200)
    demografia_referencia: str | None = Field(default=None, alias="demografiaReferencia", max_length=20)

    model_config = ConfigDict(populate_by_name=True)
