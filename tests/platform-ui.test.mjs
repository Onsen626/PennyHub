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

    // Spec #25: Verify bottom-left sidebar footer is cleaned up and topbar has "设置" instead of "退出登录"
    const sidebar = page.locator('[data-slot="sidebar"]').first()
    await expect(sidebar).not.toContainText("2026.3.29.1")
    await expect(sidebar).not.toContainText("AI 原生安全运营与渗透平台")
    await expect(sidebar).not.toContainText("AI 安全运营与渗透平台")
    await expect(
      sidebar.getByRole("button", { name: "切换主题", exact: true })
    ).toHaveCount(0)
    await expect(
      sidebar.getByRole("button", { name: /设置/, exact: false })
    ).toHaveCount(0)
    await expect(
      sidebar.getByRole("button", { name: "AI Copilot", exact: true })
    ).toHaveCount(0)

    const topbar = page.locator("header").first()
    await expect(
      topbar.getByRole("button", { name: "退出登录", exact: true })
    ).toHaveCount(0)
    const settingsBtn = topbar.getByRole("button", {
      name: "设置",
      exact: true,
    })
    await expect(settingsBtn).toBeVisible()

    // Spec #25: Clicking "设置" opens Settings dialog on General by default
    await settingsBtn.click()
    const settingsDialog = page.getByRole("dialog", { name: "Settings" })
    await expect(settingsDialog).toBeVisible()
    await expect(
      settingsDialog.getByRole("heading", { name: "General", exact: true })
    ).toBeVisible()

    // Spec #25: General has Workspace name, Language, Timezone, Theme, and 退出登录
    const wsInput = settingsDialog.getByRole("textbox", {
      name: "Workspace name",
      exact: true,
    })
    await expect(wsInput).toHaveValue("Acme Inc")
    await wsInput.fill("Penny Workspace")
    await expect(wsInput).toHaveValue("Penny Workspace")

    const themeTrigger = settingsDialog.getByRole("combobox", {
      name: "Theme",
      exact: true,
    })
    await expect(themeTrigger).toBeVisible()
    const selectOption = async (trigger, optionName) => {
      await expect(page.getByRole("listbox")).toHaveCount(0)
      await trigger.click()
      await page.getByRole("option", { name: optionName, exact: true }).click()
      await expect(page.getByRole("listbox")).toHaveCount(0)
    }

    await selectOption(themeTrigger, "Dark")
    await expect(page.locator("html")).toHaveClass(/dark/)

    await selectOption(themeTrigger, "Light")
    await expect(page.locator("html")).toHaveClass(/light/)

    await selectOption(themeTrigger, "Dark")
    await expect(page.locator("html")).toHaveClass(/dark/)

    // Spec #25: Appearance has Density and NO duplicate Theme control
    await settingsDialog
      .getByRole("button", { name: "Appearance", exact: true })
      .click()
    await expect(
      settingsDialog.getByRole("heading", { name: "Appearance", exact: true })
    ).toBeVisible()
    await expect(
      settingsDialog.getByText("Density", { exact: true })
    ).toBeVisible()
    await expect(
      settingsDialog.getByRole("combobox", { name: "Theme", exact: true })
    ).toHaveCount(0)

    // Spec #25: Other sections (Notifications, Security, Members) work without regression
    await settingsDialog
      .getByRole("button", { name: "Notifications", exact: true })
      .click()
    await expect(
      settingsDialog.getByRole("switch", { name: "Daily digest", exact: true })
    ).toBeVisible()
    await settingsDialog
      .getByRole("button", { name: "Security", exact: true })
      .click()
    await expect(
      settingsDialog.getByRole("switch", {
        name: "Two-factor authentication",
        exact: true,
      })
    ).toBeVisible()
    await settingsDialog
      .getByRole("button", { name: "Members", exact: true })
      .click()
    await expect(
      settingsDialog.getByText("Jane Doe", { exact: true })
    ).toBeVisible()

    // Spec #25: Narrow mobile viewport section Select switcher works
    await page.setViewportSize({ width: 480, height: 800 })
    const sectionSelect = settingsDialog.getByRole("combobox", {
      name: "Section",
      exact: true,
    })
    await expect(sectionSelect).toBeVisible()
    await selectOption(sectionSelect, "Appearance")
    await expect(
      settingsDialog.getByText("Density", { exact: true })
    ).toBeVisible()
    await expect(
      settingsDialog.getByRole("combobox", { name: "Theme", exact: true })
    ).toHaveCount(0)
    await selectOption(sectionSelect, "General")
    await expect(
      settingsDialog.getByRole("combobox", { name: "Theme", exact: true })
    ).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 720 })

    // Close Settings and verify theme persists across reload
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)

    // Switch back to System theme in General
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await selectOption(themeTrigger, "System")
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()

    // Spec #25: Verify "设置" button works from Dashboard, Pentests, chat drawer, and chat fullscreen
    await sidebar.getByRole("button", { name: "Dashboard", exact: true }).click()
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()

    await topbar.getByRole("button", { name: "AI Copilot", exact: true }).click()
    const chatbot = page.getByTestId("secops-chatbot")
    await expect(chatbot).toHaveAttribute("data-chat-mode", "drawer")
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()

    await page.getByRole("button", { name: "全屏展开", exact: true }).click()
    await expect(chatbot).toHaveAttribute("data-chat-mode", "workspace")
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()
    await page.getByRole("button", { name: "关闭聊天", exact: true }).click()

    await sidebar.getByRole("button", { name: "Pentests", exact: true }).click()
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()

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

    // Spec #25: Logout from Settings -> General with failure retry & success redirect
    await settingsBtn.click()
    await expect(settingsDialog).toBeVisible()
    await expect(
      settingsDialog.getByRole("heading", { name: "General", exact: true })
    ).toBeVisible()

    let failOnce = true
    await page.route("**/api/auth/logout", async (route) => {
      if (failOnce) {
        failOnce = false
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "failed" } }),
        })
        return
      }
      await route.continue()
    })

    await settingsDialog
      .getByRole("button", { name: "退出登录", exact: true })
      .click()
    await expect(
      settingsDialog.getByRole("alert").filter({ hasText: "退出失败，请重试。" })
    ).toBeVisible()
    await expect(settingsDialog).toBeVisible()

    await settingsDialog
      .getByRole("button", { name: "退出登录", exact: true })
      .click()
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
