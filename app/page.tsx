import { redirect } from "next/navigation"
import { currentSession } from "@/lib/server/platform-auth"
import FlocksPage from "@/components/platform/flocks-page"
export default async function Page() {
  if (!(await currentSession())) redirect("/login")
  return <FlocksPage />
}
