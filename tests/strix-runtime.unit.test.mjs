import { test, after } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const directory = await mkdtemp(
  path.join(tmpdir(), "penny-strix-runtime-unit-")
)
const source = await readFile("lib/server/strix-runtime.ts", "utf8")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
await writeFile(path.join(directory, "strix-runtime.mjs"), outputText)
const { pickStrixRuntime } = await import(
  pathToFileURL(path.join(directory, "strix-runtime.mjs"))
)
after(() => rm(directory, { recursive: true, force: true }))

const bundledSource = "/repo/third_party/strix"
const bundledPython = "/repo/third_party/strix/.venv/bin/python"

test("a saved runtime whose checkout is gone falls back to the bundled one", () => {
  const selected = pickStrixRuntime({
    installed: {
      sourcePath: "/tmp/strix-achievements-repo",
      python: "/tmp/strix-achievements-repo/.venv/bin/python",
    },
    installedUsable: false,
    bundledSource,
  })
  assert.deepEqual(selected, {
    sourcePath: bundledSource,
    executable: bundledPython,
  })
})

test("a usable saved runtime is used as a whole", () => {
  const selected = pickStrixRuntime({
    installed: {
      sourcePath: "/opt/strix",
      python: "/opt/strix/.venv/bin/python",
    },
    installedUsable: true,
    bundledSource,
  })
  assert.deepEqual(selected, {
    sourcePath: "/opt/strix",
    executable: "/opt/strix/.venv/bin/python",
  })
})

test("an explicit source uses that checkout's interpreter", () => {
  const selected = pickStrixRuntime({
    envSource: "/opt/explicit",
    installed: {
      sourcePath: "/opt/strix",
      python: "/opt/strix/.venv/bin/python",
    },
    installedUsable: true,
    bundledSource,
  })
  assert.deepEqual(selected, {
    sourcePath: "/opt/explicit",
    executable: "/opt/explicit/.venv/bin/python",
  })
})

test("an explicit interpreter wins and keeps a usable source for PYTHONPATH", () => {
  const selected = pickStrixRuntime({
    envPython: "/usr/bin/python3",
    installed: {
      sourcePath: "/opt/strix",
      python: "/opt/strix/.venv/bin/python",
    },
    installedUsable: true,
    bundledSource,
  })
  assert.deepEqual(selected, {
    sourcePath: "/opt/strix",
    executable: "/usr/bin/python3",
  })
})

test("an explicit interpreter with a stale saved runtime uses the bundled source", () => {
  const selected = pickStrixRuntime({
    envPython: "/usr/bin/python3",
    installed: {
      sourcePath: "/tmp/strix-achievements-repo",
      python: "/tmp/strix-achievements-repo/.venv/bin/python",
    },
    installedUsable: false,
    bundledSource,
  })
  assert.deepEqual(selected, {
    sourcePath: bundledSource,
    executable: "/usr/bin/python3",
  })
})
