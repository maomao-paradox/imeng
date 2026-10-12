from datetime import date as Date
from datetime import datetime
from typing import Literal, TypeGuard

from pydantic import BaseModel, Field, field_validator

Mood = Literal["平静", "喜悦", "恐惧", "焦虑", "悲伤", "愤怒", "困惑", "奇妙"]
MOODS: tuple[Mood, ...] = (
    "平静",
    "喜悦",
    "恐惧",
    "焦虑",
    "悲伤",
    "愤怒",
    "困惑",
    "奇妙",
)


def is_mood(value: str) -> TypeGuard[Mood]:
    return value in MOODS


class DreamCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    date: Date
    mood: list[Mood] = Field(default_factory=list, max_length=8)
    clarity: int = Field(default=3, ge=1, le=5)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("梦境正文不能为空")
        return value.strip()

    @field_validator("mood")
    @classmethod
    def moods_must_be_unique(cls, value: list[Mood]) -> list[Mood]:
        if len(value) != len(set(value)):
            raise ValueError("情绪标签不可重复")
        return value


class DreamUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=5000)
    date: Date | None = None
    mood: list[Mood] | None = Field(default=None, max_length=8)
    clarity: int | None = Field(default=None, ge=1, le=5)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("梦境正文不能为空")
        return value.strip() if value is not None else None

    @field_validator("mood")
    @classmethod
    def moods_must_be_unique(cls, value: list[Mood] | None) -> list[Mood] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("情绪标签不可重复")
        return value


class KeywordUpdate(BaseModel):
    word: str = Field(min_length=1, max_length=80)
    weight: float = Field(ge=0, le=1)

    @field_validator("word")
    @classmethod
    def word_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("关键词不能为空")
        return value.strip()


class KeywordReplace(BaseModel):
    keywords: list[KeywordUpdate] = Field(max_length=32)


class KeywordRead(BaseModel):
    id: int
    word: str
    weight: float

    model_config = {"from_attributes": True}


class DreamRead(BaseModel):
    id: int
    content: str
    date: Date
    mood: list[Mood]
    clarity: int
    created_at: datetime
    keywords: list[KeywordRead]
    keyword_extraction_status: Literal["pending", "complete", "failed", "unconfigured"]

    model_config = {"from_attributes": True}


class DreamPage(BaseModel):
    items: list[DreamRead]
    total: int
    limit: int
    offset: int


class DreamDeleted(BaseModel):
    deleted: bool


class NetworkNode(BaseModel):
    id: int
    word: str
    weight: float
    occurrences: int
    related_dreams: list["DreamSummary"]


class NetworkEdge(BaseModel):
    source: int
    target: int
    strength: float


class DreamNetwork(BaseModel):
    nodes: list[NetworkNode]
    edges: list[NetworkEdge]
    dream_count: int = 0


class DreamSummary(BaseModel):
    id: int
    date: Date
    summary: str


class CalendarDay(BaseModel):
    date: Date
    dream_count: int
    dominant_mood: Mood | None


class CalendarOverview(BaseModel):
    year: int
    month: int
    days: list[CalendarDay]
    recorded_days: int
    dream_count: int
    top_keywords: list[str]


NetworkNode.model_rebuild()
