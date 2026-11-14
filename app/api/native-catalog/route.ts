import { readPentest } from "@/lib/server/pentests"
import { NextResponse } from "next/server"
import { requireSession, apiError } from "@/lib/server/platform-http"
import { readNativeCatalog } from "@/lib/server/native-catalog"

export async function GET(request: Request) {
  const denied = await requireSession()
  if (denied) return denied
  const parameters = new URL(request.url).searchParams
  const taskId = parameters.get("taskId")
  if (
    taskId &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      taskId
    )
  )
    return apiError("INVALID_INPUT", "任务编号格式无效。", 400)
  try {
    if (taskId && !(await readPentest(taskId)))
      return apiError("NOT_FOUND", "测试记录不存在。", 404)
    return NextResponse.json(await readNativeCatalog(parameters), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return apiError(
      "CATALOG_UNAVAILABLE",
      "读取 Strix 原生目录失败，请检查运行环境源码。",
      503
    )
  }
}
