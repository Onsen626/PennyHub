"""Detached adapter for the pinned native Strix runner; reads one JSON input on stdin."""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import dataclasses
import hashlib
import importlib.metadata
import json
import os
import re
import subprocess
import sys
import tomllib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

COMMIT = "09536cf1481731c790995bd8060db19a3b75ff48"
LOCK_SHA256 = "e82b68f2d9ff70695843e43ce932b8c4ecb90551e1b0c2fff4b82d45248af36d"


def now() -> str:
    return datetime.now(UTC).isoformat()


def check_runtime(source: Path) -> dict[str, Any]:
    try:
        commit = subprocess.check_output(
            ["git", "-C", str(source), "rev-parse", "HEAD"],
            text=True,
            stderr=subprocess.PIPE,
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError) as error:
        raise RuntimeError(
            f"Strix source directory is not a Git checkout: {source}"
        ) from None
    lockfile = source / "uv.lock"
    if not lockfile.is_file():
        raise RuntimeError(f"Strix dependency lock is missing: {lockfile}")
    if commit != COMMIT or hashlib.sha256(lockfile.read_bytes()).hexdigest() != LOCK_SHA256:
        raise RuntimeError("Strix source revision or dependency lock differs from the pinned version")
    try:
        subprocess.run(
            ["git", "-C", str(source), "diff", "--quiet", "HEAD", "--", "strix", "pyproject.toml", "uv.lock"],
            check=True,
            stderr=subprocess.PIPE,
        )
    except subprocess.CalledProcessError as error:
        raise RuntimeError("Strix source or dependency files have local changes") from None
    canonical = lambda name: re.sub(r"[-_.]+", "-", name.lower())
    locked: dict[str, set[str]] = {}
    for package in tomllib.loads((source / "uv.lock").read_text())["package"]:
        if package.get("version"):
            locked.setdefault(canonical(package["name"]), set()).add(package["version"])
    dependencies = {canonical(distribution.metadata["Name"]): distribution.version for distribution in importlib.metadata.distributions()}
    core = {"openai-agents", "openai", "litellm", "docker"}
    if not core.issubset(dependencies) or any(actual not in locked.get(name, set()) for name, actual in dependencies.items()):
        raise RuntimeError("Installed runtime dependencies differ from uv.lock; run uv sync --frozen in the configured environment")
    fingerprint = hashlib.sha256(json.dumps(dependencies, sort_keys=True).encode()).hexdigest()
    sys.path.insert(0, str(source))
    from strix.config import load_settings
    from strix.core.runner import run_strix_scan  # noqa: F401
    import docker

    settings = load_settings()
    client = docker.from_env(timeout=10)
    try:
        client.ping()
        image = client.images.get(settings.runtime.image)
        return {"commit": commit, "lockSha256": LOCK_SHA256, "dependencies": dependencies, "dependencyFingerprint": fingerprint, "image": image.id, "imageTag": settings.runtime.image}
    finally:
        client.close()


