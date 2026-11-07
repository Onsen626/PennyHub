# Issue #8 实施进度：Home 与 Copilot 双形态

## 1. 工单与规范核查（已完成）
- 已读取 GitHub Issue #8 正文、`AGENTS.md`、`node_modules/next/dist/docs/index.md`、`docs/design/Strix_PoC_功能与交互设计.md`、`docs/specs/Strix_PoC_实施规格.md` 及现有认证/模型配置实现。
- 已确认工作目录分支 `ci-platform-checks`，保持既有修改与未提交状态不变。

## 2. 文件计划与接口约定

### 新增与修改文件清单
1. `lib/server/chat-sessions.ts`（新建）：会话与消息持久化服务（存储于 `PENNY_DATA_DIR/chat-sessions.json`），复用 `readModelConfig()` 调用 `${baseUrl}/chat/completions`，不打印或回传 API Key，不因普通问答创建 Strix 测试任务。
2. `app/api/chat/sessions/route.ts`（新建）：
   - `GET /api/chat/sessions`：读取已保存的会话列表与最近活跃会话。
   - `POST /api/chat/sessions`：新建聊天会话。
3. `app/api/chat/sessions/[sessionId]/route.ts`（新建）：
   - `GET /api/chat/sessions/[sessionId]`：读取指定会话详情及历史消息、附件元数据。
4. `app/api/chat/sessions/[sessionId]/messages/route.ts`（新建）：
   - `POST /api/chat/sessions/[sessionId]/messages`：发送消息（支持 `clientMessageId` 幂等防重、附件元数据保存），调用当前模型配置获取回复并持久化。
5. `components/chat/home-chat-composer.tsx`（新建）：Home 页面聊天输入框组件（参考截图布局，沿用现有 Fluid 视觉与 `InputMessage` 组件，支持附件与快捷建议；发送后进入主内容区全屏聊天且首条消息只发送一次）。
6. `components/chat/secops-chatbot.tsx`（修改）：接入真实会话 API，支持全屏（`fullscreen`，占据主内容区并保留左侧导航）与侧边栏（`drawer`）双形态切换、展开/收起/关闭控制，共用同一会话、消息、草稿与附件，刷新后自动恢复会话历史。
7. `lib/flocks-data.ts`（小范围修改）：
   - 从 `FLOCKS_NAV_ITEMS` 移除 `sessions` 独立侧栏入口（保留会话数据结构）。
   - `zhCopy.nav.tasks` 设为 `"Pentests"`（保留模块 ID `"tasks"`），`zhCopy.nav.workspace` 设为 `"现有风险"`。
8. `components/platform/flocks-page.tsx`（仅修改聊天入口/形态/导航衔接）：
   - 保留已移除页眉搜索和栏目标注后的顶栏结构。
   - 聊天打开时右上角 `AI Copilot` 按钮切换为 `开始渗透测试`，点击跳转 Pentests（`activeModule = "tasks"`）并退出全屏聊天覆盖，不直接启动任务。
   - Home 保留现有展示项目，增加 `HomeChatComposer` 输入框；从 Home 发送默认进入主内容区全屏聊天，从其他页面或顶栏/侧栏唤起默认打开右侧边栏。
   - 全屏切回侧边栏或关闭时恢复原页面及其筛选/视图状态。
   - `workspace`（现有风险）保持原有展示内容不变；`channels`（协同通道）保留侧栏入口并展示空状态。
9. `tests/chat-copilot.test.mjs`（新建）：独立 API 与 Playwright 浏览器行为测试。
10. `docs/implementation/issue-8-copilot.md`（新建）：最终实施与测试证据报告。

