import { spawn } from "node:child_process"
import path from "node:path"

const source = path.resolve(process.env.PENNY_STRIX_SOURCE || "third_party/strix")
const python = process.env.PENNY_STRIX_PYTHON || path.join(source, ".venv", "bin", "python")
const child = spawn(python, ["scripts/strix-worker.py", "--check", source], {
  stdio: "inherit",
  env: process.env,
})
child.on("error", (error) => {
  console.error(`无法启动 Strix Python 环境：${error.message}`)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  if (signal) process.exitCode = 1
  else process.exitCode = code ?? 1
})