class Worker:
    def __init__(self, payload: dict[str, Any]):
        self.payload = payload
        self.directory = Path(payload["directory"])
        self.task = payload["task"]
        self.started = now()
        self.state = {"status": "preparing", "phase": "runtime_check", "pid": os.getpid(), "startedAt": self.started, "updatedAt": self.started, "runName": self.task["id"]}
        if payload.get("source"):
            self.state["source"] = payload["source"]
        self.secrets = [os.environ.get("LLM_API_KEY", "")]
        credentials = payload.get("credentials") or {}
        for identity in credentials.get("identities", []):
            self.secrets.extend(str(identity.get(key, "")) for key in ("username", "password", "cookie", "loginInstructions"))
        self.secrets.extend(str(header.get("value", "")) for header in credentials.get("headers", []))
        self.secrets = sorted({value for value in self.secrets if value}, key=len, reverse=True)

    def scrub(self, value: Any) -> Any:
        if isinstance(value, str):
            for secret in self.secrets:
                value = value.replace(secret, "[REDACTED]")
            return value
        if isinstance(value, dict):
            return {key: self.scrub(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [self.scrub(item) for item in value]
        return value

    def save(self, name: str, value: Any) -> None:
        destination = self.directory / name
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        temporary.write_text(json.dumps(self.scrub(value), ensure_ascii=False, default=str), encoding="utf-8")
        temporary.replace(destination)

    def status(self, phase: str, status: str | None = None, error: str | None = None) -> None:
        self.state.update(phase=phase, updatedAt=now())
        if status:
            self.state["status"] = status
        if error:
            self.state["error"] = self.scrub(error)
        if self.state["status"] in {"completed", "failed", "interrupted", "stopped"}:
            self.state["endedAt"] = now()
        self.save("runtime.json", self.state)
        self.event("status", {"phase": phase, "status": self.state["status"]})

    def event(self, kind: str, data: Any, agent_id: str | None = None) -> None:
        if dataclasses.is_dataclass(data) and not isinstance(data, type):
            data = dataclasses.asdict(data)
        elif hasattr(data, "model_dump"):
            data = data.model_dump(mode="json")
        record = self.scrub({"at": now(), "type": kind, "agentId": agent_id, "data": data})
        with (self.directory / "events.jsonl").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")

    async def run(self) -> None:
        self.status("runtime_check")
        metadata = check_runtime(Path(self.payload["sourcePath"]))
        self.save("runtime-version.json", metadata)
        from strix.config import load_settings
        from strix.core.agents import AgentCoordinator
        from strix.core.runner import run_strix_scan
        from strix.interface.scan_setup import build_targets_info
        from strix.interface.utils import collect_local_sources
        from strix.report.state import ReportState, set_global_report_state

        targets = list(self.task["targets"])
        args = argparse.Namespace(target=targets, target_list=[])
        build_targets_info(args)
        local_sources = collect_local_sources(args.targets_info)
        instructions = "\n\n".join(f"{key}: {value}" for key, value in self.task["context"].items() if value)
        extra_files = []
        for index, file in enumerate(self.task["referenceFiles"]):
            origin = Path(file)
            destination = f"reference/{index}-{origin.name}"
            extra_files.append({"workspace_path": destination, "content": origin.read_bytes()})
            instructions += f"\nReference document: /workspace/{destination}"
        if self.payload.get("credentials"):
            extra_files.append({"workspace_path": "penny-access.json", "content": json.dumps(self.payload["credentials"]).encode()})
            instructions += "\nUser-provided test identities and custom request headers are in /workspace/penny-access.json. Never include their secrets in reports."
        config = {"scan_id": self.task["id"], "run_name": self.task["id"], "targets": args.targets_info, "user_instructions": instructions, "scan_mode": self.task["scanMode"], "non_interactive": True, "local_sources": local_sources, "scope_mode": "full", "diff_scope": {"active": False}}
        report = ReportState(self.task["id"])
        set_global_report_state(report)
        report.set_scan_config(config)
        report.save_run_data()
        coordinator = AgentCoordinator()
        done = asyncio.Event()

        async def snapshot() -> None:
            graph = await coordinator.snapshot()
            self.save("results.json", {"agents": [{"id": agent_id, "name": graph["names"].get(agent_id), "parentId": graph["parent_of"].get(agent_id), "status": status, "error": graph["errors"].get(agent_id)} for agent_id, status in graph["statuses"].items()], "findings": report.vulnerability_reports, "summary": report.final_scan_result, "usage": report.run_record.get("llm_usage"), "independentlyVerified": False})

        async def project_results() -> None:
            while not done.is_set():
                await snapshot()
                try:
                    await asyncio.wait_for(done.wait(), timeout=1)
                except TimeoutError:
                    pass

        self.status("starting_native_runner", "running")
        projection = asyncio.create_task(project_results())
        try:
            await run_strix_scan(scan_config=config, scan_id=self.task["id"], image=metadata["image"], local_sources=local_sources, extra_files=extra_files, coordinator=coordinator, interactive=False, max_turns=self.payload["maxTurns"], max_budget_usd=self.payload["maxBudgetUsd"], budget_policy="stop", status_sink=self.status, event_sink=lambda agent_id, event: self.event("agent_event", event, agent_id))
            # The native finish_scan tool determines completion, not process exit 0.
            completed = report.run_record.get("status") == "completed"
            report.cleanup(status="stopped")
            reason = getattr(report, "scan_ended_exit_reason", None) or ("completed" if completed else "native_run_stopped")
            self.status(str(reason), "completed" if completed else "stopped")
        finally:
            done.set()
            await projection
            await snapshot()

    def release(self) -> None:
        slot = Path(self.payload["slot"])
        with contextlib.suppress(FileNotFoundError, ValueError):
            owner = json.loads(slot.read_text())
            if owner.get("taskId") == self.task["id"]:
                slot.unlink()


class RedactedLog:
    def __init__(self, worker: Worker):
        self.worker = worker

    def write(self, value: str) -> int:
        with (self.worker.directory / "worker.log").open("a", encoding="utf-8") as stream:
            stream.write(self.worker.scrub(value))
        return len(value)

    def flush(self) -> None:
        pass

    def isatty(self) -> bool:
        return False


def main() -> int:
    os.umask(0o077)
    if len(sys.argv) == 3 and sys.argv[1] == "--check":
        print(json.dumps(check_runtime(Path(sys.argv[2]))))
        return 0
    worker = Worker(json.load(sys.stdin))
    log = RedactedLog(worker)
    try:
        with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
            asyncio.run(worker.run())
        return 0
    except BaseException as error:
        worker.status("native_runner_failed", "failed", f"{type(error).__name__}: {error}")
        return 1
    finally:
        worker.release()


if __name__ == "__main__":
    raise SystemExit(main())
