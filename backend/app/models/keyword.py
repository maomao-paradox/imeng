from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.dream import Dream


class Keyword(Base):
    __tablename__ = "keywords"
    __table_args__ = (
        UniqueConstraint("dream_id", "word", name="uq_keyword_dream_word"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dream_id: Mapped[int] = mapped_column(
        ForeignKey("dreams.id", ondelete="CASCADE"),
        index=True,
    )
    word: Mapped[str] = mapped_column(String(80))
    weight: Mapped[float] = mapped_column(Float, default=0.5)

    dream: Mapped[Dream] = relationship(back_populates="keywords")
