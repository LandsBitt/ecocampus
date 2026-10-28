"""SPEC 2.5: contrato da API (camelCase) e autorização por papel em TODAS as rotas.

A tabela abaixo classifica cada rota. Rota nova que não entrar nela quebra
`test_toda_rota_esta_classificada`: decidir quem pode chamá-la é obrigatório.
A regra fina do papel campus nos lançamentos (D5) está em test_lancamento_manual.py.
"""
from __future__ import annotations

import re

import pytest
from fastapi.routing import APIRoute

from app.main import app

PUBLICAS = {
    ("GET", "/health"),
    ("GET", "/health/db"),
    ("GET", "/public/ranking"),
    ("GET", "/public/pizza"),
}

# Qualquer usuário com papel (super ou campus). O papel campus vê só o próprio campus.
AUTENTICADAS = {
    ("GET", "/me"),
    ("GET", "/campus"),
    ("GET", "/lancamentos"),
    ("POST", "/lancamentos"),
    ("PUT", "/lancamentos/{lancamento_id}"),
    ("DELETE", "/lancamentos/{lancamento_id}"),
    ("GET", "/resumo"),
    ("GET", "/indicadores"),
    ("GET", "/indicadores/universidade"),
    ("GET", "/fatores-emissao"),
    ("GET", "/serie"),
    ("GET", "/comparacao"),
    ("GET", "/alertas/picos"),
}

# Só a administração central.
SO_SUPER = {
    ("PATCH", "/campus/{campus_id}"),
    ("GET", "/grafico/pizza"),
    ("POST", "/importar/preview"),
    ("POST", "/importar/confirmar"),
    ("GET", "/usuarios"),
    ("POST", "/usuarios"),
    ("PATCH", "/usuarios/{uid}"),
    ("PUT", "/fatores-emissao/{ano}"),
}

PARAMETROS = {"{campus_id}": "1", "{lancamento_id}": "1", "{uid}": "alguem", "{ano}": "2026"}


def _rotas() -> set[tuple[str, str]]:
    return {
        (metodo, rota.path)
        for rota in app.routes
        if isinstance(rota, APIRoute)
        for metodo in rota.methods
    }


def _url(caminho: str) -> str:
    for marcador, valor in PARAMETROS.items():
        caminho = caminho.replace(marcador, valor)
    return caminho


def test_toda_rota_esta_classificada():
    classificadas = PUBLICAS | AUTENTICADAS | SO_SUPER
    assert _rotas() == classificadas, "Rota nova: classifique em PUBLICAS, AUTENTICADAS ou SO_SUPER."


@pytest.mark.parametrize(("metodo", "caminho"), sorted(AUTENTICADAS | SO_SUPER))
def test_sem_token_devolve_401(client, metodo, caminho):
    assert client.request(metodo, _url(caminho)).status_code == 401


@pytest.mark.parametrize(("metodo", "caminho"), sorted(SO_SUPER))
def test_papel_campus_recebe_403_nas_rotas_da_administracao_central(como, metodo, caminho):
    assert como("campus", 2).request(metodo, _url(caminho)).status_code == 403


# --- camelCase -------------------------------------------------------------------

CAMEL_CASE = re.compile(r"^[a-z][a-zA-Z0-9]*$")
MES = "2026-01"

GETS_COM_DADO = [
    "/me",
    "/campus",
    f"/lancamentos?mes={MES}",
    f"/resumo?mes={MES}",
    f"/indicadores?mes={MES}",
    f"/indicadores/universidade?mes={MES}",
    f"/grafico/pizza?mes={MES}",
    f"/serie?ate={MES}&meses=3",
    f"/comparacao?mes={MES}",
    f"/alertas/picos?mes={MES}",
    "/fatores-emissao",
    f"/public/ranking?mes={MES}",
    f"/public/pizza?mes={MES}",
]


def _chaves(valor) -> set[str]:
    if isinstance(valor, dict):
        return set(valor) | {c for v in valor.values() for c in _chaves(v)}
    if isinstance(valor, list):
        return {c for v in valor for c in _chaves(v)}
    return set()


@pytest.fixture()
def com_dados(cadastrar, lancar, como):
    cadastrar(1, 1000, 10000)
    for i, mes in enumerate(["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]):
        lancar(1, "agua", 100 + i, mes=mes)
    lancar(1, "agua", 300, mes=MES)          # pico: preenche todos os campos do alerta
    lancar(1, "luz", 8000, mes=MES)
    como("super").put("/fatores-emissao/2026", json={"fator": 0.0461, "provisorio": True, "fonte": "teste"})


@pytest.mark.parametrize("caminho", GETS_COM_DADO)
def test_toda_resposta_usa_camel_case(como, com_dados, caminho):
    resposta = como("super").get(caminho)
    assert resposta.status_code == 200, resposta.text
    fora = sorted(c for c in _chaves(resposta.json()) if not CAMEL_CASE.match(c))
    assert fora == [], f"{caminho}: chaves fora do camelCase {fora}"
