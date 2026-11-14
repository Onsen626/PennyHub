"use client"

import { useEffect, useState } from "react"
import type { NativeCatalog } from "@/lib/native-catalog"
import type { PentestTask } from "@/lib/pentests"
import { usePentestRequest } from "@/lib/pentests-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardGroup } from "@/components/ui/card"
import { typeClass } from "@/lib/size-context"
import { cn } from "@/lib/utils"

const labels: Record<string, string> = {
  native_function: "原生函数",
  sdk_capability: "SDK 沙箱能力",
  sandbox_program: "沙箱程序说明",
  mcp_tool: "MCP 配置工具",
}
const evidenceLabels: Record<string, string> = {
  source_definition: "源码定义",
  factory_assembly: "原生装配代码",
  tooling_reference: "使用说明文件",
  configuration: "配置声明",
  task_discovery: "任务保存的 MCP 发现结果",
}

export function NativeCatalogPanel({ kind }: { kind: "skill" | "tool" }) {
  const request = usePentestRequest()
  const [data, setData] = useState<NativeCatalog | null>(null)
  const [tasks, setTasks] = useState<PentestTask[]>([])
  const [taskId, setTaskId] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const params = new URLSearchParams()
    if (taskId) params.set("taskId", taskId)
    async function load() {
      try {
        const [catalog, list] = await Promise.all([
          request<NativeCatalog>(`/api/native-catalog?${params}`),
          request<{ tasks: PentestTask[] }>("/api/pentests"),
        ])
        if (active) {
          setData(catalog)
          setTasks(list.tasks)
          setError("")
          setLoading(false)
        }
      } catch (failure) {
        if (active) {
          setError(
            failure instanceof Error ? failure.message : "读取目录失败。"
          )
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [request, taskId, refresh])
  const entries = (data?.items || []).filter((item) => item.kind === kind)
  const categories = [...new Set(entries.map((item) => item.category))].sort()
  const filtered = entries.filter(
    (item) =>
      (!category || item.category === category) &&
      `${item.name} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  )
  const detail = entries.find((item) => item.id === selected)
  const usage = (data?.usage || []).filter((entry) =>
    kind === "tool"
      ? !entry.itemId?.startsWith("skill:")
      : entry.itemId?.startsWith("skill:")
  )
  const inputClass =
    "h-10 rounded-lg border border-border bg-background px-3 text-sm"
  return (
    <section aria-label="Strix 原生目录" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={typeClass("title")}>
            {kind === "skill" ? "Skills" : "Tools"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            当前运行环境源码目录 · {filtered.length} / {entries.length} 项
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setLoading(true)
            setRefresh((value) => value + 1)
          }}
        >
          刷新目录
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && <p role="status">正在读取目录…</p>}
      {data && (
        <p className="text-sm break-all text-muted-foreground">
          Strix {data.source.version} · 提交 {data.source.commit}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        目录来源、环境可用性和任务调用记录分别展示。浏览目录不会连接
        MCP、探测沙箱或启动测试。
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          搜索目录
          <input
            className={inputClass}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          目录分类
          <select
            className={inputClass}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">全部分类</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {labels[value] || value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {kind === "tool" && data && (
        <p className="text-sm text-muted-foreground">
          MCP 已声明连接：
          {data.mcp.connections.length
            ? data.mcp.connections.join("、")
            : "暂无"}
          。未声明工具清单时，可选择任务读取已保存的工具发现结果；环境可用性尚未核验。
          {["invalid", "unreadable"].includes(data.mcp.status) &&
            "配置读取异常。"}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="max-h-[34rem] overflow-auto rounded-xl border border-border p-2">
          {!loading && !filtered.length && (
            <p className="p-4 text-sm text-muted-foreground">
              没有符合条件的目录条目
            </p>
          )}
          <CardGroup columns={1}>
            {filtered.map((item) => (
              <Card key={item.id}>
                <CardContent>
                  <button
                    type="button"
                    aria-label={`查看 ${item.name}`}
                    className="w-full cursor-pointer py-2 text-left"
                    onClick={() => setSelected(item.id)}
                  >
                    <span className="block font-mono text-sm font-semibold">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {labels[item.category] || item.category}
                      {kind === "skill"
                        ? item.selectable
                          ? " · 用户可选技能"
                          : " · 内部策略"
                        : ""}
                    </span>
                  </button>
                </CardContent>
              </Card>
            ))}
          </CardGroup>
        </div>
        <section
          aria-label="目录详情"
          className="min-w-0 rounded-xl border border-border p-4"
        >
          {!detail ? (
            <p className="text-sm text-muted-foreground">
              选择条目查看正文与来源。
            </p>
          ) : (
            <>
              <h2 className={cn(typeClass("subtitle"), "break-all")}>
                {detail.name}
              </h2>
              <dl className="my-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">分类</dt>
                  <dd>
                    {kind === "skill"
                      ? detail.selectable
                        ? "用户可选技能"
                        : "内部策略"
                      : labels[detail.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">目录来源</dt>
                  <dd className="break-all">
                    {detail.source} · {evidenceLabels[detail.evidence]}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">环境可用性</dt>
                  <dd>尚未核验</dd>
                </div>
              </dl>
              <pre
                data-testid="catalog-content"
                className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 text-xs break-words whitespace-pre-wrap"
              >
                {detail.content}
              </pre>
            </>
          )}
        </section>
      </div>
      <section
        aria-label="任务调用记录"
        className="space-y-3 rounded-xl border border-border p-4"
      >
        <h2 className={typeClass("subtitle")}>任务调用记录</h2>
        <label className="flex flex-col gap-1 text-sm">
          查看任务调用记录
          <select
            className={inputClass}
            value={taskId}
            onChange={(event) => {
              setData(null)
              setLoading(true)
              setTaskId(event.target.value)
            }}
          >
            <option value="">请选择任务</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.targets.join(", ")} · {task.id}
              </option>
            ))}
          </select>
        </label>
        {!taskId ? (
          <p className="text-sm text-muted-foreground">
            请选择任务查看调用记录
          </p>
        ) : (
          <>
            {data && (
              <p className="text-xs break-all text-muted-foreground">
                任务使用的 Strix 提交：{data.taskSource?.commit || "未记录"}。
                {data.sourceMatchesTask === false
                  ? "历史任务版本与当前目录不同，仅展示原始调用名称。"
                  : data.sourceMatchesTask === null
                    ? "任务版本未记录，名称匹配仅供查询参考。"
                    : "任务版本与当前目录一致。"}
              </p>
            )}
            <a
              className="text-sm text-primary underline"
              href={`/?view=pentests&task=${encodeURIComponent(taskId)}`}
            >
              查看来源任务
            </a>
            {data?.usageStatus === "unreadable" ? (
              <p role="alert">任务事件读取异常，请刷新重试。</p>
            ) : (
              !usage.length &&
              !loading && (
                <p className="text-sm text-muted-foreground">
                  暂无任务调用记录。
                  {data?.usageStatus === "missing"
                    ? "任务尚未保存执行事件。"
                    : "已保存事件未记录可识别的调用。"}
                </p>
              )
            )}
            <p className="text-xs text-muted-foreground">
              调用记录保留事件编号与
              Agent；执行结果未记录时不判定成功。技能仅列出已记录的加载请求，预载技能与程序执行使用情况以原生事件为依据。
            </p>
            <ul className="max-h-72 space-y-2 overflow-auto">
              {usage.map((entry, index) => (
                <li
                  key={`${entry.eventIndex}:${entry.itemId}:${index}`}
                  className="rounded-lg bg-muted/30 p-3 text-sm"
                >
                  <span className="font-mono">{entry.name}</span> · Agent{" "}
                  {entry.agentId || "未记录"} · 事件 {entry.eventIndex + 1}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {entry.at || "时间未记录"} ·{" "}
                    {entry.action === "called"
                      ? "已记录调用事件"
                      : "模型调用请求"}{" "}
                    · 执行结果未记录{!entry.itemId && " · 当前目录未匹配"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  )
}
