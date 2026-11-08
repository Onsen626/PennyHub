import { NextResponse } from "next/server"
import {
  apiError,
  jsonObject,
  requireSession,
} from "@/lib/server/platform-http"
import { publicModelConfig } from "@/lib/server/model-config"
import {
  createChatSession,
  listChatSessions,
  setActiveChatSession,
} from "@/lib/server/chat-sessions"

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  try {
    const [data, modelConfig] = await Promise.all([
      listChatSessions(),
      publicModelConfig(),
    ])
    return NextResponse.json(
      { ...data, modelConfig },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return apiError(
      "STORAGE_ERROR",
      "读取聊天会话失败，请检查本机数据目录。",
      500
    )
  }
}

export async function POST(request: Request) {
  const denied = await requireSession(request)
  if (denied) return denied
  const body = await jsonObject(request)
  if (!body) {
    return apiError("INVALID_INPUT", "请提交有效的 JSON 请求体。", 400)
  }
  try {
    const created = await createChatSession({
      title: typeof body.title === "string" ? body.title : undefined,
      target: typeof body.target === "string" ? body.target : undefined,
    })
    return NextResponse.json(created, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return apiError(
      "STORAGE_ERROR",
      "创建聊天会话失败，请检查本机数据目录。",
      500
    )
  }
}

export async function PATCH(request: Request) {
  const denied = await requireSession(request)
  if (denied) return denied
  const body = await jsonObject(request)
  if (!body || typeof body.activeSessionId !== "string") {
    return apiError("INVALID_INPUT", "请提供有效的 activeSessionId。", 400)
  }
  try {
    const updated = await setActiveChatSession(body.activeSessionId.trim())
    if (!updated) {
      return apiError("SESSION_NOT_FOUND", "指定的聊天会话不存在。", 404)
    }
    return NextResponse.json(updated, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return apiError(
      "STORAGE_ERROR",
      "切换活跃会话失败，请检查本机数据目录。",
      500
    )
  }
}
