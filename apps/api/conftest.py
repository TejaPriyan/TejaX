"""Pytest configuration — speed up the demo pacing for tests."""

import os

os.environ.setdefault("DEMO_PACING_SECONDS", "0")
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test.db")
os.environ.setdefault("DATA_DIR", "./data")
