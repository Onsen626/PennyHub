"""Exercise the real worker's SIGTERM path with a fake Strix package.

The harness replaces the Strix modules the worker imports, sends SIGTERM while
the scan is running, and verifies that the runner's cleanup and the report
cleanup both ran before the worker published `stopped`.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import importlib.util
import io
import json
import os
import signal
import sys
import threading
import types
from pathlib import Path


def install(name: str, **attributes: object) -> None:
    module = types.ModuleType(name)
    for key, value in attributes.items():
        setattr(module, key, value)
    sys.modules[name] = module


def install_package(name: str) -> None:
    install(name, __path__=[])


class AgentCoordinator:
    async def snapshot(self) -> dict[str, dict[str, object]]:
        return {"names": {}, "parent_of": {}, "statuses": {}, "errors": {}}


class ReportState:
    def __init__(self, scan_id: str) -> None:
        global REPORT
        REPORT = self
        self.scan_id = scan_id
        self.vulnerability_reports: list[object] = []
        self.final_scan_result = None
        self.run_record: dict[str, object] = {}
        self.scan_ended_exit_reason = None

    def set_scan_config(self, config: dict[str, object]) -> None:
        self.config = config

    def save_run_data(self, status: str | None = None) -> None:
        self.saved_status = status

    def cleanup(self, status: str = "stopped") -> None:
        (DIRECTORY / "report-cleaned").write_text(status, encoding="utf-8")


CAPTURED: dict[str, object] = {}


async def run_strix_scan(**kwargs: object) -> None:
    CAPTURED.update(kwargs)
    if len(sys.argv) > 2 and sys.argv[2] == "events":
        @dataclass
        class Agent:
            name: str
            lock: object

        @dataclass
        class Item:
            agent: object
            def to_input_item(self):
                return {"type": "function_call", "name": "terminal", "arguments": "fixture-secret"}

        @dataclass
        class Event:
            name: str
            item: object
            type: str = "run_item_stream_event"

        kwargs["event_sink"]("root-agent", Event("tool_called", Item(Agent("Root", threading.Lock()))))
        kwargs["event_sink"]("root-agent", {"type": "plain", "text": "fixture-secret"})
        REPORT.run_record["status"] = "completed"
        REPORT.final_scan_result = "Fixture completed"
        return
    try:
        await asyncio.sleep(60)
    finally:
        # This stands in for Strix tearing its sandbox down on cancellation.
        (DIRECTORY / "runner-cleaned").write_text("yes", encoding="utf-8")


DIRECTORY = Path(sys.argv[1]).resolve()
DIRECTORY.mkdir(parents=True, exist_ok=True)

install_package("strix")
install("strix.config", load_settings=lambda: object())
install_package("strix.core")
install("strix.core.agents", AgentCoordinator=AgentCoordinator)
install("strix.core.runner", run_strix_scan=run_strix_scan)
install_package("strix.interface")
install(
    "strix.interface.scan_setup",
    build_targets_info=lambda args: setattr(
        args, "targets_info", list(getattr(args, "target", []))
    ),
)
install(
    "strix.interface.utils",
    collect_local_sources=lambda targets: [],
    stage_api_specs=lambda targets, scan_id: [],
)
install_package("strix.report")
install(
    "strix.report.state",
    ReportState=ReportState,
    set_global_report_state=lambda report: None,
)

spec = importlib.util.spec_from_file_location(
    "strix_worker", "scripts/strix-worker.py"
)
worker_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(worker_module)
worker_module.check_runtime = lambda source: {"image": "fake-image"}

payload = {
    "credentials": {"customInstructions": "fixture-secret"},
    "executionId": "worker-stop-fixture",
    "directory": str(DIRECTORY),
    "sourcePath": str(DIRECTORY),
    "slot": str(DIRECTORY / "slot.json"),
    "maxTurns": 5,
    "task": {
        "id": "00000000-0000-4000-8000-000000000000",
        "targets": ["http://127.0.0.1:9"],
        "apiSpecTargets": [],
        "apiSpecPaths": [],
        "referenceFiles": [],
        "scanMode": "quick",
        "context": {},
    },
}
sys.stdin = io.StringIO(json.dumps(payload))
if len(sys.argv) < 3:
    threading.Timer(0.6, lambda: os.kill(os.getpid(), signal.SIGTERM)).start()

code = worker_module.main()
if code != 0:
    print(f"worker exited with {code}", file=sys.stderr)
    raise SystemExit(2)

if len(sys.argv) > 2:
    raise SystemExit(0)

runtime = json.loads((DIRECTORY / "execution-events.jsonl").read_text(encoding="utf-8").splitlines()[-1])
for name in ("runner-cleaned", "report-cleaned"):
    if not (DIRECTORY / name).exists():
        print(f"missing {name}", file=sys.stderr)
        raise SystemExit(3)
if runtime.get("status") != "stopped":
    print(f"unexpected status: {runtime.get('status')}", file=sys.stderr)
    raise SystemExit(4)
if runtime.get("phase") != "stopped_by_user":
    print(f"unexpected phase: {runtime.get('phase')}", file=sys.stderr)
    raise SystemExit(5)
if "max_budget_usd" in CAPTURED or "budget_policy" in CAPTURED:
    print(f"budget arguments still forwarded: {sorted(CAPTURED)}", file=sys.stderr)
    raise SystemExit(6)
print("worker stopped cleanly")