## 3. 实施记录
- [x] `lib/flocks-data.ts`：已移除 `FLOCKS_NAV_ITEMS` 中的 `sessions` 独立侧栏入口，将 `zhCopy.nav.tasks` 设为 `"Pentests"`、`zhCopy.nav.workspace` 设为 `"现有风险"`，并新增 `zhCopy.common.startPentest = "开始渗透测试"`。
- [x] `lib/server/chat-sessions.ts`：已实现会话与消息持久化服务（`chat-sessions.json`），支持 `clientMessageId` 幂等防重、附件元数据记录、复用 `readModelConfig()` 调用 OpenAI Chat Completions 接口及错误分类（失败不记录为成功消息，不泄露 API Key，普通问答不启动 Strix 任务）。
- [x] `app/api/chat/sessions/route.ts`、`app/api/chat/sessions/[sessionId]/route.ts`、`app/api/chat/sessions/[sessionId]/messages/route.ts`：已实现受会话认证与同源检查保护的公开聊天会话接口。
- [x] `components/chat/home-chat-composer.tsx`：已实现 Home 页面内嵌聊天输入框组件，支持附件元数据选择、快捷提问建议词及发送后切入全屏聊天。
- [x] `components/chat/secops-chatbot.tsx`：已对接真实 `/api/chat/sessions` 与 `/api/chat/sessions/[sessionId]/messages` 接口，支持 `workspace`（主内容区全屏）与 `drawer`（右侧边栏）双形态切换、关闭、共享同一会话/草稿/附件、首条消息幂等防重、失败保留用户输入并支持明确重试。
- [x] `components/platform/flocks-page.tsx`：已完成 Home 聊天入口接入、`fullscreen`（占据主内容区并保留左侧导航）与 `drawer`（右侧边栏）双形态挂载、切回侧边栏恢复原页面状态、聊天打开时右上角切换为「开始渗透测试」并跳转 Pentests、现有风险内容保留与协同通道空状态展示。
- [x] `tests/chat-copilot.test.mjs`：已新增并运行独立 API 与 Playwright 浏览器测试，3 项测试全部通过（退出码 0），并生成验证截图 `docs/verification/issue-8/home-composer.png` 与 `docs/verification/issue-8/copilot-fullscreen.png`。
- [x] 真实模型调用验证：使用隔离数据目录复用本机已保存的 `deepseek-flash` 模型配置，通过 `POST /api/chat/sessions/ses-default/messages` 完成一次真实模型问答验证（HTTP 200），非敏感结果保存于 `docs/verification/issue-8/live-model-chat.json`。
- [x] `npm run typecheck` 与 `npm run lint` 均退出码 0 通过。
- [x] 按用户截图要求移除 Home 顶部 `Flocks / AI-Native SecOps` Hero 横幅卡片（`components/platform/flocks-page.tsx`），Home 首屏直接置顶展示 `HomeChatComposer` 对话输入框及下方既有卡片。

## 2026-11-07 09:24 — 首页 Prompt Composer 与 Copilot 对话按 Fluid Functionalism + Strix Home 布局重构
- 按用户指定组件分工与截图要求更新 [home-chat-composer.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/home-chat-composer.tsx) 与 [secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx)：
  - **无外层包裹卡片、移除冗余栏**：去除首页 Composer 外层边框卡片，移除顶部状态徽章栏、`前往 Pentests 向导`、`打开全屏会话`、副标题段落及推荐模板左侧说明文字。
  - **Hero 标题**：使用 Fluid Typography（`typeClass("display")` + `fontWeights.semibold`）居中展示 `今天需要验证哪个安全目标？`。
  - **主输入框与附件上传**：使用 `InputMessage` 及内置文件选择/缩略图预览功能，发送或点击推荐任务卡片自动进入全屏会话。
  - **分类切换与推荐任务卡片**：使用 Fluid `Tabs`（`Web` / `Code` / `Cloud` / `Recon` / `Network` / `Threat Intel` / `Compliance`）+ `CardGroup` + `Card`（双列流体悬停卡片）。
  - **对话流与执行步骤**：在 `SecOpsChatbot` 中使用 `ChatMessage`、`ThinkingIndicator` 与 `ThinkingSteps`（`ThinkingStepsHeader`、`ThinkingStepsContent`、`ThinkingStep`、`ThinkingStepDetails`、`ThinkingStepSources`、`ThinkingStepSource`）呈现上下文解析、模型推理与 Strix 任务衔接状态。
- 验证结果：
  - `npm run typecheck` -> `exit code 0`
  - `npm run lint` -> `exit code 0`（0 errors）
  - `node --test tests/chat-copilot.test.mjs` -> 3/3 通过（`exit code 0`），并更新 `docs/verification/issue-8/home-composer.png` 与 `docs/verification/issue-8/copilot-fullscreen.png`。

## 2026-11-07 09:35 — 首页大标题间距调整与 Dashboard 独立页面拆分
- 按用户截图要求调整 [home-chat-composer.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/home-chat-composer.tsx)、[flocks-data.ts](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/lib/flocks-data.ts) 与 [flocks-page.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/flocks-page.tsx)：
  - **大标题上下间距与居中呼吸感**：`HomeChatComposer` 容器改为 `max-w-3xl pt-14 pb-10 sm:pt-20 sm:pb-14`，大标题增加 `my-4 sm:my-6 sm:text-4xl`，对齐 Strix 首页视觉比例。
  - **新增 `AI 安全工作台 -> Dashboard` 独立页面**：将原本位于首页 Composer 下方的红队授权门禁 Banner、3 个快捷入口卡片（Sessions / Workflows / Agents）与 8 宫格指标卡原样迁移至 `AI 安全工作台` 下的 `Dashboard` 页面；`控制台首页` 仅展示纯净的 Agent Home Composer。
