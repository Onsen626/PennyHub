import "server-only"
import { execFile } from "node:child_process"

// Containers live in their own PID namespace, so they are outside the worker's
// process group. Strix labels them with STRIX_RUN_ID; reaping by that label
// covers the SIGKILL path where the worker never runs its cleanup.
export type SandboxCommandRunner = (
  command: string,
  args: string[]
) => Promise<{ stdout: string }>

function runCommand(
  command: string,
  args: string[]
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: 5000, maxBuffer: 1_000_000 },
      (error, stdout) => {
        if (error) reject(error)
        else resolve({ stdout: String(stdout) })
      }
    )
  })
}

export async function reapStrixSandbox(
  taskId: string,
  runner: SandboxCommandRunner = runCommand
) {
  try {
    const { stdout } = await runner("docker", [
      "ps",
      "-aq",
      "--filter",
      `label=strix-run-id=${taskId}`,
    ])
    const ids = stdout.trim().split(/\s+/).filter(Boolean)
    if (!ids.length) return
    await runner("docker", ["rm", "-f", ...ids])
  } catch {
    // Docker may be unavailable or the container may already be gone.
  }
}

// Strict lifecycle confirmation: command failures and remaining containers are
// observable outcomes; callers retain the active slot until both checks pass.
export async function confirmStrixSandboxCleanup(
  taskId: string,
  runner: SandboxCommandRunner = runCommand
) {
  const args = ["ps", "-aq", "--filter", `label=strix-run-id=${taskId}`]
  try {
    const before = await runner("docker", args)
    const ids = before.stdout.trim().split(/\s+/).filter(Boolean)
    if (ids.length) await runner("docker", ["rm", "-f", ...ids])
    const after = await runner("docker", args)
    if (after.stdout.trim())
      return { sandboxCleared: false, error: "沙箱清理后仍然存在。" }
    return { sandboxCleared: true }
  } catch {
    return {
      sandboxCleared: false,
      error: "沙箱清理检查失败，请重试结束测试。",
    }
  }
}
