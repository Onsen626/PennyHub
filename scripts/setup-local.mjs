import { randomBytes, scryptSync } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const username = process.env.PENNY_ADMIN_USERNAME || "admin"
const generated = !process.env.PENNY_ADMIN_PASSWORD
const password =
  process.env.PENNY_ADMIN_PASSWORD || randomBytes(18).toString("base64url")
if (
  username.length > 128 ||
  !username.trim() ||
  password.length < 12 ||
  password.length > 1024
) {
  console.error("用户名不能为空，密码长度须为12至1024个字符。")
  process.exit(1)
}
const directory = path.resolve(process.env.PENNY_DATA_DIR || ".pennyagent")
await mkdir(directory, { recursive: true, mode: 0o700 })
const salt = randomBytes(16).toString("hex")
const account = {
  username: username.trim(),
  salt,
  passwordHash: scryptSync(password, salt, 64).toString("hex"),
}
try {
  await writeFile(
    path.join(directory, "account.json"),
    JSON.stringify(account),
    { mode: 0o600, flag: "wx" }
  )
} catch (error) {
  if (error.code === "EEXIST") {
    console.error("管理员已经初始化，原账户保持不变。")
    process.exit(1)
  }
  throw error
}
console.log(`管理员已创建：${account.username}`)
if (generated) console.log(`请保存本次生成的密码（仅显示一次）：${password}`)
console.log("使用 npm run dev 启动本机平台。")
