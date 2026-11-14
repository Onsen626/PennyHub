export type NativeCatalogItem = {
  id: string
  kind: "skill" | "tool"
  name: string
  category: string
  content: string
  source: string
  selectable: boolean
  environment: "unverified"
  evidence:
    | "source_definition"
    | "factory_assembly"
    | "tooling_reference"
    | "configuration"
    | "task_discovery"
  observation?: {
    taskId: string
    agentId: string | null
    eventIndex: number
    callId: string
  }
  connection?: string
  toolName?: string
}
export type NativeCatalog = {
  source: { commit: string; version: string }
  taskSource: { commit: string } | null
  sourceMatchesTask: boolean | null
  items: NativeCatalogItem[]
  usage: NativeUsage[]
  usageStatus?: "not_selected" | "read" | "missing" | "unreadable"
  mcp: { connections: string[]; status: string }
}
export type NativeUsage = {
  taskId: string
  agentId: string | null
  at: string | null
  eventIndex: number
  name: string
  itemId: string | null
  action: "requested" | "called"
  callId: string | null
}
