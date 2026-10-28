"""Criação e manutenção de contas pela tela de administração, com um Firebase falso."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from firebase_admin.auth import EmailAlreadyExistsError, UserNotFoundError

from app.api.routes import usuarios


class FirebaseFalso:
    def __init__(self) -> None:
        self.contas: dict[str, SimpleNamespace] = {}
        self.revogados: list[str] = []
        self.falhar_claims = False

    def _registro(self, uid: str) -> SimpleNamespace:
        if uid not in self.contas:
            raise UserNotFoundError("não existe")
        return self.contas[uid]

    def create_user(self, *, email: str, password: str):
        if any(c.email == email for c in self.contas.values()):
            raise EmailAlreadyExistsError("já existe", None, None)
        uid = f"uid-{len(self.contas) + 1}"
        self.contas[uid] = SimpleNamespace(
            uid=uid,
            email=email,
            password=password,
            custom_claims=None,
            disabled=False,
            user_metadata=SimpleNamespace(creation_timestamp=1, last_sign_in_timestamp=None),
        )
        return self.contas[uid]

    def set_custom_user_claims(self, uid: str, claims: dict) -> None:
        if self.falhar_claims:
            raise RuntimeError("Firebase fora do ar")
        self._registro(uid).custom_claims = claims

    def get_user(self, uid: str):
        return self._registro(uid)

    def update_user(self, uid: str, *, disabled: bool) -> None:
        self._registro(uid).disabled = disabled

    def delete_user(self, uid: str) -> None:
        del self.contas[uid]

    def revoke_refresh_tokens(self, uid: str) -> None:
        self.revogados.append(uid)

    def list_users(self):
        return SimpleNamespace(iterate_all=lambda: list(self.contas.values()))


@pytest.fixture()
def fb(monkeypatch) -> FirebaseFalso:
    falso = FirebaseFalso()
    monkeypatch.setattr(usuarios, "_firebase", lambda: falso)
    return falso


def _novo(**campos):
    return {"email": "ana@unitau.br", "senha": "segredo123", "role": "campus", "campusId": 2, **campos}


def test_super_cria_admin_de_campus_com_papel_no_token(como, fb):
    resposta = como("super").post("/usuarios", json=_novo())
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == "ana@unitau.br"
    assert corpo["role"] == "campus" and corpo["campusId"] == 2
    assert fb.contas[corpo["uid"]].custom_claims == {"role": "campus", "campusId": 2}


def test_super_cria_outro_super_sem_campus(como, fb):
    corpo = como("super").post("/usuarios", json=_novo(role="super", campusId=None)).json()
    assert fb.contas[corpo["uid"]].custom_claims == {"role": "super"}
    assert corpo["campusId"] is None


def test_admin_de_campus_nao_cria_nem_lista(como, fb):
    assert como("campus", 2).post("/usuarios", json=_novo()).status_code == 403
    assert como("campus", 2).get("/usuarios").status_code == 403
    assert fb.contas == {}


@pytest.mark.parametrize(
    "campos",
    [
        {"senha": "curta"},
        {"email": "sem-arroba"},
        {"role": "campus", "campusId": None},
        {"role": "super", "campusId": 2},
        {"role": "aluno"},
    ],
)
def test_dados_invalidos_sao_recusados_antes_do_firebase(como, fb, campos):
    assert como("super").post("/usuarios", json=_novo(**campos)).status_code == 422
    assert fb.contas == {}


def test_campus_inexistente_e_recusado(como, fb):
    assert como("super").post("/usuarios", json=_novo(campusId=999)).status_code == 422
    assert fb.contas == {}


def test_email_repetido_vira_409(como, fb):
    como("super").post("/usuarios", json=_novo())
    resposta = como("super").post("/usuarios", json=_novo())
    assert resposta.status_code == 409
    assert "Já existe" in resposta.json()["detail"]


def test_falha_ao_gravar_papel_nao_deixa_conta_pela_metade(como, fb):
    fb.falhar_claims = True
    # O TestClient repassa a exceção do servidor; em produção vira 500.
    with pytest.raises(RuntimeError):
        como("super").post("/usuarios", json=_novo())
    assert fb.contas == {}


def test_lista_inclui_conta_sem_papel(como, fb):
    fb.create_user(email="zeca@unitau.br", password="x" * 8)
    como("super").post("/usuarios", json=_novo())
    lista = como("super").get("/usuarios").json()
    assert [u["email"] for u in lista] == ["ana@unitau.br", "zeca@unitau.br"]
    assert lista[1]["role"] is None


def test_atribuir_papel_a_conta_existente_revoga_tokens(como, fb):
    sem_papel = fb.create_user(email="zeca@unitau.br", password="x" * 8)
    corpo = como("super").patch(f"/usuarios/{sem_papel.uid}", json={"role": "campus", "campusId": 3}).json()
    assert corpo["role"] == "campus" and corpo["campusId"] == 3
    assert fb.revogados == [sem_papel.uid]


def test_desativar_e_reativar(como, fb):
    uid = como("super").post("/usuarios", json=_novo()).json()["uid"]
    assert como("super").patch(f"/usuarios/{uid}", json={"desativado": True}).json()["desativado"] is True
    assert como("super").patch(f"/usuarios/{uid}", json={"desativado": False}).json()["desativado"] is False
    assert fb.revogados == [uid]


def test_super_nao_se_rebaixa_nem_se_desativa(como, fb):
    # O usuário de teste do `como("super")` tem uid "teste-super".
    assert como("super").patch("/usuarios/teste-super", json={"desativado": True}).status_code == 400
    resposta = como("super").patch("/usuarios/teste-super", json={"role": "campus", "campusId": 1})
    assert resposta.status_code == 400


def test_usuario_inexistente_vira_404(como, fb):
    assert como("super").patch("/usuarios/nao-existe", json={"desativado": True}).status_code == 404


def test_revogar_tira_o_token_do_cache_na_hora(como, fb):
    """SPEC 4.2: o token conferido fica em cache; revogar não pode esperar o prazo dele."""
    from app.core import security

    conta = fb.create_user(email="zeca@unitau.br", password="x" * 8)
    security._tokens_conferidos["tok-zeca"] = (float("inf"), {"uid": conta.uid})
    security._tokens_conferidos["tok-outro"] = (float("inf"), {"uid": "outro"})
    try:
        como("super").patch(f"/usuarios/{conta.uid}", json={"desativado": True})
        assert "tok-zeca" not in security._tokens_conferidos
        assert "tok-outro" in security._tokens_conferidos
    finally:
        security._tokens_conferidos.clear()
