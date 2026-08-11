from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


def record(
    session: AsyncSession,
    *,
    actor: User,
    action: str,
    target_type: str,
    target_id: int | None,
    detail: str | None = None,
) -> None:
    """Stage an audit row on the session without committing.

    The caller commits, so the log row lands in the same transaction as the
    mutation it describes.
    """
    session.add(
        AuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )
