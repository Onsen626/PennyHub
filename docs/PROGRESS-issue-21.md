# PROGRESS — Issue #21（根据开源版本的 Strix 重构渗透测试业务流程及组件细节修正）

关联工单：[#21](https://github.com/Onsen626/PennyHub/issues/21)（Parent: [#3](https://github.com/Onsen626/PennyHub/issues/3) / [#1](https://github.com/Onsen626/PennyHub/issues/1)）

## 2026-11-07 — 组件重构细节修正记录

### 1. 聊天界面顶部副标题精简
- **修改文件**：[secops-chatbot.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/chat/secops-chatbot.tsx)
- **修改内容**：删除聊天界面顶部标题栏下方的冗余说明文本 `普通聊天复用当前模型配置 · 不会自动创建 Strix 测试任务`，保持会话头部简洁。

### 2. 侧边栏收起后恢复按钮缺失修复
- **修改文件**：
  - [inset-topbar.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/sidebar-app/inset-topbar.tsx)
  - [chat-copilot.test.mjs](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/tests/chat-copilot.test.mjs)
- **问题原因**：此前移除顶部栏常驻的 `<SidebarTrigger />` 后，当用户通过侧边栏拖拽/点击分隔条（`SidebarRail`）或快捷键 `[` 收起左侧导航栏时，顶部栏没有可点击的展开恢复按钮。
- **修复内容**：在 `SidebarInsetTopbar` 中读取 `useSidebar()` 状态（`isCollapsed = isMobile ? !openMobile : !open`），展开状态下保持隐藏，一旦左侧边栏处于收起状态（或移动端视图）即在左上角渲染 `<SidebarTrigger />` 恢复按钮。

### 3. 渗透测试向导（`PentestWizard`）页头精简与底部 `Back` / `Next` 按钮样式统一
- **修改文件**：[pentest-wizard.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/pentest-wizard.tsx)
- **修改内容**：
  1. 删除 `配置新的渗透测试` 标题上方的 `黑盒渗透测试` 眉标与标题下方的 `使用 Strix 对运行中的 Web 应用、IP 或 API 目标进行测试。` 副标题说明。
  2. 将向导底部左侧返回/取消按钮与右侧下一步按钮文案统一改为英文 `Back` 与 `Next`。
  3. 将 `Back` 按钮调整为与 `Next` 一致的 `variant="primary"` 样式，并改用 `Button` 组件原生的 `leadingIcon={ArrowLeft}` 与 `trailingIcon={ArrowRight}` 属性，修复了原先将 `<ArrowLeft />` / `<ArrowRight />` 放入 `children` 导致图标与文字上下换行错位的问题。
  4. 将第二步标题从 `Authentication / Instructions` 简化为 `Authentication`（移除 `/ Instructions`）。
  5. 移除上传指令文件大选框内多余的 `<Input type="file" />` 小输入框边框，改为隐藏式 `<input type="file" className="sr-only" />`，点击整个虚线大选框即可选择文件。
  6. 删除上传区域下方的 `敏感内容只用于本次任务，Review 页面仅显示是否已配置。` 提示文案。
  7. 删除右侧栏的 `安全提示` 卡片（仅保留 `配置摘要` 卡片）。
  8. **Matt Pocock `code-review` 双轴审查（Standards + Spec）修复**：
     - 在 [pentest-wizard.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/pentest-wizard.tsx) 中新增目标列表文件导入（`导入目标文件`）、Instruction File 正文读取与加密透传（通过 `access.identities` 写入加密 `access.json` 并由 `strix-worker.py` 脱敏）、裸 IP/端口目标自动补全 `http://`，并将占位词中的 `Login credentials` 统一为领域词表 `GLOSSARY.md` 定义的 `Test identity`；语义化步骤元组变量名 `[englishLabel, chineseTitle]`。
     - 在 [pentests-panel.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/pentests-panel.tsx) 与 [pentest-details.tsx](file:///Users/jennifer/orca/workspaces/PennyHub/https-github.com-Onsen626-PennyAgent.git/components/platform/pentest-details.tsx) 中清理残留的 `repository` / `sourceDirectory` / `Source SHA-256` 文案及重复三元表达式。

### 4. 验证记录
- `npm run typecheck`：通过（退出码 `0`）
- `npm run lint`：通过（退出码 `0`，`0 errors`）
