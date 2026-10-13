import hashlib
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import Float, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.api.deps import CurrentUser, DbSession
from app.models.dream import Dream
from app.models.dream_reaction import DreamReaction
from app.models.keyword import Keyword
from app.models.user import User
from app.schemas.dream import (
    DreamMatchPage,
    DreamMatchRead,
    DreamReactionRead,
    Mood,
    PublicDreamPage,
    PublicDreamRead,
)

router = APIRouter(prefix="/social", tags=["social"])


def _author_label(dream_id: int, nickname: str, is_anonymous: bool) -> str:
    if not is_anonymous:
        return nickname
    alias = hashlib.sha256(f"imeng-public-dream:{dream_id}".encode()).hexdigest()[:6]
    return f"匿名梦旅人-{alias}"


def _reaction_state(
    reacted_by_me: bool,
    reaction_count: int,
) -> DreamReactionRead:
    return DreamReactionRead(
        reaction_count=reaction_count,
        reacted_by_me=reacted_by_me,
    )


def _reaction_count_subquery():
    return (
        select(
            DreamReaction.dream_id.label("dream_id"),
            func.count(DreamReaction.id).label("reaction_count"),
        )
        .group_by(DreamReaction.dream_id)
        .subquery()
    )


def _has_reacted_query(user_id: int):
    return (
        select(DreamReaction.id)
        .where(
            DreamReaction.dream_id == Dream.id,
            DreamReaction.user_id == user_id,
        )
        .exists()
    )


