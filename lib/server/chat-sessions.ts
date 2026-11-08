import "server-only"
import { randomBytes } from "node:crypto"
import { readModelConfig, type ModelConfig } from "./model-config"
import { readRecord, writeRecord } from "./platform-store"

const STORE_FILE = "chat-sessions.json"

export type ChatAttachmentMeta = {
  name: string
  size: number
  type: string
}

export type ChatMessageRecord = {
  id: string
  clientMessageId?: string
  role: "user" | "assistant"
  content: string
  attachments?: ChatAttachmentMeta[]
  createdAt: string
  timeLabel: string
  model?: string
}

export type ChatSessionRecord = {
  id: string
  title: string
  target: string
  taskId: string | null
  createdAt: string
  updatedAt: string
  messages: ChatMessageRecord[]
}

type StoredChatSessions = {
  activeSessionId: string
  sessions: ChatSessionRecord[]
}

export class ChatInputError extends Error {}

function formatTimeLabel(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function createDefaultSession(now = new Date().toISOString()): ChatSessionRecord {
  return {
    id: "ses-default",
    title: "安全运营 Copilot 会话",
    target: "通用安全咨询",
    taskId: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

async function loadStore(): Promise<StoredChatSessions> {
  const saved = await readRecord<StoredChatSessions>(STORE_FILE)
  if (
    saved &&
    Array.isArray(saved.sessions) &&
    saved.sessions.length > 0 &&
    typeof saved.activeSessionId === "string"
  ) {
    const activeExists = saved.sessions.some(
      (s) => s.id === saved.activeSessionId
    )
    return {
      activeSessionId: activeExists
        ? saved.activeSessionId
        : saved.sessions[0].id,
      sessions: saved.sessions,
    }
  }
  const initial = createDefaultSession()
  const fresh: StoredChatSessions = {
    activeSessionId: initial.id,
    sessions: [initial],
  }
  await writeRecord(STORE_FILE, fresh)
  return fresh
}

async function saveStore(store: StoredChatSessions) {
  await writeRecord(STORE_FILE, store)
}

export async function listChatSessions() {
  const store = await loadStore()
  const activeSession =
    store.sessions.find((s) => s.id === store.activeSessionId) ??
    store.sessions[0]
  return {
    activeSessionId: activeSession.id,
    activeSession,
    sessions: store.sessions,
  }
}

export async function getChatSession(sessionId: string) {
  const store = await loadStore()
  return store.sessions.find((s) => s.id === sessionId) ?? null
}

export async function createChatSession(input?: {
  title?: string
  target?: string
}) {
  const store = await loadStore()
  const now = new Date().toISOString()
  const rawTitle =
    typeof input?.title === "string" ? input.title.trim() : ""
  const rawTarget =
    typeof input?.target === "string" ? input.target.trim() : ""
  const id = `ses-${Date.now()}-${randomBytes(3).toString("hex")}`
  const session: ChatSessionRecord = {
    id,
    title: rawTitle ? rawTitle.slice(0, 80) : `安全运营会话 #${store.sessions.length + 1}`,
    target: rawTarget ? rawTarget.slice(0, 120) : "通用安全咨询",
    taskId: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  store.sessions = [session, ...store.sessions]
  store.activeSessionId = session.id
  await saveStore(store)
  return {
    activeSessionId: store.activeSessionId,
    session,
    sessions: store.sessions,
  }
}

export async function setActiveChatSession(sessionId: string) {
  const store = await loadStore()
  const found = store.sessions.find((s) => s.id === sessionId)
  if (!found) return null
  store.activeSessionId = found.id
  await saveStore(store)
  return {
    activeSessionId: store.activeSessionId,
    session: found,
    sessions: store.sessions,
  }
}

export function parseAttachments(raw: unknown): ChatAttachmentMeta[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    throw new ChatInputError("附件格式无效。")
  }
  if (raw.length > 10) {
    throw new ChatInputError("单次最多附加 10 个文件。")
  }
  return raw.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ChatInputError("附件项格式无效。")
    }
    const rec = item as Record<string, unknown>
    const name = typeof rec.name === "string" ? rec.name.trim() : ""
    const size = typeof rec.size === "number" && Number.isFinite(rec.size) && rec.size >= 0 ? Math.floor(rec.size) : 0
    const type = typeof rec.type === "string" ? rec.type.trim().slice(0, 120) : "application/octet-stream"
    if (!name || name.length > 255) {
      throw new ChatInputError("附件文件名无效。")
    }
    return { name, size, type: type || "application/octet-stream" }
  })
}

