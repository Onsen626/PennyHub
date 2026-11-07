import { test } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)

test("runtime check reports a missing Strix checkout without leaking CalledProcessError", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-strix-runtime-"))
  try {
    await assert.rejects(
      run("python3", ["scripts/strix-worker.py", "--check", directory]),
      (error) => {
        assert.equal(error.code, 1)
        assert.match(error.stderr, /Strix source directory is not a Git checkout/)
        assert.doesNotMatch(error.stderr, /CalledProcessError: Command/)
        return true
      }
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
