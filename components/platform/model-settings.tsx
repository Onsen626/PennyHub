"use client"
import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Save, PlugZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { typeClass } from "@/lib/size-context"
import { fontWeights } from "@/lib/font-weight"

type PublicConfig = {
  configured: boolean
  baseUrl: string
  model: string
  hasApiKey: boolean
  updatedAt: string | null
}
type Feedback = { message: string; error: boolean } | null

export function ModelSettings() {
  const router = useRouter()
  const [baseUrl, setBaseUrl] = useState("")
  const [model, setModel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [clearApiKey, setClearApiKey] = useState(false)
  const [saved, setSaved] = useState<PublicConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"save" | "test" | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch("/api/model-config", { cache: "no-store" })
        if (response.status === 401) {
          router.replace("/login")
          return
        }
        const result = await response.json()
        if (!active) return
        if (!response.ok) {
          setFeedback({
            message: result.error?.message || "读取配置失败。",
            error: true,
          })
          return
        }
        setSaved(result)
        setBaseUrl(result.baseUrl)
        setModel(result.model)
      } catch {
        if (active)
          setFeedback({
            message: "读取配置失败，请检查平台服务。",
            error: true,
          })
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [router])

  async function perform(action: "save" | "test") {
    setBusy(action)
    setFeedback(null)
    try {
      const response = await fetch(
        action === "save" ? "/api/model-config" : "/api/model-config/test",
        {
          method: action === "save" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl, model, apiKey, clearApiKey }),
        }
      )
      if (response.status === 401) {
        router.replace("/login")
        return
      }
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          message: result.error?.message || "操作失败，请重试。",
          error: true,
        })
        return
      }
      if (action === "save") {
        setSaved(result)
        setBaseUrl(result.baseUrl)
        setModel(result.model)
        setApiKey("")
        setClearApiKey(false)
        setFeedback({
          message: "配置已保存，全部测试任务共用此接口。",
          error: false,
        })
      } else
        setFeedback({
          message: `${result.message} 本次只检查连接，未保存修改。`,
          error: false,
        })
    } catch {
      setFeedback({ message: "连接平台失败，请检查服务后重试。", error: true })
    } finally {
      setBusy(null)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform("save")
  }
  const disabled = loading || busy !== null
  const canSubmit = !!baseUrl.trim() && !!model.trim() && !disabled
  const retainedKey =
    saved?.hasApiKey && saved.baseUrl === baseUrl.trim().replace(/\/+$/, "")
  return (
    <section
      className="max-w-2xl space-y-5"
      aria-labelledby="model-settings-title"
    >
      <div>
        <h1
          id="model-settings-title"
          className={typeClass("title")}
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          Models
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          配置一套供全部测试任务使用的模型 API。
        </p>
      </div>
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-2xs"
        aria-busy={disabled}
      >
        <div className="flex items-center gap-2 text-sm">
          <KeyRound size={17} className="text-blue-500" />
          <span>
            {loading
              ? "正在读取配置…"
              : saved?.configured
                ? "已保存接口配置"
                : "尚未配置模型接口"}
          </span>
        </div>
        <div className="space-y-2">
          <label htmlFor="model-base-url" className="text-sm font-medium">
            接口地址
          </label>
          <Input
            id="model-base-url"
            type="url"
            required
            maxLength={2048}
            placeholder="http://127.0.0.1:8000/v1"
            value={baseUrl}
            disabled={disabled}
            onChange={(e) => {
              setBaseUrl(e.target.value)
              setFeedback(null)
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            填写 OpenAI 兼容 API 的基础地址，通常包含
            /v1；由平台服务端访问该地址。
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="model-name" className="text-sm font-medium">
            模型名称
          </label>
          <Input
            id="model-name"
            required
            maxLength={200}
            placeholder="接口实际提供的模型标识"
            value={model}
            disabled={disabled}
            onChange={(e) => {
              setModel(e.target.value)
              setFeedback(null)
            }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="model-api-key" className="text-sm font-medium">
            API Key{" "}
            <span className="font-normal text-muted-foreground">
              （按接口要求填写）
            </span>
          </label>
          <Input
            id="model-api-key"
            type="password"
            autoComplete="off"
            maxLength={4096}
            placeholder={
              retainedKey ? "已保存，留空保留原密钥" : "本地接口无鉴权时可留空"
            }
            value={apiKey}
            disabled={disabled || clearApiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setFeedback(null)
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            密钥加密保存在本机，不回传已有明文。更换接口地址时，请重新填写密钥。
          </p>
          {saved?.hasApiKey && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clearApiKey}
                disabled={disabled}
                onChange={(e) => {
                  setClearApiKey(e.target.checked)
                  setApiKey("")
                  setFeedback(null)
                }}
              />
              清除已保存的密钥
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" leadingIcon={Save} disabled={!canSubmit}>
            {busy === "save" ? "正在保存…" : "保存配置"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            leadingIcon={PlugZap}
            disabled={!canSubmit}
            onClick={() => void perform("test")}
          >
            {busy === "test" ? "正在连接…" : "测试连接"}
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          测试连接会向当前地址发送一次实际模型请求，可能产生少量调用费用；连接成功不代表已验证
          Strix 全部工具调用能力。
        </p>
        {feedback && (
          <p
            role={feedback.error ? "alert" : "status"}
            className={`text-sm ${feedback.error ? "text-red-600" : "text-emerald-600"}`}
          >
            {feedback.message}
          </p>
        )}
      </form>
    </section>
  )
}
