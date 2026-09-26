"""Safe experiment execution.

Generated AI code is ALWAYS treated as untrusted. Two backends:

* LocalRunner — subprocess with hard resource limits (timeout, memory via
  setrlimit on Unix, asyncio timeout on Windows), an isolated working
  directory, no shell interpolation, and truncated output capture. Used by
  default so the lab runs anywhere with zero setup.
* DockerRunner — runs the experiment inside a disposable container with an
  explicit `--network none`, `--memory`, `--cpus` and read-only FS. Used when
  `SANDBOX_BACKEND=docker`.

Never grant generated code access to the host filesystem, secrets, or the
network.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from ..config import get_settings

# Conditionally import Unix-only resource module — safe on Windows
try:
    import resource as _resource
    _HAS_RESOURCE = True
except ImportError:
    _resource = None  # type: ignore[assignment]
    _HAS_RESOURCE = False

METRIC_MARKER = "__TEJAX_METRIC__"
MAX_OUTPUT_CHARS = 200_000


@dataclass
class RunResult:
    ok: bool
    exit_code: int | None
    stdout: str
    stderr: str
    execution_time: float
    metrics: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    # Phase 1: sandbox security metadata
    sandbox_type: str = "LOCAL"           # LOCAL | DOCKER
    network_isolated: bool = False
    security_warning: str = ""


class SandboxRunner:
    backend = "base"

    async def run(self, code: str, timeout: int | None = None, files: dict[str, str | bytes] | None = None) -> RunResult:
        raise NotImplementedError


def _extract_metrics(stdout: str) -> tuple[str, dict[str, Any]]:
    """Pull structured metrics out of stdout without trusting arbitrary code."""
    metrics: dict[str, Any] = {}
    cleaned_lines: list[str] = []
    pattern = re.compile(rf"^{re.escape(METRIC_MARKER)}:\s*(.+)$")
    for line in stdout.splitlines():
        m = pattern.match(line.strip())
        if m:
            try:
                parsed = json.loads(m.group(1))
                if isinstance(parsed, dict):
                    for k, v in parsed.items():
                        if isinstance(v, (int, float, str, bool)):
                            metrics[str(k)] = v
                continue
            except json.JSONDecodeError:
                pass
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines), metrics


def _build_safe_env() -> dict[str, str]:
    """Build a minimal, safe environment for the subprocess."""
    if sys.platform == "win32":
        # On Windows keep PATH so Python DLLs can be found
        path = os.environ.get("PATH", "")
        return {
            "PATH": path,
            "PYTHONIOENCODING": "utf-8",
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows"),
        }
    return {"PATH": "/usr/bin:/bin", "HOME": "/tmp", "PYTHONIOENCODING": "utf-8"}


class LocalRunner(SandboxRunner):
    backend = "local"

    async def run(self, code: str, timeout: int | None = None, files: dict[str, str | bytes] | None = None) -> RunResult:
        settings = get_settings()
        timeout = timeout or settings.experiment_timeout

        workdir = os.path.join(os.path.abspath(settings.data_dir), "sandbox", uuid.uuid4().hex)
        os.makedirs(workdir, exist_ok=True)
        script_path = os.path.join(workdir, "experiment.py")

        try:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Write any attached files (e.g. real datasets) into the sandbox workdir
            if files:
                for fname, fcontent in files.items():
                    fpath = os.path.join(workdir, fname)
                    if isinstance(fcontent, bytes):
                        with open(fpath, "wb") as f:
                            f.write(fcontent)
                    else:
                        with open(fpath, "w", encoding="utf-8") as f:
                            f.write(str(fcontent))

            # Unix: apply hard resource limits before exec via preexec_fn
            if _HAS_RESOURCE and sys.platform != "win32":
                mem_bytes = settings.experiment_memory_mb * 1024 * 1024

                def _limit() -> None:
                    try:
                        _resource.setrlimit(_resource.RLIMIT_AS, (mem_bytes, mem_bytes))
                        _resource.setrlimit(_resource.RLIMIT_CPU, (settings.experiment_cpu_seconds, settings.experiment_cpu_seconds))
                        _resource.setrlimit(_resource.RLIMIT_NOFILE, (256, 256))
                    except Exception:
                        pass  # non-fatal; platform-dependent

                preexec = _limit
            else:
                # Windows / no resource module: rely on asyncio timeout only
                preexec = None

            safe_env = _build_safe_env()
            # Use the workdir as HOME on Unix; on Windows use workdir directly
            if sys.platform != "win32":
                safe_env["HOME"] = workdir

            t0 = time.time()
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-I",  # isolated mode: ignore user site & env
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=workdir,
                preexec_fn=preexec if preexec else None,
                env=safe_env,
            )
            try:
                out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
                timed_out = False
            except asyncio.TimeoutError:
                timed_out = True
                try:
                    proc.kill()
                except ProcessLookupError:
                    pass
                out_b, err_b = await proc.communicate()

            elapsed = time.time() - t0
            stdout_raw = (out_b or b"").decode("utf-8", "replace")
            stderr_raw = (err_b or b"").decode("utf-8", "replace")
            exit_code = proc.returncode

            stdout, metrics = _extract_metrics(stdout_raw[:MAX_OUTPUT_CHARS])
            stderr = stderr_raw[:MAX_OUTPUT_CHARS]

            _local_sec = dict(
                sandbox_type="LOCAL",
                network_isolated=False,
                security_warning="Host network accessible; not suitable for untrusted code.",
            )

            if timed_out:
                return RunResult(False, exit_code, stdout, stderr, elapsed, metrics, error="Experiment timed out", **_local_sec)

            if exit_code == 0:
                return RunResult(True, exit_code, stdout, stderr, elapsed, metrics, **_local_sec)
            if exit_code is None:
                return RunResult(False, exit_code, stdout, stderr, elapsed, metrics, error="Killed (resource limit)", **_local_sec)
            return RunResult(
                False, exit_code, stdout, stderr, elapsed, metrics,
                error=_summarize_error(stderr) or f"Exited with code {exit_code}",
                **_local_sec,
            )
        finally:
            shutil.rmtree(workdir, ignore_errors=True)


class DockerRunner(SandboxRunner):
    backend = "docker"

    async def run(self, code: str, timeout: int | None = None, files: dict[str, str | bytes] | None = None) -> RunResult:
        settings = get_settings()
        timeout = timeout or settings.experiment_timeout

        workdir = os.path.join(os.path.abspath(settings.data_dir), "sandbox", uuid.uuid4().hex)
        os.makedirs(workdir, exist_ok=True)
        script_path = os.path.join(workdir, "experiment.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)

        if files:
            for fname, fcontent in files.items():
                fpath = os.path.join(workdir, fname)
                if isinstance(fcontent, bytes):
                    with open(fpath, "wb") as f:
                        f.write(fcontent)
                else:
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(str(fcontent))

        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", f"{settings.experiment_memory_mb}m",
            "--cpus", "1",
            "--pids-limit", "128",
            "--read-only",
            "--tmpfs", "/tmp:size=64m",
            "-v", f"{workdir}:/work:ro",
            "-w", "/work",
            "--name", f"tejax-exp-{uuid.uuid4().hex[:8]}",
            "python:3.12-slim",
            "python", "experiment.py",
        ]
        t0 = time.time()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout + 20)
                timed_out = False
            except asyncio.TimeoutError:
                timed_out = True
                proc.kill()
                out_b, err_b = await proc.communicate()
            elapsed = time.time() - t0
            stdout, metrics = _extract_metrics((out_b or b"").decode("utf-8", "replace")[:MAX_OUTPUT_CHARS])
            stderr = (err_b or b"").decode("utf-8", "replace")[:MAX_OUTPUT_CHARS]
            _docker_sec = dict(
                sandbox_type="DOCKER",
                network_isolated=True,
                security_warning="Network disabled, read-only root FS, memory-limited.",
            )
            if timed_out:
                return RunResult(False, proc.returncode, stdout, stderr, elapsed, metrics, "Experiment timed out", **_docker_sec)
            if proc.returncode == 0:
                return RunResult(True, proc.returncode, stdout, stderr, elapsed, metrics, **_docker_sec)
            return RunResult(False, proc.returncode, stdout, stderr, elapsed, metrics, _summarize_error(stderr) or f"Exited with code {proc.returncode}", **_docker_sec)
        except FileNotFoundError:
            return RunResult(False, None, "", "", 0.0, {}, "Docker not available on this host", sandbox_type="DOCKER", network_isolated=False, security_warning="Docker daemon not running.")
        finally:
            shutil.rmtree(workdir, ignore_errors=True)


def _summarize_error(stderr: str) -> str | None:
    lines = [line for line in stderr.splitlines() if line.strip()]
    if not lines:
        return None
    return lines[-1][:500]


def build_runner() -> SandboxRunner:
    if get_settings().sandbox_backend.lower() == "docker":
        return DockerRunner()
    return LocalRunner()