- 验证结果：
  - `npm run typecheck` -> `exit code 0`
  - `npm run lint` -> `exit code 0`（0 errors）
  - `node --test tests/chat-copilot.test.mjs` -> 3/3 通过（`exit code 0`），截图已更新至 `docs/verification/issue-8/home-composer.png`。

## 2026-11-07 09:45 — 修复 AI Copilot 对话框高度超出单屏问题
- 修复 [flocks-page.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/flocks-page.tsx) 与 [secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx) 的视口高度约束：
  - 将 `SidebarInset` 高度锁定在单屏视口内（`h-dvh max-h-dvh min-h-0 overflow-hidden md:h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-1rem)]`），主内容 `<main>` 与右侧/全屏 Copilot `<aside>` 均设置 `min-h-0 overflow-hidden`，避免长列表页面（如 Tools 149 项）撑高外层容器导致 Copilot 弹窗超出屏幕。
  - 在 `SecOpsChatbot` 内部补齐 `h-full max-h-full min-h-0` 与消息区 `min-h-0 flex-1 overflow-y-auto`，并移除底部输入框冗余的常驻建议列表，使对话框始终保持在一屏高度内。
- 在 [chat-copilot.test.mjs](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/tests/chat-copilot.test.mjs) 新增 `drawer` 与 `workspace` 两种形态的 `boundingBox` 单屏高度断言（`y + height <= viewport.height`），3/3 测试全部通过（`exit code 0`）。

## 2026-11-07 12:59 — 去除首页 AI Copilot 入口与切换侧边栏按钮
- 修改 [inset-topbar.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/sidebar-app/inset-topbar.tsx) 与 [flocks-page.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/flocks-page.tsx)：
  - 移除顶部栏左上角的 `<SidebarTrigger />`（`Toggle Sidebar` 切换侧边栏按钮）。
  - 在 `控制台首页`（`activeModule === "home"`）移除顶部栏右上角及左侧边栏底部的 `AI Copilot` 入口按钮（非首页模块仍保留 `AI Copilot` 入口）。
  - 在首页进入全屏对话时移除对话框右上角的 `切回侧边栏` 按钮（仅保留 `关闭聊天`）。
- 更新 [chat-copilot.test.mjs](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/tests/chat-copilot.test.mjs) 并验证通过：`npm run typecheck`（0）、`npm run lint`（0）、`node --test tests/chat-copilot.test.mjs`（3/3 通过）。

## 2026-11-07 13:10 — 统一全屏对话视图并移除所有入口下的“切回侧边栏”按钮
- 核查并清理 [flocks-page.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/flocks-page.tsx) 与 [secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx)：
  - 确认全站仅保留唯一共享的 `<SecOpsChatbot>` 实例（清理了旧 `activeModule === "sessions"` 残留分支），从主页发起对话与从其他模块点击 `AI Copilot -> 全屏展开` 进入的是完全相同的共享会话与组件实例。
  - 从 `SecOpsChatbot` 全屏模式（`mode === "workspace"`）中彻底删除 `切回侧边栏` 按钮，无论从主页还是从 `AI Copilot` 进入全屏对话均不再显示 `切回侧边栏` 按钮。
- 验证结果：`npm run typecheck`（0）、`npm run lint`（0）、`node --test tests/chat-copilot.test.mjs`（3/3 通过）。

## 2026-11-07 13:28 — 移除 Agent 执行步骤展示（仅保留 ThinkingIndicator）与 Code Review 聊天文案
- 修改 [secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx) 与 [home-chat-composer.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/home-chat-composer.tsx)：
  - 移除 `ThinkingSteps`、`ThinkingStepsHeader`、`ThinkingStepsContent`、`ThinkingStep`、`ThinkingStepDetails`、`ThinkingStepSources`、`ThinkingStepSource` 的导入与渲染，对话请求中仅展示 `ThinkingIndicator`（`data-testid="thinking-indicator"`）。
  - 清理聊天相关文案中的 `Code Review`，仅保留 `Web App Pentest`；聊天顶部「开始渗透测试」按钮仅跳转 `Pentests`，不直接启动任务。
- 更新 [chat-copilot.test.mjs](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/tests/chat-copilot.test.mjs)，新增 `ThinkingIndicator` 可见、`ThinkingSteps`（Agent 执行步骤）不可见以及不含 `Code Review` 文案的断言。
- 验证结果：`npm run typecheck`（退出码 0）、`npm run lint`（退出码 0，0 errors）、`node --test tests/chat-copilot.test.mjs`（3/3 通过，耗时 25242ms），已更新 `docs/verification/issue-8/home-composer.png` 与 `docs/verification/issue-8/copilot-fullscreen.png`。

## 2026-11-07 14:10 — 移除聊天界面顶部副标题文案
- 修改 [secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx)，删除头部标题下方的 `普通聊天复用当前模型配置 · 不会自动创建 Strix 测试任务` 文本。
