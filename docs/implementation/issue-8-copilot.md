# 工单 #8：Home 与 Copilot 双形态实施报告

## 1. 实现范围

已按 GitHub Issue [#8](https://github.com/Onsen626/PennyHub/issues/8) 及父规格 [#1](https://github.com/Onsen626/PennyHub/issues/1) 完成 Home 聊天输入入口、AI Copilot 全屏与侧边栏双形态切换、普通聊天连接既有模型配置、会话与消息持久化、导航项更名/调整，以及独立 API 与 Playwright 浏览器验证。

### 核心行为落实
- **Home 聊天输入框与默认全屏**：按用户截图指令移除 Home 顶部旧版 `Flocks / AI-Native SecOps` Hero 介绍横幅，保留 Home 下方状态横幅、快捷卡片与 8 宫格指标展示；首屏顶部直接展示独立组件 `HomeChatComposer`（沿用现有 Fluid 视觉与 `InputMessage` 组件，支持附件与建议提示词）。从 Home 发送消息后默认进入占据主内容区域的全屏聊天（`fullscreen` / `workspace`），左侧导航栏保持可见；其他页面或顶部/侧栏按钮唤起 AI Copilot 时默认打开右侧边栏（`drawer`）。
- **双形态切换、共享状态与首条消息防重**：全屏与侧边栏共用同一 `SecOpsChatbot` 实例、活跃会话、消息历史、输入框草稿与已选附件。提供明确的「全屏展开」「切回侧边栏」「关闭聊天」按钮。通过客户端 `clientMessageId` 记录与服务端 `sendChatMessage` 幂等检查，确保从 Home 发送首条消息进入全屏及切换形态时只发送一次。
- **原页面状态保留与刷新恢复**：全屏聊天通过隐藏主视图容器（`hidden`）保留原页面挂载状态与筛选条件（如 `Tools` 搜索关键词、分类筛选等）；切回侧边栏或关闭聊天后立即恢复原页面及其界面状态。关闭聊天仅收起视图，不终止任何后台任务。会话及消息持久化在 `PENNY_DATA_DIR/chat-sessions.json`，页面刷新或服务重启后自动恢复活跃会话与历史消息。
- **普通聊天复用模型配置与失败重试**：服务端 `lib/server/chat-sessions.ts` 复用 `readModelConfig()` 读取当前保存的单一模型配置（`baseUrl`、`model`、`apiKey`），向 `${baseUrl}/chat/completions` 发起请求；普通问候或问答不会创建或启动 Strix 测试任务。当模型未配置或上游请求失败时，不将失败消息记录为成功入库，前端保留用户输入草稿与附件并提供明确的「重试发送」操作，且绝不回传或打印 API Key。
- **附件元数据明确表达**：本期聊天附件保存并传递文件元数据（`name`、`size`、`type`），在输入框提示、消息气泡徽章及发送给模型的上下文中均明确标注“仅记录文件名、类型和大小，未上传或读取文件正文”，不伪装为模型已读取文件正文。
- **导航调整与顶栏按钮联动**：
  - 移除左侧栏独立的 `Sessions` 导航入口，保留会话数据与聊天能力；
  - 原 `Tasks` 导航显示名改为 `Pentests`（内部模块 ID 保持 `tasks` 以与主线 #3/#5 衔接）；
  - 原 `Workspace` 更名为 `现有风险`，原有展示内容保持不变；
  - `协同通道`（`channels`）保留侧栏入口，展示空状态说明；
  - 当聊天打开（全屏或侧边栏展开）时，右上角原 `AI Copilot` 按钮切换为 `开始渗透测试`，点击后跳转到 `Pentests` 页面并退出全屏聊天覆盖，不直接启动任务。

---

## 2. 修改与新增文件清单

### 新增文件
1. `lib/server/chat-sessions.ts`：聊天会话与消息持久化服务、模型调用适配、`clientMessageId` 幂等去重、附件元数据校验与格式化。
2. `app/api/chat/sessions/route.ts`：`GET`（读取会话列表、活跃会话与公开模型配置摘要）、`POST`（新建会话）、`PATCH`（更新当前活跃会话 ID）。
3. `app/api/chat/sessions/[sessionId]/route.ts`：`GET`（按 ID 读取单个会话详情与历史消息）。
4. `app/api/chat/sessions/[sessionId]/messages/route.ts`：`POST`（向指定会话发送消息、复用 `readModelConfig()` 请求模型并持久化回复）。
5. `components/chat/home-chat-composer.tsx`：Home 页面内嵌 AI Copilot 对话输入框组件。
6. `tests/chat-copilot.test.mjs`：Issue #8 独立 HTTP 接口与 Playwright 浏览器行为测试。
7. `docs/PROGRESS-issue-8.md`：工单 #8 实施进度记录。
8. `docs/implementation/issue-8-copilot.md`：本实施与验证报告。

### 修改文件
1. `lib/flocks-data.ts`：从 `FLOCKS_NAV_ITEMS` 移除 `sessions` 独立项；`zhCopy.nav.tasks` 改为 `"Pentests"`；`zhCopy.nav.workspace` 改为 `"现有风险"`；`zhCopy.common` 新增 `startPentest: "开始渗透测试"`。
2. `components/chat/secops-chatbot.tsx`：对接真实 `/api/chat/sessions` 接口，实现全屏（`workspace`）与侧边栏（`drawer`）切换、关闭、会话新建与切换、附件元数据展示、错误提示与保留草稿重试。
3. `components/platform/flocks-page.tsx`：仅修改聊天入口、全屏/侧边栏双形态挂载、右上角 `AI Copilot` / `开始渗透测试` 按钮切换及 `channels` 空状态展示；保留原有视觉、已删除的页眉搜索/栏目标注及既有模块逻辑。

> 未修改 `lib/server/platform-auth.ts`、`lib/server/platform-http.ts`、`lib/server/platform-store.ts`、`lib/server/model-config.ts`；未修改既有 `tests/platform-api.test.mjs` 与 `tests/platform-ui.test.mjs`。

---

## 3. 公开接口约定

| 操作 | 路径与方法 | 认证与保护 | 说明 |
|---|---|---|---|
| 读取会话列表 | `GET /api/chat/sessions` | `requireSession()` | 返回 `{ activeSessionId, activeSession, sessions, modelConfig }`（不含任何密钥） |
| 创建新会话 | `POST /api/chat/sessions` | `requireSession(request)` | 接收 `{ title?, target? }`，创建并设为当前活跃会话，返回 201 |
| 切换活跃会话 | `PATCH /api/chat/sessions` | `requireSession(request)` | 接收 `{ activeSessionId }`，持久化当前选中会话 |
| 读取单会话 | `GET /api/chat/sessions/[sessionId]` | `requireSession()` | 返回 `{ session }`，不存在时返回 404 `SESSION_NOT_FOUND` |
| 发送聊天消息 | `POST /api/chat/sessions/[sessionId]/messages` | `requireSession(request)` | 接收 `{ content, attachments?, clientMessageId? }`；复用 `readModelConfig()` 请求 `/chat/completions`，成功返回 `{ ok: true, deduplicated, session, userMessage, assistantMessage }` |

---

## 4. 验证与测试证据

### 4.1 独立行为测试（本地 HTTP 模型服务夹具 + 真实 Chrome 浏览器）
- **执行命令**：`node --test tests/chat-copilot.test.mjs`
- **退出状态**：`0`（3 项测试全部通过，耗时约 25.1s）
- **覆盖场景**：
  1. `chat session APIs require authentication and enforce same-origin on writes`：验证未登录访问返回 401 `UNAUTHENTICATED`、跨源写入返回 403 `INVALID_ORIGIN`。
  2. `chat API reuses saved model configuration, deduplicates initial message, preserves attachment metadata, and survives restart`：使用本地独立 HTTP 模型服务夹具验证未配置模型返回 422 `MODEL_NOT_CONFIGURED`、上游 401 返回 422 `MODEL_AUTH_FAILED` 且不泄露 API Key 且不把失败记录为成功消息、正常请求携带 `Bearer` 密钥与附件元数据说明、`clientMessageId` 重复提交幂等返回 `deduplicated: true` 且不重复请求上游、服务重启后会话历史与附件元数据完整保留。
  3. `browser verifies Home composer, fullscreen/drawer switching, state retention, navigation renames, and reload persistence`：使用 Playwright 驱动真实 Chrome 浏览器验证侧栏移除 `Sessions` 独立入口、`现有风险` 更名且保留原内容、`协同通道` 空状态、非 Home 页面（`Tools` 筛选 `"nuclei"`）默认打开侧边栏、全屏与侧边栏切换保留草稿/附件并恢复原页面及筛选词、Home 输入框附加文件并发送默认进入全屏、上游 500 失败保留用户输入并点击「重试发送」成功、首条消息切换形态不重复发送、页面刷新后恢复会话历史与附件元数据、聊天打开时点击右上角「开始渗透测试」跳转 `Pentests` 页面。
- **说明**：上述测试中的上游模型服务为本地 HTTP 夹具，用于确定性验证服务端请求构造、错误分类与浏览器交互，不等同于真实外部大模型推理。

### 4.2 真实外部模型调用验证（DeepSeek `deepseek-flash`）
- **执行方式**：在独立临时 `PENNY_DATA_DIR` 中复用本机 `.pennyagent/master.key` 与 `.pennyagent/model-config.json`（不输出、不记录任何 API Key 明文），通过平台认证后调用 `POST /api/chat/sessions/ses-default/messages` 发送真实普通问答。
- **退出状态**：`0`（HTTP 200，`MODEL=deepseek-flash`）
- **非敏感结果记录**：`docs/verification/issue-8/live-model-chat.json`
  - 请求内容：`"你好，请用一句话介绍你在 PennyAgent 中的职责，不要启动任何测试任务。"`
  - 真实模型响应（`deepseek-flash`）：`"我是 PennyAgent 的安全运营与渗透测试 AI Copilot，负责简洁准确地回答安全问答、提供技术咨询，并协助解读平台与测试相关信息（不会自动启动测试任务）。"`

### 4.3 类型检查与静态检查
- **执行命令**：`npm run typecheck && npm run lint`
- **退出状态**：`0`（TypeScript 0 报错；ESLint 0 错误，仅保留组件库 `components/ui/color-picker.tsx` 原有的 2 条 `unused eslint-disable` 警告）。

### 4.4 截图与验证产物
- `docs/verification/issue-8/home-composer.png`：Home 页面新增 AI Copilot 聊天输入框及更新后的左侧导航截图。
- `docs/verification/issue-8/copilot-fullscreen.png`：从 Home 发送消息并附带文件元数据后进入主内容区全屏聊天、右上角按钮变为「开始渗透测试」的完整页面截图。
- `docs/verification/issue-8/live-model-chat.json`：真实 `deepseek-flash` 模型通过 `/api/chat/sessions/ses-default/messages` 返回的非敏感问答记录。

---

## 5. 未完成项与后续工单边界

- **Issue #8 范围内无未完成项**：工单 #8 全部验收条件均已实现并通过验证。
- **后续工单边界**：
  - 聊天中识别测试需求并生成可检查的任务配置卡片、补齐资料后确认启动真实测试属于 **Issue #9（[PoC 08] 聊天生成并启动测试）** 范围，待 #5 与 #8 完成后衔接；
  - Home 展示真实任务与发现统计属于 **Issue #12（[PoC 11] Home 真实数据展示）** 范围；
  - 当前按协调器要求未执行 `git commit` / `git push` / 分支切换，保留工作区供主线与 #3/#5 统一验收提交。

## 2026-11-07 补充更新：首页 Prompt Composer 重构（Fluid Functionalism + Strix Home 布局）与后端衔接

### 1. 组件分工落地
| 首页与对话区域 | 使用组件 | 对应实现文件 |
| --- | --- | --- |
| Hero 标题 | Fluid Typography (`typeClass("display")` + `fontWeights.semibold`) | `components/chat/home-chat-composer.tsx` |
| 主输入框 & 附件上传 | `InputMessage` 内置 `files`/`onFilesChange`/`openFilePicker`/缩略图预览 | `components/chat/home-chat-composer.tsx`, `components/chat/secops-chatbot.tsx` |
| 场景分类切换 | `Tabs` + `TabsItem` (`Web` / `Code` / `Cloud` / `Recon` / `Network` / `Threat Intel` / `Compliance`) | `components/chat/home-chat-composer.tsx` |
| 推荐任务卡片 | `CardGroup` (`columns={2}`, `separated`, `border="outlined"`, `fluidHover`) + `Card` (`CardHeader`, `CardTitle`, `CardDescription`) | `components/chat/home-chat-composer.tsx` |
| 用户与 Agent 消息 | `ChatMessage`（支持用户/助手不同布局及 `files` 附件缩略图） | `components/chat/secops-chatbot.tsx` |
| Thinking 状态 | `ThinkingIndicator`（本期仅展示 Thinking，不展示 Agent 执行步骤） | `components/chat/secops-chatbot.tsx` |

### 2. 视觉精简与自动全屏跳转
- 移除首页 Prompt Composer 外层包裹卡片，直接采用居中无框布局。
- 移除顶部状态徽章栏、`前往 Pentests 向导`、`打开全屏会话` 按钮、标题下方说明副标题以及 Tabs 左侧冗余标题说明。
- 在首页输入框提交或点击任一推荐任务卡片后，自动携带 `clientMessageId` 进入全屏对话工作区（`copilotMode = "fullscreen"`），且单次发送仅触发一次模型请求。

### 3. 与现有后端及 Strix 引擎的衔接方案
1. **第一阶段：安全咨询与范围收敛（`/api/chat/sessions`）**
   - 首页输入框与推荐任务卡片统一提交至 `/api/chat/sessions/[sessionId]/messages`，复用 `readModelConfig()` 加密存储的 OpenAI 兼容模型配置完成实时推理，并将会话历史及附件元数据（仅文件名、类型、大小）持久化至 `PENNY_DATA_DIR/chat-sessions.json`。
   - 对话请求过程中仅通过 `ThinkingIndicator` 展示 `Thinking` 状态，不展示 `ThinkingSteps` 步骤标题、步骤详情或来源标签。
2. **第二阶段：受控转入 Strix 渗透测试（`/api/pentests`）**
   - 严格遵循 Issue #8 安全门禁：普通对话绝不自动调用 Strix CLI 启动后台扫描。
   - 聊天文案仅保留 `Web App Pentest`（已移除 `Code Review`）；当聊天开启时，页眉右上角按钮切换为「开始渗透测试」，操作员点击后仅跳转至 `Pentests` 模块，不直接启动任务。

## 2026-11-07 用户追加变更说明（相对于原工单/Spec 的界面调整）
1. **Home 页面纯净布局与大标题间距**：
   - 原工单描述“保留 Home 现有内容与视觉设计，在页面中提供聊天输入框”；根据用户最新视觉指示与参考截图（对标 `app.strix.ai` Home），`控制台首页` 仅保留居中的 Agent Prompt Composer（加大标题 `今天需要验证哪个安全目标？` 的上下间距，移除旧版 Flocks 渐变大横幅及外层包裹框）。
2. **`AI 安全工作台` 下新增 `Dashboard` 页面承载原首页看板内容**：
   - 原位于首页下方的红队授权门禁 Banner、3 个快捷入口卡片（Sessions / Workflows / Agents）及 8 宫格指标卡（Agents 17 / Workflows 4 / Skills 15 / Tools 149 / 近 7 日任务 128 / 活跃定时巡检 6 / Models 6 / 系统状态）完整原样迁移至左侧导航 `AI 安全工作台 -> Dashboard`（`activeModule === "dashboard"`）。
3. **验证结果**：
   - `npm run typecheck`（`exit code 0`）
   - `npm run lint`（`exit code 0`）
   - `node --test tests/chat-copilot.test.mjs`（3/3 通过，`exit code 0`）

## 2026-11-07 补充修复：AI Copilot 对话框单屏高度约束
- **问题原因**：`SidebarInset` 原本仅设置 `min-h-dvh`，当主工作区渲染长列表（如 Tools 149 项）时外层 flex 容器随内容增高，且 `SecOpsChatbot` 内层 flex 容器缺少 `min-h-0` 及底部常驻 `suggestions` 占高，导致 Copilot 抽屉/全屏对话框超出单屏高度。
- **修复方式**：
  1. 在 `components/platform/flocks-page.tsx` 中将 `SidebarInset` 设为 `h-dvh max-h-dvh min-h-0 overflow-hidden md:h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-1rem)]`，并为 `<main>` 与 Copilot `<aside>` 补齐 `h-full max-h-full min-h-0 overflow-hidden`。
  2. 在 `components/chat/secops-chatbot.tsx` 中为根容器、左侧会话栏、中间消息列及滚动容器补齐 `min-h-0`，顶部栏与底部输入区设为 `shrink-0`，移除底部输入框常驻 `suggestions` 列表。
  3. 在 `tests/chat-copilot.test.mjs` 中新增 `drawer` 与 `workspace` 形态下 `boundingBox` 高度不超过视口高度（`y + height <= viewport.height`）的断言，运行 `node --test tests/chat-copilot.test.mjs` 3/3 通过（`exit code 0`），并更新 `docs/verification/issue-8/copilot-fullscreen.png`。

## 2026-11-07 补充更新：去除首页 AI Copilot 入口与切换侧边栏按钮
- 在 `components/sidebar-app/inset-topbar.tsx` 中移除了页眉左上角的 `<SidebarTrigger />`（`Toggle Sidebar` 切换侧边栏按钮）。
- 在 `components/platform/flocks-page.tsx` 中：
  - 当处于 `控制台首页`（`activeModule === "home"`）时，隐藏顶部栏右上角及左侧边栏底部的 `AI Copilot` 入口按钮（因为首页本身即为对话入口；切换至其他模块如 `Dashboard`、`Tools` 时仍显示 `AI Copilot` 侧栏入口）。
  - 当在 `控制台首页` 发起全屏对话时，不传递 `onSwitchMode`，隐藏对话框右上角的 `切回侧边栏` 按钮（避免在首页聊天框旁再叠加侧栏抽屉）。
- 在 `tests/chat-copilot.test.mjs` 中补充对应断言并重新生成 `docs/verification/issue-8/home-composer.png` 与 `docs/verification/issue-8/copilot-fullscreen.png`，3/3 测试全部通过。

## 2026-11-07 补充更新：统一全屏对话实例并彻底移除“切回侧边栏”按钮
- 清理了 `components/platform/flocks-page.tsx` 中残留的 `activeModule === "sessions"` 分支，确保全站唯一共享同一个 `<SecOpsChatbot>` 实例：无论从首页输入框/推荐卡片进入全屏对话，还是从其他模块点击 `AI Copilot` 侧栏抽屉再点击 `全屏展开`，展示与操作的都是同一个全屏对话页面与同一个会话。
- 从 `components/chat/secops-chatbot.tsx` 中彻底移除了 `mode === "workspace"` 时的 `切回侧边栏` 按钮，任何入口进入全屏对话后右上角仅保留 `关闭聊天`。

## 2026-11-07 补充更新：移除 Agent 执行步骤展示（仅保留 ThinkingIndicator）与 Code Review 聊天文案
- 在 `components/chat/secops-chatbot.tsx` 中移除了 `ThinkingSteps` 及其步骤详情、来源组件 的导入与渲染，本期仅保留 `ThinkingIndicator`（`data-testid="thinking-indicator"`）展示 `Thinking` 状态。
- 清理了 `components/chat/secops-chatbot.tsx` 与 `components/chat/home-chat-composer.tsx` 中的 `Code Review` 文案，仅保留 `Web App Pentest`；聊天打开时顶部「开始渗透测试」按钮仅跳转至 `Pentests` 页面，不直接启动任务。
- 在 `tests/chat-copilot.test.mjs` 中补充了 `ThinkingIndicator` 可见、`ThinkingSteps`（Agent 执行步骤）不可见及聊天文案不含 `Code Review` 的断言。
