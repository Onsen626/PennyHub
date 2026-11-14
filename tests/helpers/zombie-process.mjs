// Creates a real zombie: a forked child that exits while its parent sleeps
// without reaping it. SIGTERM/SIGKILL do nothing, kill(pid, 0) still succeeds.
import { execFileSync, spawn } from "node:child_process"
import { existsSync } from "node:fs"

export function python() {
  if (process.env.PENNY_TEST_PYTHON) return process.env.PENNY_TEST_PYTHON
  const venv = "third_party/strix/.venv/bin/python"
  return existsSync(venv) ? venv : "python3"
}

export function isZombieStat(pid) {
  try {
    return execFileSync("ps", ["-o", "stat=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .startsWith("Z")
  } catch {
    return false
  }
}

export async function createZombie() {
  const parent = spawn(
    python(),
    [
      "-c",
      "import os,time; pid=os.fork(); os._exit(0) if pid==0 else (print(pid, flush=True), time.sleep(120))",
    ],
    { stdio: ["ignore", "pipe", "ignore"] }
  )
  const pid = await new Promise((resolve, reject) => {
    let output = ""
    parent.stdout.on("data", (chunk) => {
      output += chunk
      const match = output.match(/^(\d+)/)
      if (match) resolve(Number(match[1]))
    })
    parent.once("error", reject)
    parent.once("exit", (code) =>
      reject(new Error(`zombie parent exited with ${code}`))
    )
  })
  for (let attempt = 0; attempt < 50 && !isZombieStat(pid); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 20))
  return {
    pid,
    stop() {
      try {
        parent.kill("SIGKILL")
      } catch {
        /* already gone */
      }
    },
  }
}
