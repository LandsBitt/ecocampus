"""SPEC 4.4: rotas públicas com cache e lista de lançamentos com limite."""
from __future__ import annotations

import pytest


@pytest.mark.parametrize("rota", ["/public/ranking", "/public/pizza"])
def test_rotas_publicas_podem_ficar_em_cache(client, rota):
    assert client.get(f"{rota}?mes=2026-01").headers["cache-control"] == "public, max-age=300"


def test_rota_autenticada_nao_ganha_cache_publico(como):
    assert "public" not in como("super").get("/resumo?mes=2026-01").headers.get("cache-control", "")


def test_limite_traz_so_os_mais_recentes(como, lancar):
    for campus_id in range(1, 7):
        lancar(campus_id, "agua", 100.0 + campus_id)
    cliente = como("super")
    todos = cliente.get("/lancamentos?mes=2026-01").json()
    quatro = cliente.get("/lancamentos?mes=2026-01&limite=4").json()
    assert len(todos) == 6
    assert [l["id"] for l in quatro] == [l["id"] for l in todos[:4]]


@pytest.mark.parametrize("limite", [0, 501])
def test_limite_fora_da_faixa_e_recusado(como, limite):
    assert como("super").get(f"/lancamentos?limite={limite}").status_code == 422
