import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { writeFile, mkdir } from "node:fs/promises"
import { chromium, expect } from "@playwright/test"
import { createPlatformServer } from "./helpers/platform-server.mjs"

test("Skills and Tools browse real source, details, categories and task usage without starting scans", async () => {
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
  })
  let browser
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "catalog-reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const chrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    const executablePath =
      process.env.PENNY_CHROME_PATH || (existsSync(chrome) ? chrome : undefined)
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    })
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    })
    let launches = 0
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        /\/start$/.test(new URL(request.url()).pathname)
      )
        launches++
    })
    await page.goto(platform.base)
    await page.getByLabel("用户名", { exact: true }).fill("catalog-reader")
    await page.getByLabel("密码", { exact: true }).fill("catalog-password-2026")
    await page.getByRole("button", { name: "登录", exact: true }).click()
    await expect(page).toHaveURL(platform.base + "/")
    const source = await (
      await page.request.get(`${platform.base}/api/native-catalog`)
    ).json()
    const skillCount = source.items.filter(
      (item) => item.kind === "skill"
    ).length
    const toolCount = source.items.filter((item) => item.kind === "tool").length
    await expect(
      page.getByRole("button", { name: `Skills ${skillCount}`, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: `Tools ${toolCount}`, exact: true })
    ).toBeVisible()
    await page.getByRole("button", { name: /^Skills/ }).click()
    const catalog = page.getByRole("region", { name: "Strix 原生目录" })
    await expect(
      catalog.getByRole("heading", { name: /^Skills/ })
    ).toBeVisible()
    await expect(catalog.getByText(/Strix 1\.7\.0/)).toBeVisible()
    await catalog.getByLabel("搜索目录").fill("quick")
    await catalog
      .getByRole("button", { name: "查看 quick", exact: true })
      .click()
    const detail = catalog.getByRole("region", { name: "目录详情" })
    await expect(detail).toContainText("内部策略")
    await expect(detail).toContainText("strix/skills/scan_modes/quick.md")
    await expect(detail.getByTestId("catalog-content")).toContainText("Quick")
    await expect(catalog).toContainText("请选择任务查看调用记录")
    await page.getByRole("button", { name: /^Tools/ }).click()
    await expect(catalog.getByRole("heading", { name: /^Tools/ })).toBeVisible()
    await catalog.getByLabel("目录分类").selectOption("native_function")
    await catalog.getByLabel("搜索目录").fill("create_note")
    await catalog
      .getByRole("button", { name: "查看 create_note", exact: true })
      .click()
    await expect(detail).toContainText("Document an observation")
    await expect(detail).toContainText("尚未核验")
    await catalog.getByLabel("搜索目录").fill("no-matching-tool")
    await expect(catalog).toContainText("没有符合条件的目录条目")
    const created = await page.request.post(`${platform.base}/api/pentests`, {
      data: { kind: "web_app_pentest", targets: ["https://example.com"] },
    })
    assert.equal(created.status(), 201)
    const { task } = await created.json()
    await writeFile(
      `${platform.dataDir}/pentests/${task.id}/events.jsonl`,
      JSON.stringify({
        type: "agent_event",
        agentId: "catalog-agent",
        at: "2026-11-13T01:00:00Z",
        data: {
          type: "run_item_stream_event",
          name: "tool_called",
          item: {
            raw_item: {
              type: "function_call",
              name: "create_note",
              call_id: "catalog-call",
              arguments: "{}",
            },
          },
        },
      }) + "\n"
    )
    await catalog.getByRole("button", { name: "刷新目录", exact: true }).click()
    await catalog.getByLabel("查看任务调用记录").selectOption(task.id)
    await expect(
      catalog.getByRole("region", { name: "任务调用记录" })
    ).toContainText("catalog-agent")
    await expect(
      catalog.getByRole("link", { name: "查看来源任务", exact: true })
    ).toHaveAttribute("href", `/?view=pentests&task=${task.id}`)
    await catalog.getByLabel("搜索目录").fill("create_note")
    await expect(catalog.getByRole("button", {name: "查看 create_note", exact: true})).toBeVisible()
    await mkdir("docs/verification/issue-10", { recursive: true })
    await page.screenshot({
      path: "docs/verification/issue-10/native-tools.png",
      fullPage: true,
    })
    assert.equal(launches, 0)
  } finally {
    await browser?.close()
    await platform.dispose()
  }
})
