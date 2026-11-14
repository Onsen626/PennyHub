import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const directory = await mkdtemp(path.join(tmpdir(), "penny-sandbox-unit-"))
const source = (
  await readFile("lib/server/strix-sandbox.ts", "utf8")
).replace('import "server-only"', "")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
await writeFile(path.join(directory, "strix-sandbox.mjs"), outputText)
const { reapStrixSandbox } = await import(
  pathToFileURL(path.join(directory, "strix-sandbox.mjs"))
)
test.after(() => rm(directory, { recursive: true, force: true }))

test("removes containers that carry the task's run label", async () => {
  const calls = []
  const runner = async (command, args) => {
    calls.push([command, ...args])
    return { stdout: args[0] === "ps" ? "abc123\ndef456\n" : "" }
  }
  await reapStrixSandbox("task-1", runner)
  assert.deepEqual(calls, [
    ["docker", "ps", "-aq", "--filter", "label=strix-run-id=task-1"],
    ["docker", "rm", "-f", "abc123", "def456"],
  ])
})

test("does nothing when no labelled container is left", async () => {
  const calls = []
  const runner = async (command, args) => {
    calls.push([command, ...args])
    return { stdout: "  \n" }
  }
  await reapStrixSandbox("task-1", runner)
  assert.deepEqual(calls, [
    ["docker", "ps", "-aq", "--filter", "label=strix-run-id=task-1"],
  ])
})

test("dockerd being unavailable never fails the stop", async () => {
  await reapStrixSandbox("task-1", async () => {
    throw new Error("docker: command not found")
  })
})

test("a failed rm never fails the stop", async () => {
  await reapStrixSandbox("task-1", async (_command, args) => {
    if (args[0] === "ps") return { stdout: "abc123\n" }
    throw new Error("container is in use")
  })
})
