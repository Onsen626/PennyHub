import { redirect } from "next/navigation"
import { currentSession } from "@/lib/server/platform-auth"
import FlocksPage from "@/components/platform/flocks-page"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; task?: string }>
}) {
  if (!(await currentSession())) redirect("/login")
  const query = await searchParams
  return (
    <FlocksPage
      initialModule={
        query.view === "pentests"
          ? "tasks"
          : query.view === "risks"
            ? "workspace"
            : "home"
      }
      initialTaskId={typeof query.task === "string" ? query.task : undefined}
    />
  )
}
