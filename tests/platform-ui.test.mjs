import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import http from "node:http"
import { chromium, expect } from "@playwright/test"
import { createPlatformServer } from "./helpers/platform-server.mjs"

test("browser login, Models configuration, connection feedback, restart, and logout", async () => {
  const platform = await createPlatformServer()
  let browser
  const requests = []
  let status = 200
  const upstream = http.createServer(async (req, res) => {
    let body = ""
    for await (const chunk of req) body += chunk
    requests.push({ auth: req.headers.authorization, body: JSON.parse(body) })
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify(
        status === 200
          ? { choices: [{ message: { content: "UI HTTP fixture response" } }] }
          : { error: { message: "ui-fixture-secret" } }
      )
    )
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "ui-tester",
        PENNY_ADMIN_PASSWORD: "Penny-UI-test-password-2026",
      },
    })
    await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
    const endpoint = `http://127.0.0.1:${upstream.address().port}/v1`
    const installedChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    const executablePath =
      process.env.PENNY_CHROME_PATH ||
      (existsSync(installedChrome) ? installedChrome : undefined)
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    })
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(platform.base)
    await expect(page).toHaveURL(`${platform.base}/login`)
    await page.getByLabel("用户名", { exact: true }).fill("ui-tester")
    await page.getByLabel("密码", { exact: true }).fill("wrong-password")
    await page.getByRole("button", { name: "登录", exact: true }).click()
    await expect(
      page.getByRole("alert").filter({ hasText: "用户名或密码错误" })
    ).toBeVisible()
    await page
      .getByLabel("密码", { exact: true })
      .fill("Penny-UI-test-password-2026")
    await page.getByRole("button", { name: "登录", exact: true }).click()
    await expect(page).toHaveURL(platform.base + "/")
    await page.getByRole("button", { name: "Models", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "Models", exact: true })
    ).toBeVisible()
    await page.getByLabel("接口地址", { exact: true }).fill(endpoint)
    await page.getByLabel("模型名称", { exact: true }).fill("ui-fixture-model")
    await page.getByLabel(/API Key/).fill("ui-fixture-secret")
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/model-config") && r.request().method() === "PUT"
    )
    await page.getByRole("button", { name: "保存配置", exact: true }).click()
    assert.ok(!(await (await saved).text()).includes("ui-fixture-secret"))
    await expect(
      page.getByRole("status").filter({ hasText: "配置已保存" })
    ).toBeVisible()
    await expect(page.getByLabel(/API Key/)).toHaveValue("")
    await page.getByRole("button", { name: "测试连接", exact: true }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "连接成功" })
    ).toBeVisible({ timeout: 20000 })
    assert.equal(requests.at(-1).auth, "Bearer ui-fixture-secret")
    assert.equal(requests.at(-1).body.model, "ui-fixture-model")
    status = 401
    await page.getByRole("button", { name: "测试连接", exact: true }).click()
    await expect(
      page.getByRole("alert").filter({ hasText: "鉴权失败" })
    ).toBeVisible()
    assert.ok(
      !(await page.locator("body").innerText()).includes("ui-fixture-secret")
    )
    await page.reload()
    await page.getByRole("button", { name: "Models", exact: true }).click()
    await expect(page.getByLabel("接口地址", { exact: true })).toHaveValue(
      endpoint
    )
    await expect(page.getByLabel("模型名称", { exact: true })).toHaveValue(
      "ui-fixture-model"
    )
    await platform.stop()
    await platform.start()
    await page.goto(platform.base)
    await expect(page).toHaveURL(platform.base + "/")
    await page.getByRole("button", { name: "Models", exact: true }).click()
    await expect(page.getByLabel("模型名称", { exact: true })).toHaveValue(
      "ui-fixture-model"
    )
    await page.screenshot({
      path: "docs/verification/issue-2/models-browser.png",
      fullPage: true,
    })
    await page.getByRole("button", { name: "退出登录", exact: true }).click()
    await expect(page).toHaveURL(`${platform.base}/login`)
    assert.equal(
      (await context.request.get(platform.base + "/api/model-config")).status(),
      401
    )
  } finally {
    await browser?.close()
    upstream.closeAllConnections()
    await new Promise((resolve) => upstream.close(resolve))
    await platform.dispose()
  }
})
