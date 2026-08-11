from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.lookup import LookupValues
from app.services import lookup_service

router = APIRouter(
    prefix="/lookups",
    tags=["lookups"],
    dependencies=[Depends(get_current_user)],
)


# The lookup vocabulary is bounded and the form needs it whole, so this list
# endpoint is intentionally unpaginated.
@router.get("", response_model=LookupValues)
async def get_lookup_values(db: Annotated[AsyncSession, Depends(get_db)]) -> LookupValues:
    values = await lookup_service.get_lookup_values(db)
    return LookupValues(**values)
