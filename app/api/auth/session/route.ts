import { NextResponse } from "next/server"
import { currentSession } from "@/lib/server/platform-auth"
import { apiError } from "@/lib/server/platform-http"
export async function GET() {
  const session = await currentSession()
  return session
    ? NextResponse.json(
        { username: session.username },
        { headers: { "Cache-Control": "no-store" } }
      )
    : apiError("UNAUTHENTICATED", "请先登录平台。", 401)
}
