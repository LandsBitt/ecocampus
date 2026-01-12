from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserClaims(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    uid: Optional[str] = None
    email: Optional[str] = None
    role: str
    campusId: Optional[int] = Field(default=None)