from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.schemas.admin import UpdateRoleRequest, UpdateStatusRequest
from app.schemas.auth import UserOut
from app.services import user_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get("/users", response_model=list[UserOut])
async def list_users(db: Annotated[AsyncSession, Depends(get_db)]) -> list[UserOut]:
    users = await user_service.list_all_users(db)
    return [UserOut(id=u.id, email=u.email, is_active=u.is_active, role=u.role.name) for u in users]


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_role(
    user_id: int, payload: UpdateRoleRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> UserOut:
    try:
        user = await user_service.update_user_role(db, user_id=user_id, role_name=payload.role)
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from exc
    except user_service.RoleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown role") from exc

    return UserOut(id=user.id, email=user.email, is_active=user.is_active, role=user.role.name)


@router.patch("/users/{user_id}/status", response_model=UserOut)
async def update_status(
    user_id: int, payload: UpdateStatusRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> UserOut:
    try:
        user = await user_service.update_user_status(
            db, user_id=user_id, is_active=payload.is_active
        )
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from exc

    return UserOut(id=user.id, email=user.email, is_active=user.is_active, role=user.role.name)
