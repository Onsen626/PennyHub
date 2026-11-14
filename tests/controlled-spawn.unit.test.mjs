import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const WRAPPER = path.normalize("lib/server/controlled-spawn.ts")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js"])

async function sourceFiles(root) {
  const files = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".next"))
        continue
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(full)
    }
  }
  await walk(root)
  return files
}

test("detached children and raw spawn imports stay inside the wrapper", async () => {
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("lib")),
    ...(await sourceFiles("components")),
  ]
  for (const file of files) {
    if (path.normalize(file) === WRAPPER) continue
    const source = await readFile(file, "utf8")
    assert.doesNotMatch(
      source,
      /detached\s*:\s*true/,
      `${file} detaches a child outside the controlled wrapper`
    )
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*\bspawn\b[^}]*\}\s*from\s*["'](?:node:)?child_process["']/,
      `${file} must spawn through lib/server/controlled-spawn.ts`
    )
  }
  for (const file of await sourceFiles("scripts")) {
    const source = await readFile(file, "utf8")
    assert.doesNotMatch(
      source,
      /detached\s*:\s*true/,
      `${file} detaches a child outside the controlled wrapper`
    )
  }
})

const directory = await mkdtemp(path.join(tmpdir(), "penny-controlled-spawn-"))
const wrapperSource = (
  await readFile(WRAPPER, "utf8")
).replace('import "server-only"', "")
const { outputText } = ts.transpileModule(wrapperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
await writeFile(path.join(directory, "controlled-spawn.mjs"), outputText)
const { spawnWorkerProcess, spawnProcess } = await import(
  pathToFileURL(path.join(directory, "controlled-spawn.mjs"))
)
test.after(() => rm(directory, { recursive: true, force: true }))

function groupId(pid) {
  return Number(
    execFileSync("ps", ["-o", "pgid=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim()
  )
}

test("the worker wrapper detaches into its own group and carries the run label", async () => {
  const output = path.join(directory, "worker.json")
  const child = spawnWorkerProcess(
    process.execPath,
    [
      "-e",
      `require("node:fs").writeFileSync(${JSON.stringify(
        output
      )}, JSON.stringify({ pid: process.pid, run: process.env.STRIX_RUN_ID, type: process.env.STRIX_RUN_TYPE })); setInterval(() => {}, 1000)`,
    ],
    { env: process.env, runId: "task-123" }
  )
  try {
    let info
    for (let attempt = 0; attempt < 50 && !info; attempt += 1) {
      try {
        info = JSON.parse(await readFile(output, "utf8"))
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    assert.ok(info, "worker did not report its identity")
    assert.equal(info.run, "task-123")
    assert.equal(info.type, "pennyagent")
    assert.equal(groupId(info.pid), info.pid, "worker must lead its own group")
  } finally {
    try {
      process.kill(-child.pid, "SIGKILL")
    } catch {
      child.kill("SIGKILL")
    }
  }
})

test("the non-detached wrapper overrides a rogue detached option", async () => {
  const child = spawnProcess(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)"],
    { detached: true, stdio: "ignore" }
  )
  try {
    await new Promise((resolve) => child.once("spawn", resolve))
    assert.equal(groupId(child.pid), groupId(process.pid))
  } finally {
    child.kill("SIGKILL")
  }
})
