from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, func
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


class Lancamento(Base):
    __tablename__ = "lancamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campus.id"), index=True, nullable=False)
    tipo: Mapped[LancamentoTipo] = mapped_column(SQLEnum(LancamentoTipo, name="lancamento_tipo"), nullable=False)
    valor_numeric: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    mes_referencia: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    campus: Mapped[Campus] = relationship(back_populates="lancamentos")

    @property
    def valor(self) -> Decimal:
        return self.valor_numeric
