"""Base dos testes do backend.

Os testes rodam contra um Postgres de verdade (o do docker-compose), num banco
separado `ecocampus_test`, porque a importação usa `INSERT ... ON CONFLICT`,
que não existe no SQLite. O banco é criado e migrado com Alembic uma vez por
sessão; cada teste roda dentro de uma transação que é desfeita no final.
"""
from __future__ import annotations

import os
from pathlib import Path

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://ecocampus:dev@localhost:5432/ecocampus_test",
)

# Precisa acontecer antes de importar `app`: as configurações são lidas no import
# e variável de ambiente tem prioridade sobre o `.env`.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("FIREBASE_PROJECT_ID", "ecocampus-test")

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.security import get_current_user  # noqa: E402
from app.db.models import Campus, Lancamento, LancamentoTipo, PontoMedicao  # noqa: E402
from app.db.session import engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas.auth import UserClaims  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _garante_banco_de_teste() -> None:
    url = make_url(TEST_DATABASE_URL)
    # Trava de segurança: os testes apagam e recriam dados à vontade.
    if not (url.database or "").endswith("_test"):
        raise RuntimeError(
            f"TEST_DATABASE_URL aponta para '{url.database}'. O nome do banco de teste precisa terminar em '_test'."
        )
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :nome"), {"nome": url.database}
        ).scalar()
        if not existe:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def alembic_cfg() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "app" / "db" / "migrations"))
    return config


@pytest.fixture(scope="session", autouse=True)
def _banco_migrado(alembic_cfg):
    _garante_banco_de_teste()
    command.upgrade(alembic_cfg, "head")
    yield
    engine.dispose()


@pytest.fixture()
def db(_banco_migrado):
    """Sessão dentro de uma transação externa, desfeita ao fim do teste.

    `create_savepoint` faz os `commit()` das rotas virarem savepoints, então
    nada do que o teste grava sobrevive a ele.
    """
    conexao = engine.connect()
    transacao = conexao.begin()
    sessao = Session(bind=conexao, join_transaction_mode="create_savepoint", autoflush=False)
    try:
        yield sessao
    finally:
        sessao.close()
        transacao.rollback()
        conexao.close()


@pytest.fixture()
def client(db):
    """Cliente sem autenticação. Use `como` para assumir um papel."""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()


@pytest.fixture()
def como(client):
    """Autentica as próximas chamadas: `como("super")` ou `como("campus", 2)`."""

    def _como(role: str, campus_id: int | None = None) -> TestClient:
        usuario = UserClaims(uid=f"teste-{role}", email=f"{role}@teste.local", role=role, campusId=campus_id)
        app.dependency_overrides[get_current_user] = lambda: usuario
        return client

    return _como


@pytest.fixture()
def cadastrar(db):
    """Define população e área de um campus (as migrations criam os 8 zerados)."""

    def _cadastrar(campus_id: int, populacao: int, area: int) -> None:
        campus = db.get(Campus, campus_id)
        campus.populacao = populacao
        campus.area_construida_m2 = area
        db.flush()

    return _cadastrar


@pytest.fixture()
def lancar(db):
    """Cria um lançamento direto no banco. `consumo` é físico: m³ ou kWh."""

    def _lancar(
        campus_id: int,
        tipo: str,
        consumo: float | None,
        mes: str = "2026-01",
        *,
        origem: str = "manual",
        valor_rs: float | None = None,
        ponto_medicao_id: int | None = None,
    ) -> Lancamento:
        item = Lancamento(
            campus_id=campus_id,
            tipo=LancamentoTipo(tipo),
            consumo=consumo,
            valor_rs=valor_rs,
            origem=origem,
            mes_referencia=mes,
            ponto_medicao_id=ponto_medicao_id,
        )
        db.add(item)
        db.flush()
        return item

    return _lancar


@pytest.fixture()
def ponto_de(db):
    """Um ponto de medição do seed: `ponto_de(1, "agua")`."""

    def _ponto_de(campus_id: int, tipo: str, posicao: int = 0) -> PontoMedicao:
        pontos = db.scalars(
            select(PontoMedicao)
            .where(PontoMedicao.campus_id == campus_id, PontoMedicao.tipo == LancamentoTipo(tipo))
            .order_by(PontoMedicao.id)
        ).all()
        return pontos[posicao]

    return _ponto_de
