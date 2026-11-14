import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

export async function createPlatformServer({
  distDir = ".next-platform-test",
  env: overrides = {},
} = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "penny-platform-"))
  const listener = net.createServer()
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve))
  const port = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  const env = {
    ...process.env,
    ...overrides,
    PENNY_DATA_DIR: dataDir,
    PENNY_NEXT_DIST_DIR: distDir,
    NEXT_TELEMETRY_DISABLED: "1",
  }
  const base = `http://127.0.0.1:${port}`
  let server,
    logs = ""
  async function stop() {
    if (!server || server.exitCode !== null) return
    const exited = new Promise((resolve) => server.once("exit", resolve))
    server.kill("SIGTERM")
    await exited
  }
  async function start() {
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--webpack",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { env, stdio: ["ignore", "pipe", "pipe"] }
    )
    server.stdout.on("data", (x) => {
      logs += x
    })
    server.stderr.on("data", (x) => {
      logs += x
    })
    for (let n = 0; n < 120; n++) {
      if (server.exitCode !== null)
        throw new Error(`Test server exited: ${logs.slice(-2000)}`)
      try {
        if ((await fetch(`${base}/login`)).status === 200) return
      } catch {
        /* startup */
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`Test server startup timed out: ${logs.slice(-2000)}`)
  }
  async function dispose() {
    await stop()
    await rm(dataDir, { recursive: true, force: true })
  }
  try {
    await start()
  } catch (error) {
    await dispose()
    throw error
  }
  return { base, env, dataDir, start, stop, dispose, logs: () => logs }
}
