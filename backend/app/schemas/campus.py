from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CampusOut(BaseModel):
    id: int
    nome: str

    model_config = ConfigDict(from_attributes=True)