@router.get("/dreams", response_model=PublicDreamPage)
async def list_public_dreams(
    db: DbSession,
    current_user: CurrentUser,
    q: str | None = Query(default=None, max_length=80),
    mood: Mood | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
) -> PublicDreamPage:
    filters: list[ColumnElement[bool]] = [Dream.is_public.is_(True)]
    if q and q.strip():
        filters.append(
            select(Keyword.id)
            .where(
                Keyword.dream_id == Dream.id,
                func.lower(Keyword.word) == q.strip().lower(),
            )
            .exists()
        )
    if mood:
        mood_values = (
            func.json_each(Dream.mood).table_valued("value").alias("dream_moods")
        )
        filters.append(
            select(1)
            .select_from(mood_values)
            .where(mood_values.c.value == mood)
            .correlate(Dream)
            .exists()
        )

    total = await db.scalar(select(func.count(Dream.id)).where(*filters))
    counts = _reaction_count_subquery()
    rows = await db.execute(
        select(
            Dream,
            User.nickname,
            func.coalesce(counts.c.reaction_count, 0),
            _has_reacted_query(current_user.id).label("reacted_by_me"),
            (Dream.user_id == current_user.id).label("is_mine"),
        )
        .join(User, User.id == Dream.user_id)
        .outerjoin(counts, counts.c.dream_id == Dream.id)
        .where(*filters)
        .options(selectinload(Dream.keywords))
        .order_by(Dream.date.desc(), Dream.id.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [
        PublicDreamRead(
            id=dream.id,
            date=dream.date,
            summary=dream.content[:160],
            mood=dream.mood,
            keywords=[keyword.word for keyword in dream.keywords],
            author_label=_author_label(dream.id, nickname, dream.is_anonymous),
            is_anonymous=dream.is_anonymous,
            reaction_count=reaction_count,
            reacted_by_me=reacted_by_me,
            is_mine=is_mine,
        )
        for dream, nickname, reaction_count, reacted_by_me, is_mine in rows
    ]
    return PublicDreamPage(
        items=items,
        total=total or 0,
        limit=limit,
        offset=offset,
    )


async def _public_dream(db: AsyncSession, dream_id: int) -> Dream:
    dream = await db.scalar(
        select(Dream)
        .where(Dream.id == dream_id, Dream.is_public.is_(True))
        .options(selectinload(Dream.keywords))
    )
    if dream is None:
        raise HTTPException(status_code=404, detail="公开梦境不存在")
    return dream


async def _set_reaction(
    db: AsyncSession,
    dream: Dream,
    current_user: User,
    reacted: bool,
) -> DreamReactionRead:
    if dream.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="不能对自己的梦境发送共鸣",
        )

    existing = await db.scalar(
        select(DreamReaction).where(
            DreamReaction.dream_id == dream.id,
            DreamReaction.user_id == current_user.id,
        )
    )
    if reacted and existing is None:
        db.add(DreamReaction(dream_id=dream.id, user_id=current_user.id))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            existing = await db.scalar(
                select(DreamReaction).where(
                    DreamReaction.dream_id == dream.id,
                    DreamReaction.user_id == current_user.id,
                )
            )
            if existing is None:
                raise
    elif not reacted and existing is not None:
        await db.delete(existing)
        await db.commit()

    reaction_count = await db.scalar(
        select(func.count(DreamReaction.id)).where(
            DreamReaction.dream_id == dream.id
        )
    )
    return _reaction_state(
        reacted,
        reaction_count or 0,
    )


@router.put(
    "/dreams/{dream_id}/resonance",
    response_model=DreamReactionRead,
)
async def add_resonance(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamReactionRead:
    dream = await _public_dream(db, dream_id)
    return await _set_reaction(db, dream, current_user, reacted=True)


@router.delete(
    "/dreams/{dream_id}/resonance",
    response_model=DreamReactionRead,
)
async def remove_resonance(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamReactionRead:
    dream = await _public_dream(db, dream_id)
    return await _set_reaction(db, dream, current_user, reacted=False)


@router.get("/matches/today", response_model=DreamMatchPage)
async def get_today_matches(
    db: DbSession,
    current_user: CurrentUser,
) -> DreamMatchPage:
    today = date.today()
    source_rows = await db.scalars(
        select(Keyword.word)
        .join(Dream, Dream.id == Keyword.dream_id)
        .where(Dream.user_id == current_user.id, Dream.date == today)
    )
    source_words = {word.casefold() for word in source_rows}
    if not source_words:
        return DreamMatchPage(date=today, total=0, items=[])

    normalized_word = func.lower(Keyword.word)
    matched_terms = (
        select(
            Keyword.dream_id.label("dream_id"),
            normalized_word.label("word"),
        )
        .join(Dream, Dream.id == Keyword.dream_id)
        .where(
            Dream.is_public.is_(True),
            Dream.user_id != current_user.id,
            normalized_word.in_(source_words),
        )
        .group_by(Keyword.dream_id, normalized_word)
        .subquery()
    )
    overlap = (
        select(
            matched_terms.c.dream_id,
            func.count().label("overlap_count"),
        )
        .group_by(matched_terms.c.dream_id)
        .subquery()
    )
    candidate_ids = select(overlap.c.dream_id)
    total_words = (
        select(
            Keyword.dream_id.label("dream_id"),
            func.count(func.distinct(normalized_word)).label("word_count"),
        )
        .where(Keyword.dream_id.in_(candidate_ids))
        .group_by(Keyword.dream_id)
        .subquery()
    )
    total = await db.scalar(select(func.count()).select_from(overlap))
    similarity = cast(overlap.c.overlap_count, Float) / (
        len(source_words) + total_words.c.word_count - overlap.c.overlap_count
    )
    counts = _reaction_count_subquery()
    rows = await db.execute(
        select(
            Dream,
            User.nickname,
            overlap.c.overlap_count,
            similarity.label("similarity"),
            func.coalesce(counts.c.reaction_count, 0),
            _has_reacted_query(current_user.id).label("reacted_by_me"),
            (Dream.user_id == current_user.id).label("is_mine"),
        )
        .join(overlap, overlap.c.dream_id == Dream.id)
        .join(total_words, total_words.c.dream_id == Dream.id)
        .join(User, User.id == Dream.user_id)
        .outerjoin(counts, counts.c.dream_id == Dream.id)
        .where(Dream.is_public.is_(True), Dream.user_id != current_user.id)
        .options(selectinload(Dream.keywords))
        .order_by(similarity.desc(), Dream.date.desc(), Dream.id.desc())
        .limit(5)
    )
    items = []
    for (
        dream,
        nickname,
        _overlap_count,
        score,
        reaction_count,
        reacted_by_me,
        is_mine,
    ) in rows:
        keywords = [keyword.word for keyword in dream.keywords]
        common_keywords = [
            word for word in keywords if word.casefold() in source_words
        ]
        items.append(
            DreamMatchRead(
                id=dream.id,
                date=dream.date,
                summary=dream.content[:160],
                mood=dream.mood,
                keywords=keywords,
                common_keywords=common_keywords,
                similarity=round(score, 4),
                author_label=_author_label(dream.id, nickname, dream.is_anonymous),
                is_anonymous=dream.is_anonymous,
                reaction_count=reaction_count,
                reacted_by_me=reacted_by_me,
                is_mine=is_mine,
            )
        )
    return DreamMatchPage(date=today, total=total or 0, items=items)
