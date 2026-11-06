import { NextResponse } from "next/server"
import {
  apiError,
  jsonObject,
  requireSession,
} from "@/lib/server/platform-http"
import {
  ConfigInputError,
  parseModelConfig,
  probeModel,
} from "@/lib/server/model-config"
export async function POST(request: Request) {
  const denied = await requireSession(request)
  if (denied) return denied
  const body = await jsonObject(request)
  if (!body) return apiError("INVALID_INPUT", "请提交当前接口配置。", 400)
  try {
    const result = await probeModel(await parseModelConfig(body))
    if (!result.ok) return apiError(result.code, result.message, result.status)
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return error instanceof ConfigInputError
      ? apiError("INVALID_INPUT", error.message, 400)
      : apiError("STORAGE_ERROR", "读取接口配置失败，请检查本机数据目录。", 500)
  }
}
