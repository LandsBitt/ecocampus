"""SPEC 1.7 (achado C4): água (m³) e energia (kWh) nunca são somadas."""
from __future__ import annotations

MES = "2026-01"


def _chaves(valor) -> set[str]:
    """Todas as chaves de um JSON, em qualquer nível."""
    if isinstance(valor, dict):
        return set(valor) | {c for v in valor.values() for c in _chaves(v)}
    if isinstance(valor, list):
        return {c for v in valor for c in _chaves(v)}
    return set()


def test_nenhuma_resposta_traz_total_de_agua_com_energia(client, como, cadastrar, lancar):
    cadastrar(1, 1000, 10000)
    lancar(1, "agua", 500)
    lancar(1, "luz", 10000)

    super_ = como("super")
    respostas = {
        "/resumo": super_.get(f"/resumo?mes={MES}"),
        "/indicadores": super_.get(f"/indicadores?mes={MES}"),
        "/grafico/pizza": super_.get(f"/grafico/pizza?mes={MES}"),
        "/public/ranking": client.get(f"/public/ranking?mes={MES}"),
        "/public/pizza": client.get(f"/public/pizza?mes={MES}"),
    }
    respostas["/resumo (campus)"] = como("campus", 1).get(f"/resumo?mes={MES}")

    for rota, resposta in respostas.items():
        assert resposta.status_code == 200, (rota, resposta.text)
        assert "total" not in _chaves(resposta.json()), rota


def test_pizza_traz_cada_medida_separada(como, client, lancar):
    lancar(1, "agua", 300)
    lancar(1, "luz", 9000)
    lancar(2, "agua", 100)

    for resposta in (como("super").get(f"/grafico/pizza?mes={MES}"), client.get(f"/public/pizza?mes={MES}")):
        campi = {item["campusId"]: item for item in resposta.json()}
        assert (campi[1]["agua"], campi[1]["luz"]) == (300, 9000)
        assert (campi[2]["agua"], campi[2]["luz"]) == (100, 0)


def test_campus_com_qualquer_lancamento_tem_dados(como, cadastrar, lancar):
    """"Campi com registro" conta quem tem lançamento de água OU de energia, mesmo zero."""
    lancar(1, "agua", 300)
    lancar(2, "luz", 0)

    campi = {item["campusId"]: item for item in como("super").get(f"/indicadores?mes={MES}").json()}
    assert campi[1]["temDados"] is True
    assert campi[2]["temDados"] is True
    assert campi[3]["temDados"] is False
