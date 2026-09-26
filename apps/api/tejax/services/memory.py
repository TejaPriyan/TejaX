"""Long-term memory subsystem.

Stores curated discoveries (never raw agent chatter) with a type, source and
importance, and supports retrieval by keyword + (optional) semantic similarity
when a provider exposes embeddings.

Memory is intentionally conservative: the orchestrator decides what is worth
remembering — the memory agent only dedupes and persists.
"""

from __future__ import annotations

import math
import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..constants import MemoryType
from ..database.models import Memory
from ..providers import ModelProvider

_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with",
    "is", "are", "was", "were", "be", "this", "that", "it", "as", "at", "by",
}


class MemoryService:
    def __init__(self, provider: ModelProvider | None = None) -> None:
        self.provider = provider

    def _embed_cache_key(self, text: str) -> str:
        return text

    async def embed(self, text: str) -> list[float] | None:
        if self.provider is None:
            return None
        try:
            return await self.provider.embed(text)
        except Exception:
            return None

    @staticmethod
    def _tokens(text: str) -> set[str]:
        return {t for t in re.findall(r"[a-z0-9']+", text.lower()) if t not in _STOPWORDS}

    @staticmethod
    def _cosine(a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(x * x for x in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

    async def store(
        self,
        db: Session,
        *,
        type_: str,
        content: str,
        source: str = "",
        mission_id: str | None = None,
        importance: float = 0.5,
    ) -> Memory:
        # Dedupe near-identical memories (Jaccard overlap on tokens).
        existing = db.scalars(select(Memory).limit(400)).all()
        tokens = self._tokens(content)
        for mem in existing:
            if not mem.content:
                continue
            m_tokens = self._tokens(mem.content)
            union = tokens | m_tokens
            if not union:
                continue
            overlap = len(tokens & m_tokens) / len(union)
            if overlap > 0.82:
                return mem  # avoid unnecessary duplicates

        embedding = await self.embed(content)
        mem = Memory(
            id=uuid.uuid4().hex,
            type=type_,
            content=content,
            source=source,
            mission_id=mission_id,
            importance=importance,
            embedding=embedding,
        )
        db.add(mem)
        db.commit()
        db.refresh(mem)
        return mem

    async def retrieve(
        self,
        db: Session,
        query: str,
        limit: int = 10,
        type_: str | None = None,
    ) -> list[dict[str, Any]]:
        stmt = select(Memory)
        if type_:
            stmt = stmt.where(Memory.type == type_)
        memories = db.scalars(stmt.order_by(Memory.created_at.desc()).limit(500)).all()

        q_tokens = self._tokens(query)
        q_embedding = await self.embed(query) if len(query.strip()) > 2 else None

        scored: list[dict[str, Any]] = []
        for m in memories:
            m_tokens = self._tokens(m.content)
            union = q_tokens | m_tokens
            keyword = len(q_tokens & m_tokens) / len(union) if union else 0.0
            semantic = self._cosine(q_embedding, m.embedding) if q_embedding and m.embedding else 0.0
            score = 0.6 * max(keyword, semantic) + 0.25 * keyword + 0.15 * (m.importance or 0.5)
            if score > 0.0:
                scored.append({
                    "id": m.id,
                    "type": m.type,
                    "content": m.content,
                    "source": m.source,
                    "mission_id": m.mission_id,
                    "importance": m.importance,
                    "score": round(score, 4),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                })
        scored.sort(key=lambda x: -x["score"])
        return scored[:limit]
