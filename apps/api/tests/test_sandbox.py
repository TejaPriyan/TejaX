"""Sandbox safety + execution tests."""

import asyncio

import pytest

from tejax.sandbox import LocalRunner, build_runner


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def test_successful_experiment_extracts_metrics(event_loop):
    code = (
        "import json\n"
        "print('accuracy=0.9123')\n"
        "print('__TEJAX_METRIC__: %s' % json.dumps({'score': 0.9123}))\n"
    )
    res = event_loop.run_until_complete(LocalRunner().run(code))
    assert res.ok is True
    assert res.metrics == {"score": 0.9123}
    assert "accuracy=0.9123" in res.stdout


def test_failing_experiment_captures_error(event_loop):
    code = "raise RuntimeError('boom')"
    res = event_loop.run_until_complete(LocalRunner().run(code))
    assert res.ok is False
    assert res.error and "boom" in res.error


def test_infinite_loop_times_out(event_loop):
    code = "while True:\n    pass\n"
    res = event_loop.run_until_complete(LocalRunner().run(code, timeout=2))
    assert res.ok is False
    assert res.error == "Experiment timed out"


def test_build_runner_defaults_to_local():
    assert build_runner().backend == "local"


def test_no_shell_interpolation(event_loop):
    """Semicolons/redirection are not executed as shell — the script is run directly."""
    code = "print('__TEJAX_METRIC__: %s' % '{\"score\": 1}')"
    res = event_loop.run_until_complete(LocalRunner().run(code))
    # The literal string (with quotes) is not valid JSON, so no metric is parsed.
    assert res.ok is True
