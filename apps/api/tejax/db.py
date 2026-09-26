"""SQLAlchemy engine / session setup.

SQLite is the zero-configuration default so the lab runs with no external
services. PostgreSQL (+pgvector) is supported by setting DATABASE_URL.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()

_connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from .database import models  # noqa: F401  (register mappings)

    os.makedirs(settings.data_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)
