import { NextResponse } from "next/server"
import {
  authenticate,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/server/platform-auth"
import { apiError, jsonObject, sameOrigin } from "@/lib/server/platform-http"

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return apiError("INVALID_ORIGIN", "请从当前平台页面登录。", 403)
  const body = await jsonObject(request)
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password ||
    body.password.length > 1024 ||
    body.username.length > 128
  ) {
    return apiError("INVALID_INPUT", "请填写用户名和密码。", 400)
  }
  const result = await authenticate(body.username.trim(), body.password)
  if (result.kind === "uninitialized")
    return apiError(
      "NOT_INITIALIZED",
      "请先在本机终端运行 npm run setup:local 初始化管理员。",
      503
    )
  if (result.kind === "invalid")
    return apiError("INVALID_CREDENTIALS", "用户名或密码错误。", 401)
  const response = NextResponse.json({ username: result.username })
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_SECONDS,
  })
  return response
}
