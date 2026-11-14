import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

// Prefer the pinned interpreter when the optional Strix venv exists locally;
// CI installs Python 3.12 and has no venv, which also supports tomllib.
function python() {
  if (process.env.PENNY_TEST_PYTHON) return process.env.PENNY_TEST_PYTHON
  const venv = "third_party/strix/.venv/bin/python"
  return existsSync(venv) ? venv : "python3"
}

test("SIGTERM makes the worker run the Strix cleanup path and publish stopped", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-worker-stop-"))
  try {
    const result = spawnSync(
      python(),
      ["tests/helpers/strix-worker-stop-harness.py", directory],
      { encoding: "utf8", timeout: 30000 }
    )
    assert.equal(
      result.status,
      0,
      `harness failed: ${result.stderr}${result.stdout}`
    )

    const runtime = JSON.parse(
      (await readFile(path.join(directory, "execution-events.jsonl"), "utf8"))
        .trim()
        .split("\n")
        .at(-1)
    )
    assert.equal(runtime.status, "stopped")
    assert.equal(runtime.phase, "stopped_by_user")
    // The runner teardown runs first, then the worker's own report cleanup.
    assert.ok(existsSync(path.join(directory, "runner-cleaned")))
    assert.ok(existsSync(path.join(directory, "report-cleaned")))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("worker preserves tool events containing native agent locks and redacts credentials", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-worker-events-"))
  try {
    const result = spawnSync(
      python(),
      ["tests/helpers/strix-worker-stop-harness.py", directory, "events"],
      { encoding: "utf8", timeout: 30000 }
    )
    assert.equal(result.status, 0, result.stderr)
    const text = await readFile(path.join(directory, "events.jsonl"), "utf8")
    const events = text.trim().split("\n").map(JSON.parse)
    const tool = events.find((event) => event.data?.name === "tool_called")
    assert.equal(tool?.data.item.raw_item.name, "terminal")
    assert.equal(tool?.data.item.raw_item.arguments, "[REDACTED]")
    assert.equal(tool?.agentId, "root-agent")
    assert.equal(tool?.executionId, "worker-stop-fixture")
    assert.doesNotMatch(text, /fixture-secret|_thread.lock/)
    const results = JSON.parse(
      await readFile(path.join(directory, "results.json"), "utf8")
    )
    assert.equal(results.final, true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
