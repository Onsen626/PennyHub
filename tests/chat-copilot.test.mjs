import { test, after } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import http from "node:http"
import { chromium, expect } from "@playwright/test"
import { createPlatformServer } from "./helpers/platform-server.mjs"

const platform = await createPlatformServer()
const { base, env } = platform
after(platform.dispose)

const adminUser = "copilot-tester"
const adminPass = "Penny-Copilot-test-password-2026"
let cookie = ""

test("chat session APIs require authentication and enforce same-origin on writes", async () => {
  execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
    env: {
      ...env,
      PENNY_ADMIN_USERNAME: adminUser,
      PENNY_ADMIN_PASSWORD: adminPass,
    },
  })

  const unauthList = await fetch(`${base}/api/chat/sessions`)
  assert.equal(unauthList.status, 401)
  assert.equal((await unauthList.json()).error.code, "UNAUTHENTICATED")

  const unauthSend = await fetch(
    `${base}/api/chat/sessions/ses-default/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ content: "hello" }),
    }
  )
  assert.equal(unauthSend.status, 401)

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username: adminUser, password: adminPass }),
  })
  assert.equal(login.status, 200)
  cookie = login.headers.get("set-cookie").split(";")[0]

  const crossOrigin = await fetch(`${base}/api/chat/sessions`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ title: "csrf-session" }),
  })
  assert.equal(crossOrigin.status, 403)
  assert.equal((await crossOrigin.json()).error.code, "INVALID_ORIGIN")
})

test("chat API reuses saved model configuration, deduplicates initial message, preserves attachment metadata, and survives restart", async () => {
  const headers = {
    Cookie: cookie,
    "Content-Type": "application/json",
    Origin: base,
  }

  // 1. Sending before model is configured fails with 422 MODEL_NOT_CONFIGURED and does not persist failed message
  const beforeConfig = await fetch(
    `${base}/api/chat/sessions/ses-default/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ content: "你好" }),
    }
  )
  assert.equal(beforeConfig.status, 422)
  assert.equal((await beforeConfig.json()).error.code, "MODEL_NOT_CONFIGURED")

  const initialList = await (
    await fetch(`${base}/api/chat/sessions`, { headers: { Cookie: cookie } })
  ).json()
  assert.equal(initialList.activeSession.messages.length, 0)

  // 2. Start local upstream HTTP model fixture
  let upstreamStatus = 200
  let upstreamReply = "这是来自配置模型的安全咨询回复，未创建任何 Strix 任务。"
  const upstreamRequests = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ""
    for await (const chunk of req) raw += chunk
    upstreamRequests.push({
      path: req.url,
      auth: req.headers.authorization,
      body: JSON.parse(raw),
    })
    res.writeHead(upstreamStatus, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify(
        upstreamStatus === 200
          ? { choices: [{ message: { content: upstreamReply } }] }
          : { error: { message: "leaked-key-chat-secret-999" } }
      )
    )
  })
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
  const endpoint = `http://127.0.0.1:${upstream.address().port}/v1`

  try {
    const saveCfg = await fetch(`${base}/api/model-config`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        baseUrl: endpoint,
        model: "secops-chat-model",
        apiKey: "chat-secret-999",
      }),
    })
    assert.equal(saveCfg.status, 200)

    // 3. Upstream failure does not leak secret and does not record message as succeeded
    upstreamStatus = 401
    const failedTurn = await fetch(
      `${base}/api/chat/sessions/ses-default/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: "测试失败不入库",
          clientMessageId: "cmsg-fail-1",
        }),
      }
    )
    const failedText = await failedTurn.text()
    assert.equal(failedTurn.status, 422)
    assert.equal(JSON.parse(failedText).error.code, "MODEL_AUTH_FAILED")
    assert.ok(!failedText.includes("chat-secret-999"))

    const afterFail = await (
      await fetch(`${base}/api/chat/sessions/ses-default`, {
        headers: { Cookie: cookie },
      })
    ).json()
    assert.equal(afterFail.session.messages.length, 0)

    // 4. Successful chat request with attachment metadata and clientMessageId idempotency
    upstreamStatus = 200
    const send1 = await fetch(
      `${base}/api/chat/sessions/ses-default/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: "请分析 BOLA 越权风险",
          clientMessageId: "cmsg-home-once-001",
          attachments: [
            { name: "openapi-spec.json", size: 2048, type: "application/json" },
          ],
        }),
      }
    )
    assert.equal(send1.status, 200)
    const body1 = await send1.json()
    assert.equal(body1.ok, true)
    assert.equal(body1.deduplicated, false)
    assert.equal(body1.session.messages.length, 2)
    assert.deepEqual(body1.userMessage.attachments, [
      { name: "openapi-spec.json", size: 2048, type: "application/json" },
    ])
    assert.equal(body1.assistantMessage.content, upstreamReply)
    assert.equal(upstreamRequests.at(-1).auth, "Bearer chat-secret-999")
    assert.equal(upstreamRequests.at(-1).body.model, "secops-chat-model")
    assert.match(
      upstreamRequests.at(-1).body.messages.at(-1).content,
      /仅记录文件名、类型和大小.*openapi-spec\.json/
    )

    // Re-submitting with the same clientMessageId does not hit upstream again
    const reqCountBefore = upstreamRequests.length
    const sendDup = await fetch(
      `${base}/api/chat/sessions/ses-default/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: "请分析 BOLA 越权风险",
          clientMessageId: "cmsg-home-once-001",
          attachments: [
            { name: "openapi-spec.json", size: 2048, type: "application/json" },
          ],
        }),
      }
    )
    assert.equal(sendDup.status, 200)
    const bodyDup = await sendDup.json()
    assert.equal(bodyDup.deduplicated, true)
    assert.equal(upstreamRequests.length, reqCountBefore)
    assert.equal(bodyDup.session.messages.length, 2)

    // 5. Persistence across server restart
    await platform.stop()
    await platform.start()

    const afterRestart = await (
      await fetch(`${base}/api/chat/sessions`, { headers: { Cookie: cookie } })
    ).json()
    assert.equal(afterRestart.activeSessionId, "ses-default")
    assert.equal(afterRestart.activeSession.messages.length, 2)
    assert.equal(
      afterRestart.activeSession.messages[0].attachments[0].name,
      "openapi-spec.json"
    )
    assert.equal(afterRestart.activeSession.messages[1].content, upstreamReply)
  } finally {
    upstream.closeAllConnections()
    await new Promise((resolve) => upstream.close(resolve))
  }
})

test("browser verifies Home composer, fullscreen/drawer switching, state retention, navigation renames, and reload persistence", async () => {
  let browser
  let upstreamStatus = 200
  let upstreamDelayMs = 0
  const upstreamRequests = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ""
    for await (const chunk of req) raw += chunk
    const parsed = JSON.parse(raw)
    upstreamRequests.push({
      auth: req.headers.authorization,
      body: parsed,
    })
    if (upstreamDelayMs > 0) {
      await new Promise((r) => setTimeout(r, upstreamDelayMs))
    }
    res.writeHead(upstreamStatus, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify(
        upstreamStatus === 200
          ? {
              choices: [
                {
                  message: {
                    content: `Copilot 真实响应 #${upstreamRequests.length}：已收到您的咨询，普通问答不会启动 Strix 测试任务。`,
                  },
                },
              ],
            }
          : { error: { message: "temporary upstream failure" } }
      )
    )
  })
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
  const endpoint = `http://127.0.0.1:${upstream.address().port}/v1`

  try {
    // Save model config pointing to this upstream fixture
    const saveRes = await fetch(`${base}/api/model-config`, {
      method: "PUT",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: base,
      },
      body: JSON.stringify({
        baseUrl: endpoint,
        model: "ui-copilot-model",
        apiKey: "ui-copilot-secret",
      }),
    })
    assert.equal(saveRes.status, 200)

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

    await page.goto(base)
    await expect(page).toHaveURL(`${base}/login`)
    await page.getByLabel("用户名", { exact: true }).fill(adminUser)
    await page.getByLabel("密码", { exact: true }).fill(adminPass)
    await page.getByRole("button", { name: "登录", exact: true }).click()
    await expect(page).toHaveURL(`${base}/`)

    // 1. Verify sidebar navigation items:
    // - No standalone "Sessions" item in sidebar
    const sidebar = page.locator('[data-slot="sidebar"]')
    await expect(
      sidebar.getByRole("button", { name: "Sessions", exact: true })
    ).toHaveCount(0)
    await expect(
      sidebar.getByRole("button", { name: "Dashboard", exact: true })
    ).toBeVisible()
    await expect(
      sidebar.getByRole("button", { name: "Pentests", exact: true })
    ).toBeVisible()
    await expect(
      sidebar.getByRole("button", { name: "现有风险", exact: true })
    ).toBeVisible()
    await expect(
      sidebar.getByRole("button", { name: "协同通道", exact: true })
    ).toBeVisible()

    // 1.5 Verify "Dashboard" under AI 安全工作台 renders the original dashboard cards & metrics
    await sidebar.getByRole("button", { name: "Dashboard", exact: true }).click()
    await expect(
      page.getByText(/红队授权门禁待确认：支付网关 v3 \(SES-101\)/)
    ).toBeVisible()
    await expect(page.getByText("近 7 日任务", { exact: true })).toBeVisible()

    // 2. Verify "现有风险" renders real Findings panel
    await sidebar.getByRole("button", { name: "现有风险", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "现有风险", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("按任务内发现记录统计，跨任务未合并。来源：Strix。")
    ).toBeVisible()
    await expect(
      page.getByText("发现记录：0 · 结果缺失任务：0 · 读取异常任务：0", { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("当前范围没有发现记录。", { exact: true })
    ).toBeVisible()

    // 3. Verify "协同通道" shows empty state
    await sidebar.getByRole("button", { name: "协同通道", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "协同通道", exact: true })
    ).toBeVisible()
    await expect(page.getByText("暂未配置外部协同通道")).toBeVisible()

    // 4. Go to Tools page, set a filter state, and open AI Copilot from non-Home page (defaults to sidebar drawer)
    await sidebar.getByRole("button", { name: /Tools/ }).click()
    const toolFilter = page.getByPlaceholder("筛选 149 个工具名称或协议...")
    await toolFilter.fill("nuclei")
    await expect(page.getByText("nuclei", { exact: true })).toBeVisible()

    const topbar = page.locator("header").first()
    await topbar.getByRole("button", { name: "AI Copilot", exact: true }).click()
    const chatbot = page.getByTestId("secops-chatbot")
    await expect(chatbot).toBeVisible()
    await expect(chatbot).toHaveAttribute("data-chat-mode", "drawer")
    const viewport = page.viewportSize()
    const drawerBox = await chatbot.boundingBox()
    assert.ok(drawerBox && viewport && drawerBox.y + drawerBox.height <= viewport.height + 1)

    // Top-right button changes to "开始渗透测试" while chat is open
    await expect(
      topbar.getByRole("button", { name: "开始渗透测试", exact: true })
    ).toBeVisible()

    // Switch drawer -> fullscreen, verify "切回侧边栏" is removed in fullscreen, and close chat to verify Tools page & filter "nuclei" are preserved
    await page.getByRole("button", { name: "全屏展开", exact: true }).click()
    await expect(chatbot).toHaveAttribute("data-chat-mode", "workspace")
    await expect(
      page.getByRole("button", { name: "切回侧边栏", exact: true })
    ).toHaveCount(0)
    const fullscreenBox = await chatbot.boundingBox()
    assert.ok(
      fullscreenBox &&
        viewport &&
        fullscreenBox.y + fullscreenBox.height <= viewport.height + 1
    )

    // Close chat and verify underlying Tools page and its filter "nuclei" are preserved
    await page.getByRole("button", { name: "关闭聊天", exact: true }).click()
    await expect(chatbot).toBeHidden()
    await expect(toolFilter).toHaveValue("nuclei")
    await expect(
      topbar.getByRole("button", { name: "AI Copilot", exact: true })
    ).toBeVisible()

    // 5. Return to Home, verify Home chat composer, attach a file, test failure retention + retry, and verify single send in fullscreen
    await sidebar
      .getByRole("button", { name: "控制台首页", exact: true })
      .click()
    const homeInput = page.getByLabel("Home 聊天输入框", { exact: true })
    await expect(homeInput).toBeVisible()
    // Home removes the topbar AI Copilot entry and the sidebar toggle button
    await expect(
      topbar.getByRole("button", { name: "AI Copilot", exact: true })
    ).toHaveCount(0)
    await expect(
      topbar.getByRole("button", { name: "Toggle Sidebar", exact: true })
    ).toHaveCount(0)
    // Collapsing the sidebar reveals the restore button in the topbar, and clicking it expands the sidebar again
    await sidebar.locator('[data-sidebar="rail"]').click()
    await expect(sidebar).toHaveAttribute("data-state", "collapsed")
    const restoreSidebarBtn = topbar.getByRole("button", {
      name: "Toggle Sidebar",
      exact: true,
    })
    await expect(restoreSidebarBtn).toBeVisible()
    await restoreSidebarBtn.click()
    await expect(sidebar).toHaveAttribute("data-state", "expanded")
    await expect(restoreSidebarBtn).toHaveCount(0)
    await expect(
      page.getByRole("heading", { name: "今天需要验证哪个安全目标？", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("tablist", { name: "推荐任务分类", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: "使用推荐任务：测试 API 越权与访问控制",
        exact: true,
      })
    ).toBeVisible()

    await mkdir("docs/verification/issue-8", { recursive: true })
    await page.screenshot({
      path: "docs/verification/issue-8/home-composer.png",
      fullPage: true,
    })

    // Attach a file in the Home composer
    const homeComposerSection = page.getByLabel("Home AI Copilot 对话入口")
    await homeComposerSection.locator('input[type="file"]').setInputFiles({
      name: "target-scope.yaml",
      mimeType: "text/yaml",
      buffer: Buffer.from("target: api.internal\n"),
    })
    await expect(
      homeComposerSection.getByText(/已选 1 个附件/)
    ).toBeVisible()

    // Simulate one failed upstream response first to verify input retention & explicit retry
    upstreamStatus = 500
    await homeInput.fill("从首页发起安全架构咨询，请给出演示建议")
    await homeInput.press("Enter")

    // Enters fullscreen mode automatically
    await expect(chatbot).toBeVisible()
    await expect(chatbot).toHaveAttribute("data-chat-mode", "workspace")

    // Error alert appears and user draft is retained
    await expect(
      chatbot.getByRole("alert").filter({ hasText: "HTTP 500" })
    ).toBeVisible()
    await expect(
      page.getByLabel("Copilot 聊天输入框", { exact: true })
    ).toHaveValue("从首页发起安全架构咨询，请给出演示建议")

    // Restore upstream to 200 with a brief delay to verify ThinkingIndicator is visible and ThinkingSteps is absent
    upstreamStatus = 200
    upstreamDelayMs = 600
    const countBeforeRetry = upstreamRequests.length
    await page.getByRole("button", { name: "重试发送", exact: true }).click()

    await expect(chatbot.getByTestId("thinking-indicator")).toBeVisible()
    await expect(
      chatbot.getByText(/Agent 执行步骤|Agent 正在执行安全研判步骤/)
    ).toHaveCount(0)

    await expect(
      chatbot.getByText(/Copilot 真实响应 #/)
    ).toBeVisible()
    upstreamDelayMs = 0
    assert.equal(upstreamRequests.length, countBeforeRetry + 1)

    // Verify attachment metadata badge is displayed, ThinkingSteps is absent, and chat copy has no "Code Review"
    await expect(
      chatbot.getByText(/附件元数据（仅文件名\/类型\/大小）：target-scope\.yaml/)
    ).toBeVisible()
    await expect(
      chatbot.getByText(/Agent 执行步骤|已完成安全研判与 Strix 范围映射/)
    ).toHaveCount(0)
    assert.ok(!(await chatbot.innerText()).includes("Code Review"))

    // On Home fullscreen chat, "切回侧边栏" button is removed, and no duplicate request is sent
    await expect(
      page.getByRole("button", { name: "切回侧边栏", exact: true })
    ).toHaveCount(0)
    assert.equal(upstreamRequests.length, countBeforeRetry + 1)

    await page.screenshot({
      path: "docs/verification/issue-8/copilot-fullscreen.png",
      fullPage: true,
    })

    // 6. Reload the page and verify session history and attachment metadata are restored
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(homeInput).toBeVisible()
    await expect(async () => {
      if (await chatbot.isHidden()) {
        await sidebar
          .getByRole("button", { name: "Dashboard", exact: true })
          .click()
        const copilotBtn = topbar.getByRole("button", {
          name: "AI Copilot",
          exact: true,
        })
        if (await copilotBtn.isVisible()) {
          await copilotBtn.click()
        }
      }
      await expect(chatbot).toBeVisible()
    }).toPass({ timeout: 25000 })
    await expect(
      chatbot.getByText("从首页发起安全架构咨询，请给出演示建议")
    ).toBeVisible()
    await expect(
      chatbot.getByText(/附件元数据（仅文件名\/类型\/大小）：target-scope\.yaml/)
    ).toBeVisible()
    await expect(chatbot.getByText(/Copilot 真实响应 #/)).toBeVisible()

    // 7. Clicking top-right "开始渗透测试" while chat is open navigates to Pentests without starting a task
    await topbar
      .getByRole("button", { name: "开始渗透测试", exact: true })
      .click()
    await expect(
      page.getByRole("heading", { name: /Pentests/ })
    ).toBeVisible()
  } finally {
    await browser?.close()
    upstream.closeAllConnections()
    await new Promise((resolve) => upstream.close(resolve))
  }
})
