from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    role: str
    campus_id: int | None = Field(None, alias="campusId")

    model_config = ConfigDict(populate_by_name=True)
