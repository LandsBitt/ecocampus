"""SPEC 1.9 (achado B1): nada de pontos de medição em rota sem login."""
from __future__ import annotations


def test_public_campus_nao_existe_mais(client):
    # Expunha endereço, UC, RGI e código de instalação de todos os pontos sem autenticação.
    assert client.get("/public/campus").status_code == 404


def test_ranking_publico_continua_funcionando(client, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    lancar(1, "agua", 500)

    resposta = client.get("/public/ranking?mes=2026-01")
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()[0]["campusId"] == 1
    assert client.get("/public/pizza?mes=2026-01").status_code == 200


def test_nenhuma_rota_publica_expoe_pontos_de_medicao(client):
    caminhos = [caminho for caminho in client.app.openapi()["paths"] if caminho.startswith("/public")]
    assert sorted(caminhos) == ["/public/pizza", "/public/ranking"]
