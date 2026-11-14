import "server-only"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import path from "node:path"
import { dataDirectory } from "./platform-store"
import type { NativeCatalogItem, NativeUsage } from "@/lib/native-catalog"

type RecordValue = Record<string, unknown>
function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {}
}

function toolCall(event: RecordValue) {
  const data = record(event.data)
  if (data.type === "run_item_stream_event" && data.name === "tool_called") {
    const raw = record(record(data.item).raw_item)
    if (typeof raw.name === "string")
      return { ...raw, action: "called" as const }
  }
  if (data.type !== "raw_response_event") return null
  const raw = record(data.data)
  if (raw.type === "response.output_item.done") {
    const item = record(raw.item)
    if (item.type === "function_call" && typeof item.name === "string")
      return { ...item, action: "requested" as const }
  }
  // Older worker versions persisted nested SDK models using their Python repr.
  // Read only the completed function-call identity, never evaluate the repr.
  if (
    typeof data.data === "string" &&
    data.data.startsWith("ResponseOutputItemDoneEvent(")
  ) {
    const identity = data.data.match(
      /call_id='([\w-]+)', name='([\w-]+)', type='function_call'/
    )
    if (identity)
      return {
        name: identity[2],
        call_id: identity[1],
        action: "requested" as const,
      }
  }
  return null
}

export async function readCatalogUsage(
  taskId: string | null,
  items: NativeCatalogItem[]
): Promise<{
  usage: NativeUsage[]
  discoveredTools: NativeCatalogItem[]
  usageStatus: "not_selected" | "read" | "missing" | "unreadable"
}> {
  if (!taskId)
    return { usage: [], discoveredTools: [], usageStatus: "not_selected" }
  const usage: NativeUsage[] = []
  const discoveredTools: NativeCatalogItem[] = []
  const requests = new Map<string, { name: string; args: RecordValue }>()
  const records = new Map<string, NativeUsage>()
  function save(key: string, entry: NativeUsage) {
    const previous = records.get(key)
    if (previous) Object.assign(previous, entry)
    else {
      records.set(key, entry)
      usage.push(entry)
    }
  }
  let index = 0
  const lines = createInterface({
    input: createReadStream(
      path.join(dataDirectory(), "pentests", taskId, "events.jsonl")
    ),
    crlfDelay: Infinity,
  })
  try {
    for await (const line of lines) {
      const eventIndex = index++
      let event: RecordValue
      try {
        event = record(JSON.parse(line))
      } catch {
        continue
      }
      if (event.type !== "agent_event") continue
      const data = record(event.data)
      if (
        data.type === "run_item_stream_event" &&
        data.name === "tool_output"
      ) {
        const item = record(data.item)
        const raw = record(item.raw_item)
        const callId = raw.call_id
        const agentId = typeof event.agentId === "string" ? event.agentId : null
        const request =
          typeof callId === "string"
            ? requests.get(`${agentId}:${callId}`)
            : null
        if (
          request &&
          typeof callId === "string" &&
          ["search_mcp_tools", "get_mcp_tool_schema"].includes(request.name)
        ) {
          let output: RecordValue = {}
          try {
            const value = item.output ?? raw.output
            output = record(
              typeof value === "string" ? JSON.parse(value) : value
            )
          } catch {
            /* Failed or unstructured output does not establish a catalog. */
          }
          const connection = request.args.connection
          const matches =
            request.name === "search_mcp_tools" ? output.matches : [output]
          if (
            typeof connection === "string" &&
            output.connection === connection &&
            Array.isArray(matches)
          ) {
            for (const match of matches) {
              const name = record(match).name
              if (typeof name !== "string" || !name) continue
              const id = `mcp:${connection}/${name}`
              if (discoveredTools.some((tool) => tool.id === id)) continue
              discoveredTools.push({
                id,
                kind: "tool",
                name: `${connection}/${name}`,
                category: "mcp_tool",
                content: `所选任务通过 ${request.name} 返回了该工具名称。未读取远端工具的凭据、描述或输入内容；当前环境可用性尚未核验。`,
                source: `pentests/${taskId}/events.jsonl#event=${eventIndex + 1}`,
                selectable: false,
                environment: "unverified",
                evidence: "task_discovery",
                connection,
                toolName: name,
                observation: { taskId, agentId, eventIndex, callId },
              })
            }
          }
        }
        continue
      }
      const call: RecordValue | null = toolCall(event)
      if (!call) continue
      const name = String(call.name)
      const callId = typeof call.call_id === "string" ? call.call_id : null
      const agentId = typeof event.agentId === "string" ? event.agentId : null
      const key = callId ? `${agentId}:${callId}` : `event:${eventIndex}`
      if (records.get(key)?.action === "called" && call.action !== "called")
        continue
      const item = items.find((entry) => entry.id === `function:${name}`)
      const entry: NativeUsage = {
        taskId,
        agentId,
        at: typeof event.at === "string" ? event.at : null,
        eventIndex,
        name,
        itemId: item?.id || null,
        callId,
        action: call.action === "called" ? "called" : "requested",
      }
      save(key, entry)
      let args: RecordValue = {}
      try {
        args = record(
          typeof call.arguments === "string"
            ? JSON.parse(call.arguments)
            : call.arguments
        )
      } catch {
        /* Malformed tool arguments do not establish skill usage. */
      }
      requests.set(key, { name, args })
      if (name === "load_skill" && Array.isArray(args.skills)) {
        for (const skillName of args.skills) {
          for (const skill of items.filter(
            (candidate) =>
              candidate.kind === "skill" && candidate.name === skillName
          )) {
            save(`${key}:${skill.id}`, {
              ...entry,
              itemId: skill.id,
              name: skill.name,
            })
          }
        }
      }
      if (
        name === "call_mcp" &&
        typeof args.connection === "string" &&
        typeof args.tool === "string"
      ) {
        const mcp = [...items, ...discoveredTools].find(
          (candidate) => candidate.id === `mcp:${args.connection}/${args.tool}`
        )
        save(`${key}:mcp`, {
          ...entry,
          itemId: mcp?.id || null,
          name: `${args.connection}/${args.tool}`,
        })
      }
    }
    return { usage, discoveredTools, usageStatus: "read" }
  } catch (error) {
    return {
      usage: [],
      discoveredTools: [],
      usageStatus:
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? "missing"
          : "unreadable",
    }
  } finally {
    lines.close()
  }
}
