from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import BigInteger, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class LancamentoTipo(str, Enum):
    agua = "agua"
    luz = "luz"


class Campus(Base):
    __tablename__ = "campus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    populacao: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    area_construida_m2: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)

    lancamentos: Mapped[list["Lancamento"]] = relationship(back_populates="campus")
    pontos_medicao: Mapped[list["PontoMedicao"]] = relationship(back_populates="campus")


class PontoMedicao(Base):
    __tablename__ = "pontos_medicao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campus.id"), index=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    endereco: Mapped[str | None] = mapped_column(String(300), nullable=True)
    tipo: Mapped[LancamentoTipo] = mapped_column(SQLEnum(LancamentoTipo, name="lancamento_tipo"), nullable=False)
    identificador: Mapped[str | None] = mapped_column(String(60), nullable=True)
    codigo_instalacao: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    area_m2: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    populacao: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true", default=True)

    campus: Mapped[Campus] = relationship(back_populates="pontos_medicao")
    lancamentos: Mapped[list["Lancamento"]] = relationship(back_populates="ponto_medicao")


class Lancamento(Base):
    __tablename__ = "lancamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campus.id"), index=True, nullable=False)
    tipo: Mapped[LancamentoTipo] = mapped_column(SQLEnum(LancamentoTipo, name="lancamento_tipo"), nullable=False)
    valor_numeric: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    mes_referencia: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ponto_medicao_id: Mapped[int | None] = mapped_column(ForeignKey("pontos_medicao.id"), index=True, nullable=True)
    consumo_fisico: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)

    campus: Mapped[Campus] = relationship(back_populates="lancamentos")
    ponto_medicao: Mapped[PontoMedicao | None] = relationship(back_populates="lancamentos")

    @property
    def valor(self) -> Decimal:
        return self.valor_numeric
