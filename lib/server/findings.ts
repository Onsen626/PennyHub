import "server-only"
import { createHash } from "node:crypto"
import { listPentests } from "./pentests"
import { readRecord } from "./platform-store"
import type { Finding, FindingQuery } from "@/lib/findings"

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null
export async function readTaskResults(id: string) {
  const raw = await readRecord<Record<string, unknown>>(
    `pentests/${id}/results.json`
  )
  if (
    raw &&
    (!Array.isArray(raw.findings) ||
      raw.findings.some((f) => !f || typeof f !== "object" || Array.isArray(f)))
  )
    throw new Error("Invalid findings snapshot")
  return raw
}
export async function queryFindings(
  params: URLSearchParams
): Promise<FindingQuery> {
  const tasks = await listPentests()
  const all: Finding[] = []
  let unavailableTasks = 0,
    missingTasks = 0
  for (const task of tasks) {
    if (params.get("task") && params.get("task") !== task.id) continue
    if (
      params.get("target") &&
      !task.targets.some((t) =>
        t.toLowerCase().includes(params.get("target")!.toLowerCase())
      )
    )
      continue
    try {
      const raw = await readTaskResults(task.id)
      if (!raw) {
        missingTasks++
        continue
      }
      const seen = new Set<string>()
      for (const f of raw.findings as Record<string, unknown>[]) {
        const nativeId = text(f.id)
        const key =
          nativeId ?? createHash("sha256").update(canonical(f)).digest("hex")
        const id = `${task.id}:${key}`
        if (seen.has(id)) continue
        seen.add(id)
        const originalSeverity = text(f.severity)
        const severity = ["critical", "high", "medium", "low", "info"].includes(
          originalSeverity?.toLowerCase() ?? ""
        )
          ? originalSeverity!.toLowerCase()
          : "unknown"
        const finding: Finding = {
          id,
          taskId: task.id,
          nativeId,
          title: text(f.title) ?? "未命名发现",
          severity,
          originalSeverity,
          targets: task.targets,
          location: text(f.endpoint) ?? text(f.location),
          description: text(f.description),
          taskStatus: task.status,
          completeness:
            raw.final === true
              ? "最终结果"
              : raw.final === false
                ? "部分结果"
                : "结果完整性未记录",
          independentlyVerified:
            typeof raw.independentlyVerified === "boolean"
              ? raw.independentlyVerified
              : null,
        }
        if (params.get("severity") && params.get("severity") !== severity)
          continue
        if (
          params.get("q") &&
          !finding.title.toLowerCase().includes(params.get("q")!.toLowerCase())
        )
          continue
        if (params.get("id") && params.get("id") !== id) continue
        all.push(finding)
      }
    } catch {
      unavailableTasks++
    }
  }
  const summary: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    unknown: 0,
  }
  for (const f of all) summary[f.severity]++
  const n = Number(params.get("page") || 1)
  const page = Number.isSafeInteger(n) && n > 0 ? n : 1
  return {
    findings: all.slice((page - 1) * 25, page * 25),
    total: all.length,
    page,
    pageSize: 25,
    summary,
    queriedAt: new Date().toISOString(),
    unavailableTasks,
    missingTasks,
  }
}
