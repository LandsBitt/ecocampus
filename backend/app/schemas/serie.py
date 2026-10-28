from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PontoSerie(BaseModel):
    """Um mês da série histórica (SPEC R.5). Água em m³, energia em kWh, nunca somadas."""

    mes: str
    agua: float
    luz: float
    # Distingue "consumiu zero" de "não tem lançamento" em cada medida.
    tem_agua: bool = Field(..., alias="temAgua")
    tem_luz: bool = Field(..., alias="temLuz")
    demonstracao: bool = False

    model_config = ConfigDict(populate_by_name=True)


class ComparacaoMedida(BaseModel):
    """Uma medida no mês e nas duas bases de comparação (SPEC R.3).

    Valores nulos = mês sem lançamento daquela medida ("sem base"); variação nula
    quando falta o atual ou a base, ou quando a base é zero.
    """

    atual: float | None = None
    mes_anterior: float | None = Field(None, alias="mesAnterior")
    ano_anterior: float | None = Field(None, alias="anoAnterior")
    variacao_mensal: float | None = Field(None, alias="variacaoMensal")
    variacao_anual: float | None = Field(None, alias="variacaoAnual")
    # Algum dos três meses comparados tem lançamento de demonstração (R.0).
    demonstracao: bool = False

    model_config = ConfigDict(populate_by_name=True)


class ComparacaoBloco(BaseModel):
    campus_id: int | None = Field(None, alias="campusId")
    nome: str
    agua: ComparacaoMedida
    luz: ComparacaoMedida

    model_config = ConfigDict(populate_by_name=True)


class ComparacaoOut(BaseModel):
    mes: str
    mes_anterior: str = Field(..., alias="mesAnterior")
    ano_anterior: str = Field(..., alias="anoAnterior")
    # Universidade para o super; o próprio campus para o papel campus.
    escopo: ComparacaoBloco
    # Um bloco por campus; vazio para o papel campus.
    campi: list[ComparacaoBloco] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class AlertaPico(BaseModel):
    """Um campus e uma medida avaliados contra o próprio histórico (SPEC R.4)."""

    campus_id: int = Field(..., alias="campusId")
    nome: str
    medida: str  # "agua" | "luz"
    # pico: acima do limiar; normal: avaliado e dentro; historico_insuficiente: menos meses que o mínimo
    situacao: str
    atual: float
    # Média dos meses com dado na janela; nula quando o histórico é insuficiente.
    media: float | None = None
    meses_na_media: int = Field(0, alias="mesesNaMedia")
    # atual ÷ média (1,45 = 45% acima). Nula sem média ou com média zero.
    razao: float | None = None
    demonstracao: bool = False

    model_config = ConfigDict(populate_by_name=True)


class AlertasOut(BaseModel):
    mes: str
    limiar: float
    janela_meses: int = Field(..., alias="janelaMeses")
    historico_minimo: int = Field(..., alias="historicoMinimo")
    # Todos os campus × medida com consumo no mês, picos primeiro.
    avaliados: list[AlertaPico]

    model_config = ConfigDict(populate_by_name=True)
