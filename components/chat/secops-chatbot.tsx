"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Maximize2,
  X,
  Paperclip,
  Plus,
  RotateCcw,
  AlertCircle,
  FileText,
} from "lucide-react"
import { AnimatePresence } from "motion/react"
import { ChatMessage } from "@/components/ui/chat-message"
import { InputMessage, type QueuedMessage } from "@/components/ui/input-message"
import { ThinkingIndicator } from "@/components/ui/thinking-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { typeClass } from "@/lib/size-context"
import { fontWeights } from "@/lib/font-weight"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/flocks-data"

export interface ChatAttachmentMeta {
  name: string
  size: number
  type: string
}

export interface PersistedChatMessage {
  id: string
  clientMessageId?: string
  role: "user" | "assistant"
  content: string
  attachments?: ChatAttachmentMeta[]
  createdAt: string
  timeLabel: string
  model?: string
}

export interface PersistedChatSession {
  id: string
  title: string
  target: string
  taskId: string | null
  createdAt: string
  updatedAt: string
  messages: PersistedChatMessage[]
}

export interface PublicModelInfo {
  configured: boolean
  baseUrl: string
  model: string
  hasApiKey: boolean
  updatedAt: string | null
}

export interface PendingChatSubmission {
  clientMessageId: string
  text: string
  files: File[]
}

const CHAT_FILE_ACCEPT =
  "image/*,text/*,application/*,.yaml,.yml,.json,.txt,.md,.pdf,.har,.pcap,.pcapng,.zip"

export interface SecOpsChatbotProps {
  lang?: Lang
  mode: "workspace" | "drawer"
  visible?: boolean
  initialSessionId?: string
  initialPrompt?: string
  draft?: string
  onDraftChange?: (value: string) => void
  files?: File[]
  onFilesChange?: (files: File[]) => void
  pendingSubmission?: PendingChatSubmission | null
  onPendingSubmissionHandled?: (clientMessageId: string) => void
  onSwitchMode?: (nextMode: "workspace" | "drawer") => void
  onCloseDrawer?: () => void
}

function filesToMeta(files: File[]): ChatAttachmentMeta[] {
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type || "application/octet-stream",
  }))
}

