import path from "node:path"

export type InstalledStrixRuntime = { sourcePath: string; python: string }

export function pickStrixRuntime(input: {
  envSource?: string
  envPython?: string
  installed?: InstalledStrixRuntime | null
  installedUsable: boolean
  bundledSource: string
}) {
  const usableInstalled =
    input.installedUsable && input.installed ? input.installed : null
  if (input.envPython)
    return {
      sourcePath:
        input.envSource || usableInstalled?.sourcePath || input.bundledSource,
      executable: input.envPython,
    }
  if (input.envSource)
    return {
      sourcePath: input.envSource,
      executable: path.join(input.envSource, ".venv", "bin", "python"),
    }
  if (usableInstalled)
    return {
      sourcePath: usableInstalled.sourcePath,
      executable: usableInstalled.python,
    }
  return {
    sourcePath: input.bundledSource,
    executable: path.join(input.bundledSource, ".venv", "bin", "python"),
  }
}
