"use client"
import { useEffect, useState } from "react"
import { usePentestRequest } from "@/lib/pentests-client"
import type { FindingQuery } from "@/lib/findings"

export function FindingsPanel({
  summaryOnly = false,
  taskId,
}: {
  summaryOnly?: boolean
  taskId?: string
}) {
  const request = usePentestRequest()
  const [data, setData] = useState<FindingQuery | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [severity, setSeverity] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("severity") || ""
  )
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("finding")
  )
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const params = new URLSearchParams({
      q: query,
      severity,
      page: String(page),
    })
    if (taskId) params.set("task", taskId)
    async function load() {
      try {
        const result = await request<FindingQuery>(`/api/findings?${params}`)
        if (active) {
          setData(result)
          setError("")
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "读取失败")
      }
      if (active) timer = setTimeout(load, 3000)
    }
    void load()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [request, query, severity, page, retry, taskId])
  const selectedFinding = data?.findings.find((f) => f.id === selected)
  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <h2 className="text-xl font-semibold">
        {summaryOnly ? "发现摘要" : "现有风险"}
      </h2>
      <p className="text-sm text-muted-foreground">
        按任务内发现记录统计，跨任务未合并。来源：Strix。
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((v) => v + 1)}>重新读取</button>
        </p>
      )}
      {!data && !error && <p role="status">正在读取发现记录…</p>}
      {data && (
        <>
          <p>
            发现记录：{data.total} · 结果缺失任务：{data.missingTasks} ·
            读取异常任务：{data.unavailableTasks}
          </p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.summary).map(([level, count]) => (
              <a key={level} href={`/?view=risks&severity=${level}`}>
                {level}: {count}
              </a>
            ))}
          </div>
          {!summaryOnly && (
            <>
              <div className="flex gap-3">
                <input
                  aria-label="搜索发现标题"
                  placeholder="搜索发现标题"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  className="rounded border p-2"
                />
                <select
                  aria-label="严重程度"
                  value={severity}
                  onChange={(e) => {
                    setSeverity(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">全部严重程度</option>
                  {Object.keys(data.summary).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              {selected && !selectedFinding && (
                <p>
                  当前列表未找到指定发现。
                  <button onClick={() => setSelected(null)}>返回列表</button>
                </p>
              )}
              {data.findings.length === 0 && (
                <p>
                  {data.unavailableTasks || data.missingTasks
                    ? "可读取结果中暂无发现，部分任务结果缺失或读取异常。"
                    : "当前范围没有发现记录。"}
                </p>
              )}
              <ul className="space-y-3">
                {data.findings.map((f) => (
                  <li key={f.id} id={f.id} className="rounded border p-4">
                    <a
                      href={`/?view=risks&task=${encodeURIComponent(f.taskId)}&finding=${encodeURIComponent(f.id)}`}
                      className="font-semibold"
                    >
                      {f.title}
                    </a>
                    <p>
                      {f.severity} · {f.taskStatus} · {f.completeness}
                    </p>
                    <p>影响位置：{f.location || "未记录"}</p>
                    <p>任务目标：{f.targets.join(", ")}</p>
                    <p>
                      平台独立复核：
                      {f.independentlyVerified === null
                        ? "未记录"
                        : f.independentlyVerified
                          ? "已记录复核"
                          : "未独立复核"}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {f.description || "描述未记录"}
                    </p>
                    <a
                      href={`/?view=pentests&task=${encodeURIComponent(f.taskId)}`}
                    >
                      来源任务、原始报告与证据
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span>第 {page} 页</span>
                <button
                  disabled={page * 25 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            查询时间：{data.queriedAt}
          </p>
        </>
      )}
    </section>
  )
}
