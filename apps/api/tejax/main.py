"""Entrypoint: `python -m tejax.main` or `uvicorn tejax.main:app`."""

from __future__ import annotations

import uvicorn

from .api.app import app

__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run("tejax.main:app", host="0.0.0.0", port=8000, reload=False)
