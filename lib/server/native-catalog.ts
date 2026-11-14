import "server-only"
import { readCatalogUsage } from "./native-catalog-usage"
import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { homedir } from "node:os"
import type { NativeCatalogItem } from "@/lib/native-catalog"
import { readRecord } from "./platform-store"
import { pickStrixRuntime, type InstalledStrixRuntime } from "./strix-runtime"

export async function readNativeCatalog(parameters: URLSearchParams) {
  const installed =
    await readRecord<InstalledStrixRuntime>("strix-runtime.json")
  let installedUsable = false
  if (installed) {
    try {
      await access(installed.sourcePath)
      await access(installed.python)
      installedUsable = true
    } catch {
      /* Missing runtime falls back to the bundled source. */
    }
  }
  const { sourcePath, executable } = pickStrixRuntime({
    installed,
    installedUsable,
    envSource: process.env.PENNY_STRIX_SOURCE,
    envPython: process.env.PENNY_STRIX_PYTHON,
    bundledSource: path.resolve("third_party/strix"),
  })
  const project = await readFile(
    path.join(sourcePath, "pyproject.toml"),
    "utf8"
  )
  let commit: string
  let gitCheckout = false
  try {
    await access(path.join(sourcePath, ".git"))
    gitCheckout = true
  } catch {
    /* Bundled sources carry a pinned commit marker. */
  }
  if (gitCheckout) {
    commit = (
      await promisify(execFile)(
        "git",
        ["-C", sourcePath, "rev-parse", "HEAD"],
        { timeout: 10000 }
      )
    ).stdout.trim()
  } else {
    commit = (
      await readFile(path.join(sourcePath, "STRIX_COMMIT"), "utf8")
    ).trim()
  }
  let catalogPython = process.env.PENNY_CATALOG_PYTHON || executable
  if (!process.env.PENNY_CATALOG_PYTHON) {
    try {
      await access(executable)
    } catch {
      catalogPython = "python3"
    }
  }
  const { stdout } = await promisify(execFile)(
    catalogPython,
    [path.resolve("scripts/strix-catalog.py"), sourcePath],
    { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }
  )
  const items: NativeCatalogItem[] = JSON.parse(stdout)
  const root = path.join(sourcePath, "strix/skills")
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith("__")) continue
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        entry.name !== "README.md"
      ) {
        const relative = path.relative(root, full).split(path.sep).join("/")
        const category = relative.includes("/")
          ? relative.split("/")[0]
          : "root"
        items.push({
          id: `skill:${relative}`,
          kind: "skill",
          name: entry.name.slice(0, -3),
          category,
          content: await readFile(full, "utf8"),
          source: `strix/skills/${relative}`,
          selectable: !["scan_modes", "coordination", "analysis"].includes(
            category
          ),
          environment: "unverified",
          evidence: "source_definition",
        })
      }
    }
  }
  await walk(root)
  for (const skill of items.filter(
    (item) => item.kind === "skill" && item.category === "tooling"
  )) {
    items.push({
      ...skill,
      id: `program:${skill.name}`,
      kind: "tool",
      category: "sandbox_program",
      selectable: false,
      evidence: "tooling_reference",
    })
  }
  const mcp = await readMcpConfiguration()
  items.push(...mcp.items)
  const query = (parameters.get("q") || "").toLowerCase()
  const taskVersion = parameters.get("taskId")
    ? await readRecord<{ commit?: string }>(
        `pentests/${parameters.get("taskId")}/runtime-version.json`
      )
    : null
  const taskSource =
    typeof taskVersion?.commit === "string"
      ? { commit: taskVersion.commit }
      : null
  const sourceMatchesTask = taskSource ? taskSource.commit === commit : null
  const { discoveredTools, ...usageData } = await readCatalogUsage(
    parameters.get("taskId"),
    sourceMatchesTask === false ? [] : items
  )
  if (sourceMatchesTask !== false) {
    for (const tool of discoveredTools) {
      const index = items.findIndex((item) => item.id === tool.id)
      if (index >= 0) items[index] = tool
      else items.push(tool)
    }
  } else
    usageData.usage = usageData.usage.map((entry) => ({
      ...entry,
      itemId: null,
    }))
  return {
    source: {
      commit,
      version: project.match(/^version\s*=\s*"([^"]+)"/m)?.[1] || "unknown",
    },
    items: items
      .filter(
        (item) =>
          (!parameters.get("kind") || item.kind === parameters.get("kind")) &&
          (!parameters.get("category") ||
            item.category === parameters.get("category")) &&
          (!parameters.get("id") || item.id === parameters.get("id")) &&
          `${item.name} ${item.category}`.toLowerCase().includes(query)
      )
      .sort((a, b) => a.id.localeCompare(b.id)),
    ...usageData,
    taskSource,
    sourceMatchesTask,
    mcp: { connections: mcp.connections, status: mcp.status },
  }
}

async function readMcpConfiguration() {
  const file =
    process.env.STRIX_MCP_CONFIG ||
    path.join(homedir(), ".strix/mcp-servers.json")
  const items: NativeCatalogItem[] = []
  const connections: string[] = []
  try {
    const raw: unknown = JSON.parse(await readFile(file, "utf8"))
    if (!Array.isArray(raw)) return { items, connections, status: "invalid" }
    const only = (process.env.STRIX_MCP_ONLY || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    const exclude = (process.env.STRIX_MCP_EXCLUDE || "")
      .split(",")
      .map((value) => value.trim())
    for (const config of raw) {
      if (
        !config ||
        typeof config.name !== "string" ||
        !config.name ||
        connections.includes(config.name)
      )
        continue
      if (
        (only.length && !only.includes(config.name)) ||
        exclude.includes(config.name)
      )
        continue
      const transport = config.transport || "http"
      if (
        transport === "http"
          ? typeof config.url !== "string" || !config.url
          : transport !== "stdio" ||
            typeof config.command !== "string" ||
            !config.command
      )
        continue
      connections.push(config.name)
      for (const name of Array.isArray(config.allowed_tools)
        ? config.allowed_tools
        : []) {
        if (typeof name !== "string" || !name) continue
        items.push({
          id: `mcp:${config.name}/${name}`,
          kind: "tool",
          name: `${config.name}/${name}`,
          category: "mcp_tool",
          content: "MCP 配置声明的工具，尚未连接服务器核验工具清单。",
          source: "MCP 配置 allowed_tools",
          selectable: false,
          environment: "unverified",
          evidence: "configuration",
          connection: config.name,
          toolName: name,
        })
      }
    }
    return { items, connections, status: "read" }
  } catch (error) {
    return {
      items,
      connections,
      status:
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? "absent"
          : "unreadable",
    }
  }
}
