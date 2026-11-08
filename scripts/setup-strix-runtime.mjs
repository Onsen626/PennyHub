import { spawn } from "node:child_process"
import path from "node:path"

const source = path.resolve(process.env.PENNY_STRIX_SOURCE || "third_party/strix")
const child = spawn("uv", ["sync", "--frozen"], {
  cwd: source,
  stdio: "inherit",
  env: { ...process.env, UV_LINK_MODE: "copy" },
})
child.on("error", (error) => {
  console.error(`无法启动 uv：${error.message}`)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  if (signal) process.exitCode = 1
  else process.exitCode = code ?? 1
})