export function SecOpsChatbot({
  mode,
  visible = true,
  initialSessionId,
  initialPrompt,
  draft: controlledDraft,
  onDraftChange,
  files: controlledFiles,
  onFilesChange,
  pendingSubmission,
  onPendingSubmissionHandled,
  onSwitchMode,
  onCloseDrawer,
}: SecOpsChatbotProps) {
  const [sessions, setSessions] = useState<PersistedChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>(
    initialSessionId ?? "ses-default"
  )
  const [modelInfo, setModelInfo] = useState<PublicModelInfo | null>(null)
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true)

  const [internalDraft, setInternalDraft] = useState<string>(
    initialPrompt ?? ""
  )
  const [internalFiles, setInternalFiles] = useState<File[]>([])

  const draft = controlledDraft !== undefined ? controlledDraft : internalDraft
  const setDraft = useCallback(
    (next: string) => {
      if (onDraftChange) onDraftChange(next)
      else setInternalDraft(next)
    },
    [onDraftChange]
  )

  const files = controlledFiles !== undefined ? controlledFiles : internalFiles
  const setFiles = useCallback(
    (next: File[]) => {
      if (onFilesChange) onFilesChange(next)
      else setInternalFiles(next)
    },
    [onFilesChange]
  )

  const [status, setStatus] = useState<"idle" | "streaming">("idle")
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [inFlightPreview, setInFlightPreview] = useState<{
    text: string
    files: File[]
    attachments: ChatAttachmentMeta[]
  } | null>(null)
  const [lastFailedSubmission, setLastFailedSubmission] = useState<{
    text: string
    files: File[]
    attachments: ChatAttachmentMeta[]
    clientMessageId: string
  } | null>(null)

  const handledClientIdsRef = useRef<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const sessionsLoadedRef = useRef<boolean>(false)

  const [prevPrompt, setPrevPrompt] = useState(initialPrompt)
  if (initialPrompt !== prevPrompt) {
    setPrevPrompt(initialPrompt)
    if (initialPrompt) {
      setDraft(initialPrompt)
    }
  }

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch("/api/chat/sessions", {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions(data.sessions)
          if (typeof data.activeSessionId === "string") {
            setActiveSessionId(data.activeSessionId)
          }
        }
        if (data.modelConfig) {
          setModelInfo(data.modelConfig)
        }
        sessionsLoadedRef.current = true
      } catch {
        // ignore transient network error on initial load
      } finally {
        if (active) setLoadingSessions(false)
      }
    }
    if (visible || !sessionsLoadedRef.current) {
      void load()
    }
    return () => {
      active = false
    }
  }, [visible])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ??
    sessions[0] ?? {
      id: "ses-default",
      title: "安全运营 Copilot 会话",
      target: "通用安全咨询",
      taskId: null,
      createdAt: "",
      updatedAt: "",
      messages: [],
    }

  const currentMessages = activeSession.messages ?? []

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setStatus("idle")
    setInFlightPreview(null)
  }, [])

  const submitMessageToApi = useCallback(
    async (
      text: string,
      attachedFiles: File[],
      explicitClientMessageId?: string,
      explicitAttachmentsMeta?: ChatAttachmentMeta[]
    ) => {
      const trimmed = text.trim()
      const attachmentMeta =
        explicitAttachmentsMeta ?? filesToMeta(attachedFiles)
      if (!trimmed && attachmentMeta.length === 0) return

      const clientMessageId =
        explicitClientMessageId ??
        `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setErrorMsg(null)
      setLastFailedSubmission(null)
      setStatus("streaming")
      setInFlightPreview({
        text: trimmed,
        files: attachedFiles,
        attachments: attachmentMeta,
      })
      setDraft("")
      setFiles([])
      scrollToBottom()

      const controller = new AbortController()
      abortControllerRef.current = controller

      const targetSessionId = activeSession.id || "ses-default"

      try {
        const res = await fetch(
          `/api/chat/sessions/${encodeURIComponent(targetSessionId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              content: trimmed,
              attachments: attachmentMeta,
              clientMessageId,
            }),
          }
        )

        const payload = await res.json().catch(() => null)
        if (!res.ok || !payload?.ok) {
          const message =
            payload?.error?.message ||
            "发送消息失败，请检查模型配置或稍后重试。"
          setErrorMsg(message)
          setInFlightPreview(null)
          setStatus("idle")
          // Restore user's input & files so they are never lost on failure
          setDraft(trimmed)
          if (attachedFiles.length > 0) {
            setFiles(attachedFiles)
          }
          setLastFailedSubmission({
            text: trimmed,
            files: attachedFiles,
            attachments: attachmentMeta,
            clientMessageId,
          })
          return
        }

        const updatedSession: PersistedChatSession = payload.session
        setSessions((prev) => {
          const exists = prev.some((s) => s.id === updatedSession.id)
          if (!exists) return [updatedSession, ...prev]
          return [
            updatedSession,
            ...prev.filter((s) => s.id !== updatedSession.id),
          ]
        })
        setActiveSessionId(updatedSession.id)
        setInFlightPreview(null)
        setStatus("idle")
        scrollToBottom()
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setInFlightPreview(null)
          setStatus("idle")
          return
        }
        setErrorMsg("网络请求异常，消息未发送成功，请重试。")
        setInFlightPreview(null)
        setStatus("idle")
        setDraft(trimmed)
        if (attachedFiles.length > 0) {
          setFiles(attachedFiles)
        }
        setLastFailedSubmission({
          text: trimmed,
          files: attachedFiles,
          attachments: attachmentMeta,
          clientMessageId,
        })
      }
    },
    [activeSession.id, scrollToBottom, setDraft, setFiles]
  )

  useEffect(() => {
    if (!pendingSubmission) return
    const { clientMessageId, text, files: subFiles } = pendingSubmission
    if (handledClientIdsRef.current.has(clientMessageId)) return
    handledClientIdsRef.current.add(clientMessageId)
    async function dispatchPending() {
      await Promise.resolve()
      onPendingSubmissionHandled?.(clientMessageId)
      await submitMessageToApi(text, subFiles, clientMessageId)
    }
    void dispatchPending()
  }, [pendingSubmission, onPendingSubmissionHandled, submitMessageToApi])

  const handleSend = useCallback(
    (text: string, attachedFiles: File[]) => {
      void submitMessageToApi(text, attachedFiles)
    },
    [submitMessageToApi]
  )

  const handleRetryFailed = useCallback(() => {
    if (!lastFailedSubmission) return
    void submitMessageToApi(
      lastFailedSubmission.text,
      lastFailedSubmission.files,
      lastFailedSubmission.clientMessageId,
      lastFailedSubmission.attachments
    )
  }, [lastFailedSubmission, submitMessageToApi])

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    setErrorMsg(null)
    try {
      await fetch("/api/chat/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSessionId: sessionId }),
      })
    } catch {
      // ignore
    }
  }

  const handleCreateNewSession = async () => {
    setErrorMsg(null)
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions)
      }
      if (typeof data.activeSessionId === "string") {
        setActiveSessionId(data.activeSessionId)
      }
    } catch {
      // ignore
    }
  }

  return (
    <div
      data-testid="secops-chatbot"
      data-chat-mode={mode}
      className={cn(
        "flex h-full max-h-full min-h-0 w-full overflow-hidden bg-background text-foreground",
        mode === "workspace"
          ? "rounded-2xl border border-border/80 shadow-xs"
          : "flex-col"
      )}
    >
      {/* 左侧多会话列表（全屏工作台模式） */}
      {mode === "workspace" && (
        <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col border-r border-border/70 bg-muted/20 lg:flex">
          <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3.5">
            <div>
              <h3
                className={cn(typeClass("subtitle"), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                历史会话记录
              </h3>
              <p className={cn(typeClass("caption"), "text-muted-foreground")}>
                跨形态共享 · 刷新自动恢复
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leadingIcon={Plus}
              onClick={handleCreateNewSession}
            >
              新建会话
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {sessions.map((ses) => {
              const isSelected = ses.id === activeSession.id
              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => void handleSelectSession(ses.id)}
                  className={cn(
                    "w-full cursor-pointer rounded-xl p-3 text-left transition-colors",
                    isSelected
                      ? "bg-accent/15 ring-1 ring-accent/40"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        typeClass("caption"),
                        "truncate text-muted-foreground"
                      )}
                    >
                      {ses.target || "通用安全咨询"}
                    </span>
                    <Badge
                      size="sm"
                      variant="dot"
                      color={isSelected ? "blue" : "gray"}
                    >
                      {ses.messages.length} 条消息
                    </Badge>
                  </div>
                  <p
                    className={cn(
                      typeClass("body"),
                      "mt-1 line-clamp-2 text-foreground"
                    )}
                    style={{ fontVariationSettings: fontWeights.semibold }}
                  >
                    {ses.title}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>
      )}

      {/* 中间对话流 */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <h2
                className={cn(
                  typeClass("subtitle"),
                  "-my-1 truncate py-1 text-foreground [text-box:trim-both_cap_alphabetic]"
                )}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {activeSession.title}
              </h2>
              <Badge
                size="sm"
                variant="solid"
                color={modelInfo?.configured ? "purple" : "gray"}
              >
                {modelInfo?.configured && modelInfo.model
                  ? modelInfo.model
                  : "未配置模型"}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {mode === "drawer" && onSwitchMode && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={Maximize2}
                onClick={() => onSwitchMode("workspace")}
              >
                全屏展开
              </Button>
            )}
            {onCloseDrawer && (
              <Button
                size="sm"
                variant="ghost"
                leadingIcon={X}
                onClick={onCloseDrawer}
              >
                关闭聊天
              </Button>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
        >
          {loadingSessions && currentMessages.length === 0 ? (
            <p className={cn(typeClass("caption"), "text-muted-foreground")}>
              正在加载会话历史...
            </p>
          ) : currentMessages.length === 0 && !inFlightPreview ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
              <p
                className={cn(typeClass("body"), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                开始你的安全运营对话
              </p>
              <p
                className={cn(
                  typeClass("caption"),
                  "mt-1 text-muted-foreground"
                )}
              >
                直接提问安全方案或探讨漏洞分析。普通问答不会启动后台测试；如需创建
                Web App Pentest 渗透测试，请点击右上角「开始渗透测试」前往
                Pentests。
              </p>
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {currentMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2">
                <ChatMessage
                  from={msg.role}
                  time={msg.timeLabel}
                  className="max-w-[90%]"
                >
                  {msg.content}
                </ChatMessage>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div
                    className={cn(
                      "flex flex-wrap gap-1.5",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.attachments.map((att, idx) => (
                      <div
                        key={`${msg.id}-att-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        <FileText size={12} className="shrink-0" />
                        <span>
                          附件元数据（仅文件名/类型/大小）：{att.name} (
                          {att.size} B)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>

          {status === "streaming" && (
            <div className="flex flex-col gap-3">
              {inFlightPreview && (
                <div className="flex flex-col gap-1.5">
                  <ChatMessage
                    from="user"
                    files={
                      inFlightPreview.files.length > 0
                        ? inFlightPreview.files
                        : undefined
                    }
                    className="max-w-[90%]"
                  >
                    {inFlightPreview.text}
                  </ChatMessage>
                  {inFlightPreview.attachments.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {inFlightPreview.attachments.map((att, idx) => (
                        <div
                          key={`inflight-att-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          <FileText size={12} className="shrink-0" />
                          <span>
                            附件元数据（仅文件名/类型/大小）：{att.name} (
                            {att.size} B)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <ThinkingIndicator data-testid="thinking-indicator" />
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {lastFailedSubmission && (
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={RotateCcw}
                  onClick={handleRetryFailed}
                >
                  重试发送
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-background/95 p-3">
          <InputMessage
            value={draft}
            onValueChange={setDraft}
            onSend={handleSend}
            status={status}
            onStop={stopStreaming}
            queue={queue}
            onQueueChange={setQueue}
            files={files}
            onFilesChange={setFiles}
            accept={CHAT_FILE_ACCEPT}
            minRows={2}
            maxRows={5}
            placeholder="输入安全问题、粘贴线索或继续当前对话..."
            sendLabel="发送"
            textareaProps={{
              "aria-label": "Copilot 聊天输入框",
            }}
            leftSlot={({ openFilePicker }) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leadingIcon={Paperclip}
                  onClick={() => openFilePicker()}
                >
                  添加附件
                </Button>
                {files.length > 0 && (
                  <span
                    className={cn(typeClass("micro"), "text-muted-foreground")}
                  >
                    已选 {files.length} 个附件（仅传递文件名/类型/大小元数据）
                  </span>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
export default SecOpsChatbot
