"""Tests never write to the developer's mission database or call paid providers."""
import os
import tempfile

_data = tempfile.TemporaryDirectory(prefix="tejax-tests-")
os.environ["DATA_DIR"] = _data.name
os.environ["DATABASE_URL"] = "sqlite:///" + _data.name.replace("\\", "/") + "/test.db"
os.environ["MODEL_PROVIDER"] = "demo"
os.environ["DEMO_PACING_SECONDS"] = "0"
os.environ["ENVIRONMENT"] = "development"


def pytest_sessionfinish(session, exitstatus):
    from tejax.db import engine
    engine.dispose()
    _data.cleanup()
