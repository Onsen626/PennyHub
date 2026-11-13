export type Finding = {
  id: string
  taskId: string
  nativeId: string | null
  title: string
  severity: string
  originalSeverity: string | null
  targets: string[]
  location: string | null
  description: string | null
  taskStatus: string
  completeness: string
  independentlyVerified: boolean | null
}
export type FindingQuery = {
  findings: Finding[]
  total: number
  page: number
  pageSize: number
  summary: Record<string, number>
  queriedAt: string
  unavailableTasks: number
  missingTasks: number
}
