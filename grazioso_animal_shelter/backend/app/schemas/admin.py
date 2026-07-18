from typing import Literal

from pydantic import BaseModel

RoleName = Literal["viewer", "staff", "admin"]


class UpdateRoleRequest(BaseModel):
    role: RoleName


class UpdateStatusRequest(BaseModel):
    is_active: bool
