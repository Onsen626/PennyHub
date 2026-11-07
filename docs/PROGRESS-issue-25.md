# PROGRESS — Issue #25（[Spec] 将主题切换与退出登录移入 Settings General）

关联规格：[#25](https://github.com/Onsen626/PennyHub/issues/25)

## 1. 任务图与测试接缝（Seams）
- **核心目标**：
  1. 将「设置」入口移至页面右上角顶部操作区（原退出登录位置），保留现有设置图标并显示「设置」文字；从顶部栏移除直接「退出登录」按钮。
  2. 清空首页/侧栏左下角 `SidebarFooter` 内的版本号、平台副标题、主题切换图标、设置图标、Copilot 图标，仅保留底部容器边界收尾样式。
  3. 在 `SettingsDialog` 的默认 `General` 栏目中增加主题切换行（`System` / `Light` / `Dark`，接入 `next-themes` `useTheme` 并持久化）与退出登录操作行（复用 `/api/auth/logout`、进行中状态、错误提示与跳转 `/login`）。
  4. 从 `Appearance` 栏目移除重复的 `Theme` 设置行，保留 `Density`。
- **测试接缝（TDD Seams）**：
  - 应用外壳与 Playwright 端到端测试（`tests/platform-ui.test.mjs`）：验证左下角旧内容已移除、右上角「设置」按钮在首页/其他模块/聊天侧栏/聊天全屏及桌面/窄屏下均可打开 `Settings` 且默认进入 `General`、主题切换生效且刷新保持、`Appearance` 无重复主题项、退出登录失败提示与成功跳转。

## 2. 执行进度
- [x] 读取 Spec #25、领域文档及关联源码（`settings-dialog.tsx`、`app-sidebar.tsx`、`flocks-page.tsx`、`logout-button.tsx`、`tests/platform-ui.test.mjs`）。
- [x] Implementer 子 Agent（独立 worktree + TDD red-green）完成实现与测试验证。
- [x] 并行运行 Matt Pocock `code-review`（Standards + Spec 双轴审查）。
- [ ] 合并至集成分支、提交 PR 并完成验收归档。

## 3. 接手记录（2026-11-07，原 Agent 因配额中断）

原实现 Agent 在 code-review 后、修复审查项前停在中途（`Individual quota reached`），且工作区留有一处未提交的反向改动（把 `onOpenCopilot` 重新接回侧栏页脚，与 Spec 第 2 条冲突）。本轮接手处理：

- 丢弃上述未提交改动，保留已提交实现 `50d2fb3`。
- 收敛审查项：从 `AppSidebarProps` 删除残留的 `lang` / `onLangChange` / `onOpenCopilot`，并移除 `components/platform/flocks-page.tsx` 中对应的 `onOpenCopilot` 传参（页脚已按 Spec 清空，这些属性均无消费者）。
- 验证：`npm run typecheck` 通过、`npx eslint` 对两个改动文件通过、`npm run test:ui` 通过（1 test / 1 pass，含设置入口、主题持久化、Appearance 无重复主题项、退出登录）。
- 未执行：合并至集成分支与验收归档（留给主线决定）。
