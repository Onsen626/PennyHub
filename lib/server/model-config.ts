import "server-only"
import {
  decryptSecret,
  encryptSecret,
  readRecord,
  writeRecord,
} from "./platform-store"

type StoredConfig = {
  baseUrl: string
  model: string
  encryptedApiKey: string
  updatedAt: string
}
export type ModelConfig = { baseUrl: string; model: string; apiKey: string }
export class ConfigInputError extends Error {}

export async function readModelConfig(): Promise<ModelConfig | null> {
  const saved = await readRecord<StoredConfig>("model-config.json")
  if (!saved) return null
  return {
    baseUrl: saved.baseUrl,
    model: saved.model,
    apiKey: saved.encryptedApiKey
      ? await decryptSecret(saved.encryptedApiKey)
      : "",
  }
}

export async function publicModelConfig() {
  const saved = await readRecord<StoredConfig>("model-config.json")
  return {
    configured: !!saved,
    baseUrl: saved?.baseUrl || "",
    model: saved?.model || "",
    hasApiKey: !!saved?.encryptedApiKey,
    updatedAt: saved?.updatedAt || null,
  }
}

export async function parseModelConfig(
  body: Record<string, unknown>
): Promise<ModelConfig> {
  if (
    typeof body.baseUrl !== "string" ||
    typeof body.model !== "string" ||
    (body.apiKey !== undefined && typeof body.apiKey !== "string") ||
    (body.clearApiKey !== undefined && typeof body.clearApiKey !== "boolean")
  ) {
    throw new ConfigInputError("请填写接口地址和模型名称。")
  }
  const baseUrl = body.baseUrl.trim().replace(/\/+$/, "")
  const model = body.model.trim()
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new ConfigInputError("接口地址须为有效的 HTTP 或 HTTPS 地址。")
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    baseUrl.length > 2048
  ) {
    throw new ConfigInputError(
      "接口地址须使用 HTTP 或 HTTPS，且不包含用户名、密码、查询参数或片段。"
    )
  }
  if (!model || model.length > 200)
    throw new ConfigInputError("模型名称须为1至200个字符。")
  const suppliedKey = (body.apiKey as string | undefined)?.trim() || ""
  if (suppliedKey.length > 4096 || /[\r\n]/.test(suppliedKey))
    throw new ConfigInputError("API Key 格式无效。")
  // Never send an existing secret to a different endpoint without explicit replacement.
  const saved = await readModelConfig()
  const apiKey = body.clearApiKey
    ? ""
    : suppliedKey || (saved?.baseUrl === baseUrl ? saved.apiKey : "")
  return { baseUrl, model, apiKey }
}

export async function saveModelConfig(config: ModelConfig) {
  await writeRecord("model-config.json", {
    baseUrl: config.baseUrl,
    model: config.model,
    encryptedApiKey: config.apiKey ? await encryptSecret(config.apiKey) : "",
    updatedAt: new Date().toISOString(),
  })
  return publicModelConfig()
}

function timeoutResult() {
  return {
    ok: false as const,
    code: "MODEL_TIMEOUT",
    message: "模型接口请求超时，请检查服务负载。",
    status: 504,
  }
}

export async function probeModel(config: ModelConfig) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      requestModel(config, controller.signal),
      new Promise<ReturnType<typeof timeoutResult>>((resolve) => {
        timer = setTimeout(() => {
          controller.abort()
          resolve(timeoutResult())
        }, 15000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function requestModel(config: ModelConfig, signal: AbortSignal) {
  let response: Response
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Reply with OK." }],
        max_tokens: 16,
        stream: false,
      }),
    })
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    return {
      ok: false as const,
      code: timedOut ? "MODEL_TIMEOUT" : "MODEL_CONNECTION_FAILED",
      message: timedOut
        ? "模型接口请求超时，请检查服务负载。"
        : "连接模型接口失败，请检查地址、端口及网络。",
      status: timedOut ? 504 : 502,
    }
  }
  if (!response.ok) {
    // Providers may echo credentials in errors. Do not return or log their bodies.
    let providerCode = ""
    if (response.status === 400) {
      try {
        const metadata = await response.json()
        if (typeof metadata?.error?.code === "string")
          providerCode = metadata.error.code
      } catch {
        if (signal.aborted) return timeoutResult()
      }
    } else await response.body?.cancel()
    if ([401, 403].includes(response.status))
      return {
        ok: false as const,
        code: "MODEL_AUTH_FAILED",
        message: "模型接口鉴权失败，请检查 API Key 和访问权限。",
        status: 422,
      }
    if (
      response.status === 404 ||
      ["model_not_found", "invalid_model"].includes(providerCode)
    )
      return {
        ok: false as const,
        code: "MODEL_NOT_FOUND",
        message: "模型或接口不存在，请检查模型名称及 API 基础地址。",
        status: 422,
      }
    if (response.status === 429)
      return {
        ok: false as const,
        code: "MODEL_RATE_LIMITED",
        message: "模型接口请求限流或额度不足。",
        status: 429,
      }
    return {
      ok: false as const,
      code: "MODEL_REQUEST_FAILED",
      message: `模型接口返回 HTTP ${response.status}，请检查接口协议、模型及服务状态。`,
      status: 502,
    }
  }
  try {
    const payload = await response.json()
    const content: unknown = payload?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim())
      throw new Error("Invalid completion")
  } catch {
    if (signal.aborted) return timeoutResult()
    return {
      ok: false as const,
      code: "MODEL_PROTOCOL_ERROR",
      message:
        "接口没有返回有效的 OpenAI Chat Completions 响应，请检查协议和模型名称。",
      status: 502,
    }
  }
  return {
    ok: true as const,
    model: config.model,
    message: "连接成功，已收到模型的真实响应。",
  }
}
