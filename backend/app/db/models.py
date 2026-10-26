from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class LancamentoTipo(str, Enum):
    agua = "agua"
    luz = "luz"


class LancamentoOrigem(str, Enum):
    manual = "manual"
    importado = "importado"
    # Carga antiga do script CPFL (total anual ÷ 12). Fica no banco, mas fora
    # de todos os indicadores, até ser excluída por scripts/excluir_cpfl_legado.py.
    cpfl_legado = "cpfl_legado"
    # Dado simulado (scripts/seed_fake_data.py). Conta nos indicadores, mas a API
    # marca os totais que o contêm; lançamento real do mesmo mês o substitui.
    demonstracao = "demonstracao"


class Campus(Base):
    __tablename__ = "campus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    populacao: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    area_construida_m2: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    # Quem forneceu população/área ("FICTÍCIO" para dados de desenvolvimento) e a que data se referem.
    demografia_fonte: Mapped[str | None] = mapped_column(String(200), nullable=True)
    demografia_referencia: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Preenchido = campus fora do ranking (sem nota e fora da referência); o texto é o motivo exibido.
    fora_do_ranking_motivo: Mapped[str | None] = mapped_column(String(200), nullable=True)

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
    # Os mesmos limites de app/core/limites.py, criados pela migration 0013.
    __table_args__ = (
        CheckConstraint("consumo IS NULL OR (consumo >= 0 AND consumo <= 10000000)", name="ck_lancamentos_consumo"),
        CheckConstraint("valor_rs IS NULL OR (valor_rs >= 0 AND valor_rs <= 10000000)", name="ck_lancamentos_valor_rs"),
        CheckConstraint("mes_referencia ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'", name="ck_lancamentos_mes"),
        # Um lançamento manual por campus, tipo e mês (D4).
        Index(
            "uq_lancamentos_manual_campus_tipo_mes",
            "campus_id",
            "tipo",
            "mes_referencia",
            unique=True,
            postgresql_where=text("origem = 'manual'"),
        ),
        # E um de demonstração (0014).
        Index(
            "uq_lancamentos_demonstracao_campus_tipo_mes",
            "campus_id",
            "tipo",
            "mes_referencia",
            unique=True,
            postgresql_where=text("origem = 'demonstracao'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campus.id"), index=True, nullable=False)
    tipo: Mapped[LancamentoTipo] = mapped_column(SQLEnum(LancamentoTipo, name="lancamento_tipo"), nullable=False)
    # Consumo físico: m³ para água, kWh para luz. Nulo só em importado antigo que
    # veio sem consumo; esses ficam fora dos indicadores físicos.
    consumo: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    # Valor da fatura em R$. Informação complementar, nunca entra em nota ou ranking.
    valor_rs: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    origem: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    mes_referencia: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Quem criou (e-mail do Firebase, ou o uid quando não há e-mail). Nulo só em registro anterior à 0013.
    criado_por: Mapped[str | None] = mapped_column(String(254), nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    ponto_medicao_id: Mapped[int | None] = mapped_column(ForeignKey("pontos_medicao.id"), index=True, nullable=True)

    campus: Mapped[Campus] = relationship(back_populates="lancamentos")
    ponto_medicao: Mapped[PontoMedicao | None] = relationship(back_populates="lancamentos")
