import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"

async function client(records) {
  let source = await readFile("lib/server/findings.ts", "utf8")
  source = source
    .replace('import "server-only"', "")
    .replace(
      'import { listPentests } from "./pentests"',
      "const listPentests = async () => globalThis.__findingTasks"
    )
    .replace(
      'import { readRecord } from "./platform-store"',
      'const readRecord = async (name) => {const value = globalThis.__findingRecords[name]; if(value === "corrupt") throw Error("corrupt"); return value ?? null}'
    )
  globalThis.__findingTasks = ["a", "b", "c"].map((id) => ({
    id,
    targets: ["https://example.test"],
    status: "completed",
  }))
  globalThis.__findingRecords = records
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  return import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  )
}
test("query preserves per-task identities, missing/corrupt counts and unknown severity", async () => {
  const { queryFindings } = await client({
    "pentests/a/results.json": {
      final: true,
      findings: [
        { id: "one", title: "Example", severity: "HIGH" },
        { id: "one", title: "Example", severity: "HIGH" },
        { title: "Unknown", severity: "custom" },
      ],
    },
    "pentests/b/results.json": "corrupt",
  })
  const result = await queryFindings(new URLSearchParams())
  assert.equal(result.total, 2)
  assert.equal(result.summary.high, 1)
  assert.equal(result.summary.unknown, 1)
  assert.equal(result.unavailableTasks, 1)
  assert.equal(result.missingTasks, 1)
  assert.equal(result.findings[0].completeness, "最终结果")
  assert.equal(result.findings[0].location, null)
  const again = await queryFindings(new URLSearchParams())
  assert.deepEqual(
    result.findings.map((f) => f.id),
    again.findings.map((f) => f.id)
  )
  const filtered = await queryFindings(new URLSearchParams("severity=high"))
  assert.equal(filtered.total, 1)
})
test("same native identity across tasks remains independent and legacy completeness is unknown", async () => {
  const { queryFindings } = await client({
    "pentests/a/results.json": { findings: [{ id: "x" }] },
    "pentests/b/results.json": { final: false, findings: [{ id: "x" }] },
  })
  const result = await queryFindings(new URLSearchParams())
  assert.equal(result.total, 2)
  assert.notEqual(result.findings[0].id, result.findings[1].id)
  assert.equal(result.findings[0].completeness, "结果完整性未记录")
  assert.equal(result.findings[1].completeness, "部分结果")
})