function formatMessageForModel(
  content: string,
  attachments?: ChatAttachmentMeta[]
) {
  if (!attachments || attachments.length === 0) return content
  const metaSummary = attachments
    .map((a) => `${a.name} (${a.type || "unknown"}, ${a.size} bytes)`)
    .join(", ")
  const note = `[用户附加了文件元数据（仅记录文件名、类型和大小，未上传或读取文件正文）: ${metaSummary}]`
  return content ? `${content}\n\n${note}` : note
}

function timeoutErrorResult() {
  return {
    ok: false as const,
    code: "MODEL_TIMEOUT",
    message: "模型接口请求超时，请检查服务负载后重试。",
    status: 504,
  }
}

async function callChatCompletion(
  config: ModelConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      performCompletionFetch(config, messages, controller.signal),
      new Promise<ReturnType<typeof timeoutErrorResult>>((resolve) => {
        timer = setTimeout(() => {
          controller.abort()
          resolve(timeoutErrorResult())
        }, 15000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function performCompletionFetch(
  config: ModelConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  signal: AbortSignal
) {
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
        messages,
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
        ? "模型接口请求超时，请检查服务负载后重试。"
        : "连接模型接口失败，请检查地址、端口及网络。",
      status: timedOut ? 504 : 502,
    }
  }

  if (!response.ok) {
    let providerCode = ""
    if (response.status === 400) {
      try {
        const metadata = await response.json()
        if (typeof metadata?.error?.code === "string") {
          providerCode = metadata.error.code
        }
      } catch {
        if (signal.aborted) return timeoutErrorResult()
      }
    } else {
      await response.body?.cancel()
    }
    if ([401, 403].includes(response.status)) {
      return {
        ok: false as const,
        code: "MODEL_AUTH_FAILED",
        message: "模型接口鉴权失败，请检查 API Key 和访问权限。",
        status: 422,
      }
    }
    if (
      response.status === 404 ||
      ["model_not_found", "invalid_model"].includes(providerCode)
    ) {
      return {
        ok: false as const,
        code: "MODEL_NOT_FOUND",
        message: "模型或接口不存在，请检查模型名称及 API 基础地址。",
        status: 422,
      }
    }
    if (response.status === 429) {
      return {
        ok: false as const,
        code: "MODEL_RATE_LIMITED",
        message: "模型接口请求限流或额度不足。",
        status: 429,
      }
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
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Invalid completion")
    }
    return {
      ok: true as const,
      content: content.trim(),
      model: config.model,
    }
  } catch {
    if (signal.aborted) return timeoutErrorResult()
    return {
      ok: false as const,
      code: "MODEL_PROTOCOL_ERROR",
      message:
        "接口没有返回有效的 OpenAI Chat Completions 响应，请检查协议和模型名称。",
      status: 502,
    }
  }
}

export async function sendChatMessage(
  sessionId: string,
  body: Record<string, unknown>
) {
  if (body.content !== undefined && typeof body.content !== "string") {
    throw new ChatInputError("消息内容须为字符串。")
  }
  if (
    body.clientMessageId !== undefined &&
    (typeof body.clientMessageId !== "string" ||
      body.clientMessageId.length > 128)
  ) {
    throw new ChatInputError("消息幂等标识格式无效。")
  }
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (content.length > 16000) {
    throw new ChatInputError("单条消息内容不能超过 16000 个字符。")
  }
  const attachments = parseAttachments(body.attachments)
  if (!content && attachments.length === 0) {
    throw new ChatInputError("请输入消息内容或添加附件。")
  }
  const clientMessageId =
    typeof body.clientMessageId === "string" && body.clientMessageId.trim()
      ? body.clientMessageId.trim()
      : undefined

  const store = await loadStore()
  let session = store.sessions.find((s) => s.id === sessionId)
  if (!session) {
    return {
      ok: false as const,
      code: "SESSION_NOT_FOUND",
      message: "指定的聊天会话不存在。",
      status: 404,
    }
  }

  // Idempotency check: prevent duplicate submission of the initial Home message
  // when transitioning between Home composer, fullscreen, and sidebar drawer.
  if (clientMessageId) {
    const existingIdx = session.messages.findIndex(
      (m) => m.role === "user" && m.clientMessageId === clientMessageId
    )
    if (existingIdx !== -1) {
      const existingUser = session.messages[existingIdx]
      const existingAssistant = session.messages
        .slice(existingIdx + 1)
        .find((m) => m.role === "assistant")
      if (existingAssistant) {
        store.activeSessionId = session.id
        await saveStore(store)
        return {
          ok: true as const,
          deduplicated: true,
          session,
          userMessage: existingUser,
          assistantMessage: existingAssistant,
        }
      }
    }
  }

  const config = await readModelConfig()
  if (!config) {
    return {
      ok: false as const,
      code: "MODEL_NOT_CONFIGURED",
      message: "尚未配置模型接口，请先在 Models 页面保存模型配置后再发送消息。",
      status: 422,
    }
  }

  const completionMessages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }> = [
    {
      role: "system",
      content:
        "你是 PennyAgent 安全运营与渗透测试平台的 AI Copilot。请简洁、准确地回答用户的安全问答与技术咨询。普通聊天与问候不会自动创建或启动 Strix 渗透测试任务。若用户消息包含附件元数据，当前仅记录文件名、类型和大小，未读取附件文件正文，请明确按元数据说明。",
    },
    ...session.messages.map((m) => ({
      role: m.role,
      content:
        m.role === "user"
          ? formatMessageForModel(m.content, m.attachments)
          : m.content,
    })),
    {
      role: "user",
      content: formatMessageForModel(content, attachments),
    },
  ]

  const result = await callChatCompletion(config, completionMessages)
  if (!result.ok) {
    return result
  }

  // Re-load store before writing so concurrent reads/writes don't clobber
  const latestStore = await loadStore()
  session =
    latestStore.sessions.find((s) => s.id === sessionId) ?? session

  if (clientMessageId) {
    const existingIdx = session.messages.findIndex(
      (m) => m.role === "user" && m.clientMessageId === clientMessageId
    )
    if (existingIdx !== -1) {
      const existingUser = session.messages[existingIdx]
      const existingAssistant = session.messages
        .slice(existingIdx + 1)
        .find((m) => m.role === "assistant")
      if (existingAssistant) {
        latestStore.activeSessionId = session.id
        await saveStore(latestStore)
        return {
          ok: true as const,
          deduplicated: true,
          session,
          userMessage: existingUser,
          assistantMessage: existingAssistant,
        }
      }
    }
  }

  const now = new Date().toISOString()
  const userMessage: ChatMessageRecord = {
    id: `msg-${Date.now()}-${randomBytes(3).toString("hex")}`,
    ...(clientMessageId ? { clientMessageId } : {}),
    role: "user",
    content,
    ...(attachments.length > 0 ? { attachments } : {}),
    createdAt: now,
    timeLabel: formatTimeLabel(now),
  }

  const replyIso = new Date().toISOString()
  const assistantMessage: ChatMessageRecord = {
    id: `msg-${Date.now()}-${randomBytes(3).toString("hex")}`,
    role: "assistant",
    content: result.content,
    createdAt: replyIso,
    timeLabel: formatTimeLabel(replyIso),
    model: result.model,
  }

  const wasEmpty = session.messages.length === 0
  session.messages.push(userMessage, assistantMessage)
  if (
    wasEmpty &&
    (session.title === "安全运营 Copilot 会话" ||
      session.title.startsWith("安全运营会话 #"))
  ) {
    const candidate = content || attachments[0]?.name || session.title
    session.title = candidate.slice(0, 42)
  }
  session.updatedAt = replyIso
  latestStore.activeSessionId = session.id
  latestStore.sessions = [
    session,
    ...latestStore.sessions.filter((s) => s.id !== session!.id),
  ]

  await saveStore(latestStore)

  return {
    ok: true as const,
    deduplicated: false,
    session,
    userMessage,
    assistantMessage,
  }
}
