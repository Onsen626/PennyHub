import { NextResponse } from "next/server"
import {
  apiError,
  jsonObject,
  requireSession,
} from "@/lib/server/platform-http"
import {
  ConfigInputError,
  parseModelConfig,
  publicModelConfig,
  saveModelConfig,
} from "@/lib/server/model-config"
export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  try {
    return NextResponse.json(await publicModelConfig(), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return apiError("STORAGE_ERROR", "读取配置失败，请检查本机数据目录。", 500)
  }
}
export async function PUT(request: Request) {
  const denied = await requireSession(request)
  if (denied) return denied
  const body = await jsonObject(request)
  if (!body) return apiError("INVALID_INPUT", "请提交有效的 JSON 配置。", 400)
  try {
    return NextResponse.json(
      await saveModelConfig(await parseModelConfig(body)),
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return error instanceof ConfigInputError
      ? apiError("INVALID_INPUT", error.message, 400)
      : apiError("STORAGE_ERROR", "保存配置失败，请检查本机数据目录。", 500)
  }
}
