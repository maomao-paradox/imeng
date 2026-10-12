import importlib
import logging
import math
from typing import Protocol, cast

from app.core.config import KEYWORD_EXTRACTOR
from app.models.dream import Dream
from app.models.keyword import Keyword

logger = logging.getLogger(__name__)


class KeywordExtractor(Protocol):
    async def extract(self, content: str) -> list[tuple[str, float]]:
        """Return validated keyword and weight pairs for dream text."""


class KeywordProviderNotConfigured(RuntimeError):
    pass


class UnconfiguredKeywordExtractor:
    async def extract(self, content: str) -> list[tuple[str, float]]:
        raise KeywordProviderNotConfigured


def get_keyword_extractor() -> KeywordExtractor:
    if not KEYWORD_EXTRACTOR:
        return UnconfiguredKeywordExtractor()
    module_name, separator, class_name = KEYWORD_EXTRACTOR.partition(":")
    if not separator or not module_name or not class_name:
        raise ValueError("KEYWORD_EXTRACTOR must use the module:Class format")
    extractor_class = getattr(importlib.import_module(module_name), class_name)
    return cast(KeywordExtractor, extractor_class())


async def extract_dream_keywords(dream: Dream) -> None:
    dream.keyword_extraction_status = "pending"
    dream.keywords.clear()
    try:
        extractor = get_keyword_extractor()
        if isinstance(extractor, UnconfiguredKeywordExtractor):
            dream.keyword_extraction_status = "unconfigured"
            return
        keywords = await extractor.extract(dream.content)
        if not 3 <= len(keywords) <= 8:
            raise ValueError("Keyword extractor must return between 3 and 8 keywords")
        normalized_words: set[str] = set()
        validated: list[Keyword] = []
        for word, weight in keywords:
            normalized = word.strip()
            if not normalized or len(normalized) > 80 or not math.isfinite(weight):
                raise ValueError("Keyword extractor returned invalid keyword data")
            if not 0 <= weight <= 1 or normalized.casefold() in normalized_words:
                raise ValueError("Keyword extractor returned invalid keyword data")
            normalized_words.add(normalized.casefold())
            validated.append(Keyword(word=normalized, weight=weight))
    except Exception as error:
        logger.error(
            "Keyword extraction failed for dream %s (%s)",
            dream.id,
            type(error).__name__,
        )
        dream.keyword_extraction_status = "failed"
        return

    dream.keywords.extend(validated)
    dream.keyword_extraction_status = "complete"
