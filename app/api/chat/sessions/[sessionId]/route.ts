import { NextResponse } from "next/server"
import { apiError, requireSession } from "@/lib/server/platform-http"
import { getChatSession } from "@/lib/server/chat-sessions"

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const denied = await requireSession()
  if (denied) return denied
  try {
    const { sessionId } = await context.params
    const session = await getChatSession(sessionId)
    if (!session) {
      return apiError("SESSION_NOT_FOUND", "指定的聊天会话不存在。", 404)
    }
    return NextResponse.json(
      { session },
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
