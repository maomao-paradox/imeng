from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.keyword import Keyword
    from app.models.user import User


class Dream(Base):
    __tablename__ = "dreams"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    date: Mapped[date] = mapped_column(Date, index=True)
    mood: Mapped[list[str]] = mapped_column(JSON, default=list)
    clarity: Mapped[int] = mapped_column(Integer, default=3)
    keyword_extraction_status: Mapped[str] = mapped_column(
        String(20),
        default="unconfigured",
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="dreams")
    keywords: Mapped[list[Keyword]] = relationship(
        back_populates="dream",
        cascade="all, delete-orphan",
        order_by="Keyword.id",
    )
