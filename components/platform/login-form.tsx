"use client"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error?.message || "登录失败，请重试。")
        return
      }
      setPassword("")
      router.replace("/")
      router.refresh()
    } catch {
      setError("连接失败，请检查平台服务。")
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-5 dark:bg-background">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">PennyAgent</h1>
            <p className="text-sm text-muted-foreground">登录安全测试工作台</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              用户名
            </label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              maxLength={128}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "正在登录…" : "登录"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          首次使用请在本机终端运行 <code>npm run setup:local</code>{" "}
          创建管理员。平台没有默认密码。
        </p>
      </section>
    </main>
  )
}
