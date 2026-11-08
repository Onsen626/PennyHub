import { NextResponse } from "next/server"
import {
  apiError,
  jsonObject,
  requireSession,
} from "@/lib/server/platform-http"
import {
  ChatInputError,
  sendChatMessage,
} from "@/lib/server/chat-sessions"

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const denied = await requireSession(request)
  if (denied) return denied
  const body = await jsonObject(request)
  if (!body) {
    return apiError("INVALID_INPUT", "请提交有效的 JSON 消息内容。", 400)
  }
  try {
    const { sessionId } = await context.params
    const outcome = await sendChatMessage(sessionId, body)
    if (!outcome.ok) {
      return apiError(outcome.code, outcome.message, outcome.status)
    }
    return NextResponse.json(outcome, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return error instanceof ChatInputError
      ? apiError("INVALID_INPUT", error.message, 400)
      : apiError("STORAGE_ERROR", "处理消息失败，请检查本机数据目录。", 500)
  }
}
