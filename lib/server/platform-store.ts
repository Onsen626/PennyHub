import "server-only"
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"
import path from "node:path"

// Persistent single-machine PoC data. Never import this module into client code.
export function dataDirectory() {
  return path.resolve(process.env.PENNY_DATA_DIR || ".pennyagent")
}

export async function readRecord<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(
      await readFile(path.join(dataDirectory(), name), "utf8")
    ) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function writeRecord(name: string, value: unknown) {
  const destination = path.join(dataDirectory(), name)
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
  const temporary = `${destination}.${randomBytes(8).toString("hex")}.tmp`
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 })
  await rename(temporary, destination)
}

async function encryptionKey() {
  const keyPath = path.join(dataDirectory(), "master.key")
  await mkdir(dataDirectory(), { recursive: true, mode: 0o700 })
  try {
    await writeFile(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
  return readFile(keyPath)
}

export async function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")
}

export async function decryptSecret(value: string) {
  const bytes = Buffer.from(value, "base64")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    await encryptionKey(),
    bytes.subarray(0, 12)
  )
  decipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8")
}
