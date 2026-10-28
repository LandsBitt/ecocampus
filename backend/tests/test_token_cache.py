"""SPEC 4.2: a revogação do token é conferida no Firebase uma vez por token, não a cada requisição."""
from __future__ import annotations

import time

import pytest

from app.core import security


class FirebaseFalso:
    """Conta as idas ao Firebase; o token "tok-<uid>" decodifica para aquele uid."""

    def __init__(self, validade_segundos: float = 3600):
        self.chamadas = 0
        self.validade = validade_segundos

    def verify_id_token(self, token: str, check_revoked: bool = False) -> dict:
        assert check_revoked, "a revogação tem de continuar sendo conferida"
        self.chamadas += 1
        return {"uid": token.removeprefix("tok-"), "exp": time.time() + self.validade}


@pytest.fixture()
def firebase(monkeypatch):
    falso = FirebaseFalso()
    monkeypatch.setattr(security.auth, "verify_id_token", falso.verify_id_token)
    security._tokens_conferidos.clear()
    yield falso
    security._tokens_conferidos.clear()


@pytest.fixture()
def relogio(monkeypatch):
    """Relógio monotônico controlado pelo teste."""
    agora = [1000.0]
    monkeypatch.setattr(security.time, "monotonic", lambda: agora[0])
    return agora


def test_mesmo_token_vai_ao_firebase_uma_vez(firebase):
    for _ in range(8):  # o Painel abre com várias requisições
        assert security._decodificar("tok-ana")["uid"] == "ana"
    assert firebase.chamadas == 1
    security._decodificar("tok-bia")
    assert firebase.chamadas == 2


def test_confere_de_novo_depois_do_prazo(firebase, relogio):
    security._decodificar("tok-ana")
    relogio[0] += security.REVOGACAO_TTL_SEGUNDOS - 1
    security._decodificar("tok-ana")
    assert firebase.chamadas == 1
    relogio[0] += 2
    security._decodificar("tok-ana")
    assert firebase.chamadas == 2


def test_nunca_vale_alem_do_vencimento_do_token(firebase, relogio):
    firebase.validade = 30  # token que vence antes do prazo do cache
    security._decodificar("tok-ana")
    relogio[0] += 31
    security._decodificar("tok-ana")
    assert firebase.chamadas == 2


def test_revogar_esquece_o_usuario_na_hora(firebase):
    security._decodificar("tok-ana")
    security._decodificar("tok-bia")
    security.esquecer_usuario("ana")
    security._decodificar("tok-ana")
    security._decodificar("tok-bia")
    assert firebase.chamadas == 3  # ana conferiu de novo; bia continuou no cache


def test_cache_nao_cresce_sem_limite(firebase, monkeypatch):
    monkeypatch.setattr(security, "_MAX_TOKENS_EM_CACHE", 5)
    for i in range(12):
        security._decodificar(f"tok-u{i}")
    assert len(security._tokens_conferidos) <= 5
