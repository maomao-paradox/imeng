from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.dream import Dream
    from app.models.user import User


class DreamReaction(Base):
    __tablename__ = "dream_reactions"
    __table_args__ = (
        UniqueConstraint("dream_id", "user_id", name="uq_dream_reaction_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dream_id: Mapped[int] = mapped_column(
        ForeignKey("dreams.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
    )

    dream: Mapped[Dream] = relationship(back_populates="reactions")
    user: Mapped[User] = relationship()
