from calendar import monthrange
from collections import Counter
from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.models.dream import Dream
from app.models.keyword import Keyword
from app.schemas.dream import CalendarDay, CalendarOverview, is_mood

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("", response_model=CalendarOverview)
async def get_calendar(
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
) -> CalendarOverview:
    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])
    records = await db.scalars(
        select(Dream)
        .where(
            Dream.user_id == current_user.id,
            Dream.date >= month_start,
            Dream.date <= month_end,
        )
        .order_by(Dream.date, Dream.id)
    )
    dreams = list(records)
    by_date: dict[date, list[Dream]] = {}
    mood_counts: dict[date, Counter[str]] = {}
    for dream in dreams:
        by_date.setdefault(dream.date, []).append(dream)
        mood_counts.setdefault(dream.date, Counter()).update(dream.mood)

    days = [
        CalendarDay(
            date=dream_date,
            dream_count=len(day_dreams),
            dominant_mood=(
                next(
                    (
                        mood
                        for mood, _count in mood_counts[dream_date].most_common()
                        if is_mood(mood)
                    ),
                    None,
                )
            ),
        )
        for dream_date, day_dreams in sorted(by_date.items())
    ]
    keyword_rows = await db.execute(
        select(Keyword.word, func.count(Keyword.id).label("frequency"))
        .join(Dream, Dream.id == Keyword.dream_id)
        .where(
            Dream.user_id == current_user.id,
            Dream.date >= month_start,
            Dream.date <= month_end,
        )
        .group_by(Keyword.word)
        .order_by(func.count(Keyword.id).desc(), Keyword.word)
        .limit(5)
    )
    return CalendarOverview(
        year=year,
        month=month,
        days=days,
        recorded_days=len(by_date),
        dream_count=len(dreams),
        top_keywords=[row.word for row in keyword_rows],
    )
