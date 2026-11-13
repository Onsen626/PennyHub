import { queryFindings } from "@/lib/server/findings"
import { apiError, requireSession } from "@/lib/server/platform-http"
export async function GET(request: Request) {
  const denied = await requireSession()
  if (denied) return denied
  try {
    return Response.json(
      await queryFindings(new URL(request.url).searchParams),
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return apiError("STORAGE_ERROR", "读取发现记录失败，请重试。", 500)
  }
}
