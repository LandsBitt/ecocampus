from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Firebase aceita a partir de 6; 8 é o mínimo razoável para conta de administração.
SENHA_MINIMA = 8

Papel = Literal["super", "campus"]


def _papel_coerente(role: str | None, campus_id: int | None) -> None:
    if role == "campus" and campus_id is None:
        raise ValueError("Administrador de campus precisa de um campus.")
    if role == "super" and campus_id is not None:
        raise ValueError("Administração central não fica presa a um campus.")


class UsuarioOut(BaseModel):
    uid: str
    email: str | None = None
    # Nulo quando a conta existe no Firebase mas ninguém atribuiu papel.
    role: Papel | None = None
    campus_id: int | None = Field(None, alias="campusId")
    desativado: bool = False
    criado_em: int | None = Field(None, alias="criadoEm", description="ms desde a época")
    ultimo_acesso: int | None = Field(None, alias="ultimoAcesso", description="ms desde a época")

    model_config = ConfigDict(populate_by_name=True)


class UsuarioCreate(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    senha: str = Field(min_length=SENHA_MINIMA, max_length=128)
    role: Papel
    campus_id: int | None = Field(default=None, alias="campusId", ge=1)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _coerente(self) -> UsuarioCreate:
        _papel_coerente(self.role, self.campus_id)
        return self


class UsuarioUpdate(BaseModel):
    """Troca de papel (os dois campos juntos) e/ou ativação da conta."""

    role: Papel | None = None
    campus_id: int | None = Field(default=None, alias="campusId", ge=1)
    desativado: bool | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _coerente(self) -> UsuarioUpdate:
        if self.role is None and self.campus_id is not None:
            raise ValueError("Informe o papel junto com o campus.")
        _papel_coerente(self.role, self.campus_id)
        return self
