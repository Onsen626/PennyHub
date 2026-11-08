# Issue #3：黑盒 Web App Pentest 验收记录

## 验收范围

本次验收覆盖黑盒 Web App Pentest 的创建确认、后台运行、任务锁定、服务重启恢复、详情页面和原生产物查询。配置仅接受 `web_app_pentest`，目标使用 HTTP 或 HTTPS 地址。

## 已验证能力

- 配置汇总经过明确确认后才启动后台任务。
- 普通页面浏览、模块切换和聊天不会自动创建或启动测试。
- 后台进程独立于网页服务运行，网页服务重启后可以继续查询任务。
- 状态、执行事件、Agent 记录、发现结果和原生产物能够通过接口和详情页面查询。
- 同一时间只允许一项测试运行，第二项启动返回明确的 `409` 错误。
- 任务目标、指令摘要和访问资料得到持久保存，公开响应不会暴露密码、Cookie、API Key 或用户名。
- 产品代码拒绝 `Code Review` 和本地源码目录输入。
- 运行适配器不提交、推送或部署目标应用的修改。

## 自动化证据

- `tests/pentests.test.mjs`：目标校验、敏感资料隐藏、重启后读取和同源保护。
- `tests/pentest-runtime.test.mjs`：确认启动、黑盒目标过滤、单任务限制、网页服务重启、事件、Agent、发现、产物和输入保护。
- `tests/pentest-ui.test.mjs`：浏览器创建向导、明确确认、详情标签、Activity、Agents、Findings、Artifacts、关闭页面后重新打开和状态恢复。
- `docs/verification/issue-3/web-app-pentest-details.png`：详情页面验收截图。

## 验证命令

```text
npm run typecheck
npm run lint
npm run test:pentests
npm run build
```

## 后续范围

Target List、API Specification、Postman Collection 和 Instruction File 的扩展由 Issue #4 处理。暂停、中止、恢复和再次测试由 Issue #6/#7 处理。真实目标集成记录由 Issue #5 处理。
