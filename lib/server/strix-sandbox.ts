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
