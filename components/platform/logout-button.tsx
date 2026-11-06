"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function logout() {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) {
        setError("退出失败，请重试。")
        return
      }
      router.replace("/login")
      router.refresh()
    } catch {
      setError("退出失败，请检查服务。")
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        leadingIcon={LogOut}
        onClick={logout}
        disabled={pending}
      >
        {pending ? "正在退出…" : "退出登录"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </>
  )
}
