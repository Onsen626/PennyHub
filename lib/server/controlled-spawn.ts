import "server-only"
import { spawn, type ChildProcess, type StdioOptions } from "node:child_process"

export type ControlledSpawnOptions = {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdio?: StdioOptions
}

export type WorkerSpawnOptions = {
  cwd?: string
  env?: NodeJS.ProcessEnv
  runId: string
}

// Non-detached child processes. A rogue `detached` option is deliberately
// overridden so callers cannot create an untracked background group.
export function spawnProcess(
  file: string,
  args: string[],
  options: ControlledSpawnOptions = {}
): ChildProcess {
  return spawn(file, args, {
    ...options,
    env: options.env ?? process.env,
    detached: false,
  })
}

// The only place allowed to detach. The worker becomes its own process group
// so stop can signal/confirm the whole group, and it carries the run label used
// to reap its Docker sandbox after a SIGKILL fallback.
export function spawnWorkerProcess(
  file: string,
  args: string[],
  options: WorkerSpawnOptions
): ChildProcess {
  if (!options.runId) throw new Error("spawnWorkerProcess requires a runId")
  return spawn(file, args, {
    cwd: options.cwd,
    env: {
      ...(options.env ?? process.env),
      STRIX_RUN_ID: options.runId,
      STRIX_RUN_TYPE: "pennyagent",
    },
    detached: true,
    stdio: ["pipe", "ignore", "ignore"],
  })
}
