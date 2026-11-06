import "server-only"
import { NextResponse } from "next/server"
import { currentSession } from "./platform-auth"

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

export async function requireSession(request?: Request) {
  if (!(await currentSession()))
    return apiError("UNAUTHENTICATED", "请先登录平台。", 401)
  if (request && !sameOrigin(request))
    return apiError("INVALID_ORIGIN", "请从当前平台页面提交操作。", 403)
  return null
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    const source = new URL(origin)
    // Next may normalize request.url to localhost; Host preserves the browser address.
    return (
      source.host === request.headers.get("host") &&
      source.protocol === new URL(request.url).protocol
    )
  } catch {
    return false
  }
}

export async function jsonObject(
  request: Request
): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return null
  try {
    const value = await request.json()
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null
  } catch {
    return null
  }
}
