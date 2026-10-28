from __future__ import annotations

import pytest


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("rota", ["/me", "/campus", "/lancamentos", "/resumo", "/indicadores", "/grafico/pizza"])
def test_rotas_protegidas_exigem_token(client, rota):
    assert client.get(rota).status_code == 401


@pytest.mark.parametrize("rota", ["/public/ranking", "/public/pizza"])
def test_rotas_publicas_dispensam_token(client, rota):
    assert client.get(rota).status_code == 200


def test_rota_de_super_recusa_papel_campus(como):
    assert como("campus", 1).get("/grafico/pizza").status_code == 403
    assert como("super").get("/grafico/pizza").status_code == 200


def test_campus_lista_apenas_o_proprio_campus(como):
    campi = como("campus", 3).get("/campus").json()
    assert [campus["id"] for campus in campi] == [3]
