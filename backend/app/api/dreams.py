from collections import Counter, defaultdict
from datetime import date
from itertools import combinations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.dream import Dream
from app.models.keyword import Keyword
from app.models.user import User
from app.schemas.dream import (
    DreamCreate,
    DreamDeleted,
    DreamNetwork,
    DreamPage,
    DreamRead,
    DreamSummary,
    DreamUpdate,
    KeywordRead,
    KeywordReplace,
    Mood,
    NetworkEdge,
    NetworkNode,
)
from app.services.keyword_extractor import extract_dream_keywords

router = APIRouter(prefix="/dreams", tags=["dreams"])

NETWORK_NODE_LIMIT = 200
NETWORK_EDGE_LIMIT = 1000
NETWORK_RELATED_DREAM_LIMIT = 20


async def _owned_dream(db: AsyncSession, user: User, dream_id: int) -> Dream:
    dream = await db.scalar(
        select(Dream)
        .where(Dream.id == dream_id, Dream.user_id == user.id)
        .options(selectinload(Dream.keywords))
    )
    if dream is None:
        raise HTTPException(status_code=404, detail="梦境不存在")
    return dream


@router.post("", response_model=DreamRead, status_code=status.HTTP_201_CREATED)
async def create_dream(
    payload: DreamCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamRead:
    dream = Dream(
        user_id=current_user.id,
        content=payload.content,
        date=payload.date,
        mood=payload.mood,
        clarity=payload.clarity,
        is_public=payload.is_public,
        is_anonymous=payload.is_anonymous,
        keywords=[],
    )
    db.add(dream)
    await db.commit()
    dream = await _owned_dream(db, current_user, dream.id)
    await extract_dream_keywords(dream)
    await db.commit()
    dream = await _owned_dream(db, current_user, dream.id)
    return DreamRead.model_validate(dream)


@router.get("", response_model=DreamPage)
async def list_dreams(
    db: DbSession,
    current_user: CurrentUser,
    q: str | None = Query(default=None, max_length=200),
    mood: Mood | None = None,
    keyword: str | None = Query(default=None, max_length=80),
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> DreamPage:
    filters = [Dream.user_id == current_user.id]
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="开始日期不能晚于结束日期")
    if q and q.strip():
        filters.append(Dream.content.contains(q.strip()))
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
    if keyword and keyword.strip():
        filters.append(
            select(Keyword.id)
            .where(
                Keyword.dream_id == Dream.id,
                Keyword.word == keyword.strip(),
            )
            .exists()
        )
    if date_from:
        filters.append(Dream.date >= date_from)
    if date_to:
        filters.append(Dream.date <= date_to)

    count = await db.scalar(select(func.count(Dream.id)).where(*filters))
    rows = await db.scalars(
        select(Dream)
        .where(*filters)
        .options(selectinload(Dream.keywords))
        .order_by(Dream.date.desc(), Dream.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return DreamPage(
        items=[DreamRead.model_validate(dream) for dream in rows],
        total=count or 0,
        limit=limit,
        offset=offset,
    )


@router.get("/network", response_model=DreamNetwork)
async def get_all_dreams_network(
    db: DbSession,
    current_user: CurrentUser,
) -> DreamNetwork:
    dream_count = await db.scalar(
        select(func.count(Dream.id)).where(Dream.user_id == current_user.id)
    )
    rows = await db.execute(
        select(
            Dream.id.label("dream_id"),
            Dream.date,
            Dream.content,
            Keyword.id.label("keyword_id"),
            Keyword.word,
            Keyword.weight,
        )
        .join(Keyword, Keyword.dream_id == Dream.id)
        .where(Dream.user_id == current_user.id)
        .order_by(Dream.date.desc(), Dream.id.desc())
    )

    labels: dict[str, str] = {}
    keyword_ids: dict[str, list[int]] = defaultdict(list)
    weights: dict[str, list[float]] = defaultdict(list)
    word_dreams: dict[str, dict[int, DreamSummary]] = defaultdict(dict)
    words_by_dream: dict[int, set[str]] = defaultdict(set)

    for row in rows:
        word = row.word.casefold()
        labels.setdefault(word, row.word)
        keyword_ids[word].append(row.keyword_id)
        weights[word].append(row.weight)
        word_dreams[word].setdefault(
            row.dream_id,
            DreamSummary(
                id=row.dream_id,
                date=row.date,
                summary=row.content[:80],
            ),
        )
        words_by_dream[row.dream_id].add(word)

    word_ids = {word: min(ids) for word, ids in keyword_ids.items()}
    pair_counts: Counter[tuple[str, str]] = Counter()
    for words in words_by_dream.values():
        pair_counts.update(combinations(sorted(words), 2))
    max_pair_count = max(pair_counts.values(), default=1)

    all_nodes = [
        NetworkNode(
            id=word_ids[word],
            word=labels[word],
            weight=sum(weights[word]) / len(weights[word]),
            occurrences=len(word_dreams[word]),
            related_dreams=sorted(
                word_dreams[word].values(),
                key=lambda dream: (dream.date, dream.id),
                reverse=True,
            )[:NETWORK_RELATED_DREAM_LIMIT],
            related_dreams_total=len(word_dreams[word]),
        )
        for word in sorted(
            labels,
            key=lambda item: (-len(word_dreams[item]), labels[item].casefold()),
        )
    ]
    nodes = all_nodes[:NETWORK_NODE_LIMIT]
    included_node_ids = {node.id for node in nodes}
    all_edges = [
        NetworkEdge(
            source=word_ids[left],
            target=word_ids[right],
            strength=count / max_pair_count,
        )
        for (left, right), count in sorted(
            pair_counts.items(),
            key=lambda pair: (
                -pair[1],
                labels[pair[0][0]].casefold(),
                labels[pair[0][1]].casefold(),
            ),
        )
        if word_ids[left] in included_node_ids
        and word_ids[right] in included_node_ids
    ]
    edges = all_edges[:NETWORK_EDGE_LIMIT]
    truncated = (
        len(all_nodes) > NETWORK_NODE_LIMIT
        or len(all_edges) > NETWORK_EDGE_LIMIT
        or any(
            len(word_dreams[word]) > NETWORK_RELATED_DREAM_LIMIT
            for word in labels
        )
    )
    return DreamNetwork(
        nodes=nodes,
        edges=edges,
        dream_count=dream_count or 0,
        truncated=truncated,
    )


@router.get("/{dream_id}", response_model=DreamRead)
async def get_dream(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamRead:
    dream = await _owned_dream(db, current_user, dream_id)
    return DreamRead.model_validate(dream)


@router.patch("/{dream_id}", response_model=DreamRead)
async def update_dream(
    dream_id: int,
    payload: DreamUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamRead:
    dream = await _owned_dream(db, current_user, dream_id)
    changes = payload.model_dump(exclude_unset=True)
    content_changed = "content" in changes and changes["content"] != dream.content
    for field, value in changes.items():
        if value is not None:
            setattr(dream, field, value)
    if content_changed:
        await extract_dream_keywords(dream)
    await db.commit()
    dream = await _owned_dream(db, current_user, dream_id)
    return DreamRead.model_validate(dream)


@router.post("/{dream_id}/keywords/extract", response_model=DreamRead)
async def reextract_keywords(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamRead:
    dream = await _owned_dream(db, current_user, dream_id)
    await extract_dream_keywords(dream)
    await db.commit()
    dream = await _owned_dream(db, current_user, dream_id)
    return DreamRead.model_validate(dream)


@router.delete("/{dream_id}")
async def delete_dream(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamDeleted:
    dream = await _owned_dream(db, current_user, dream_id)
    await db.delete(dream)
    await db.commit()
    return DreamDeleted(deleted=True)


@router.put("/{dream_id}/keywords", response_model=list[KeywordRead])
async def replace_keywords(
    dream_id: int,
    payload: KeywordReplace,
    db: DbSession,
    current_user: CurrentUser,
) -> list[KeywordRead]:
    dream = await _owned_dream(db, current_user, dream_id)
    words = [item.word.casefold() for item in payload.keywords]
    if len(words) != len(set(words)):
        raise HTTPException(status_code=422, detail="关键词不可重复")

    dream.keywords.clear()
    dream.keywords.extend(
        Keyword(word=item.word, weight=item.weight) for item in payload.keywords
    )
    await db.commit()
    await db.refresh(dream, attribute_names=["keywords"])
    return [KeywordRead.model_validate(item) for item in dream.keywords]


@router.get("/{dream_id}/network", response_model=DreamNetwork)
async def get_dream_network(
    dream_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> DreamNetwork:
    dream = await _owned_dream(db, current_user, dream_id)
    nodes: list[NetworkNode] = []
    for keyword in dream.keywords:
        occurrence_rows = await db.execute(
            select(Dream.id, Dream.date, Dream.content)
            .join(Keyword, Keyword.dream_id == Dream.id)
            .where(
                Dream.user_id == current_user.id,
                Keyword.word == keyword.word,
            )
            .order_by(Dream.date.desc(), Dream.id.desc())
            .limit(20)
        )
        summaries = [
            DreamSummary(
                id=row.id,
                date=row.date,
                summary=row.content[:80],
            )
            for row in occurrence_rows
        ]
        total_occurrences = await db.scalar(
            select(func.count(Keyword.id))
            .join(Dream, Dream.id == Keyword.dream_id)
            .where(
                Dream.user_id == current_user.id,
                Keyword.word == keyword.word,
            )
        )
        nodes.append(
            NetworkNode(
                id=keyword.id,
                word=keyword.word,
                weight=keyword.weight,
                occurrences=total_occurrences or 0,
                related_dreams=summaries,
                related_dreams_total=total_occurrences or 0,
            )
        )

    edges = [
        NetworkEdge(source=left.id, target=right.id, strength=0.2)
        for left, right in combinations(dream.keywords, 2)
    ]
    return DreamNetwork(nodes=nodes, edges=edges, dream_count=1)
