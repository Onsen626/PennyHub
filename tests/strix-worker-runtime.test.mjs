import { test } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)

function python() {
  if (process.env.PENNY_TEST_PYTHON) return process.env.PENNY_TEST_PYTHON
  const venv = "third_party/strix/.venv/bin/python"
  return existsSync(venv) ? venv : "python3"
}

test("runtime check reports a missing Strix checkout without leaking CalledProcessError", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-strix-runtime-"))
  try {
    await assert.rejects(
      run(python(), ["scripts/strix-worker.py", "--check", directory]),
      (error) => {
        assert.equal(error.code, 1)
        assert.match(
          error.stderr,
          /Strix source directory is not a Git checkout/
        )
        assert.doesNotMatch(error.stderr, /CalledProcessError: Command/)
        return true
      }
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
