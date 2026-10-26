from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ResumoCampus(BaseModel):
    campus_id: int = Field(..., alias="campusId")
    nome: str | None = None
    # Consumo físico: água em m³, luz em kWh.
    agua: float
    luz: float
    # A soma inclui lançamento de demonstração (SPEC R.0): o número não é medição real.
    demonstracao: bool = False

    model_config = ConfigDict(populate_by_name=True)


class ResumoResponse(BaseModel):
    mes: str | None = None
    campus: ResumoCampus | None = None
    campi: list[ResumoCampus] | None = None
    total_geral: ResumoCampus = Field(..., alias="totalGeral")
    # Lançamentos importados sem consumo físico no período: têm fatura em R$,
    # mas não entram nos números acima.
    pontos_sem_consumo: int = Field(0, alias="pontosSemConsumo")

    model_config = ConfigDict(populate_by_name=True)


class ResumoOut(ResumoResponse):
    pass
