export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPentestManager } = await import("./lib/server/pentest-manager")
    await startPentestManager()
  }
}
