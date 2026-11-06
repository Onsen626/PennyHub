import { NextResponse } from "next/server"
import { deleteSession, SESSION_COOKIE } from "@/lib/server/platform-auth"
import { apiError, sameOrigin } from "@/lib/server/platform-http"
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return apiError("INVALID_ORIGIN", "请从当前平台页面退出。", 403)
  await deleteSession()
  const response = NextResponse.json({ ok: true })
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
