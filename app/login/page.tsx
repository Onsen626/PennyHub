import { redirect } from "next/navigation"
import { currentSession } from "@/lib/server/platform-auth"
import { LoginForm } from "@/components/platform/login-form"
export default async function LoginPage() {
  if (await currentSession()) redirect("/")
  return <LoginForm />
}
