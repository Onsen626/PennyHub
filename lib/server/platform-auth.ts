import "server-only"
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"
import { unlink } from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"
import { dataDirectory, readRecord, writeRecord } from "./platform-store"

export const SESSION_COOKIE = "penny_session"
export const SESSION_SECONDS = 60 * 60 * 12
type Account = { username: string; salt: string; passwordHash: string }
type Session = { username: string; expiresAt: number }
const sessionName = (token: string) =>
  `sessions/${createHash("sha256").update(token).digest("hex")}.json`

export async function authenticate(username: string, password: string) {
  const account = await readRecord<Account>("account.json")
  if (!account) return { kind: "uninitialized" } as const
  const hash = scryptSync(password, account.salt, 64)
  const stored = Buffer.from(account.passwordHash, "hex")
  if (
    hash.length !== stored.length ||
    !timingSafeEqual(hash, stored) ||
    username !== account.username
  ) {
    return { kind: "invalid" } as const
  }
  const token = randomBytes(32).toString("hex")
  await writeRecord(sessionName(token), {
    username,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  })
  return { kind: "success", token, username } as const
}

export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const session = await readRecord<Session>(sessionName(token))
  return session && session.expiresAt > Date.now() ? session : null
}

export async function deleteSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await unlink(path.join(dataDirectory(), sessionName(token))).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
      }
    )
  }
}
