# Issue #3：黑盒 Web App Pentest 运行服务实施记录

## 当前范围

本次提交覆盖黑盒 Web App Pentest 的公开任务接口、后台运行服务、事件与结果持久化，以及确定行为执行替身测试。前端创建页面按新黑盒规格重构由 Issue #21 独立处理。

## 已验证能力

- 仅接受 `web_app_pentest` 类型。
- HTTP/HTTPS 目标地址校验和多个目标保存。
- Custom task context 与访问资料隔离保存，公开任务摘要只保留身份数量和请求头数量。
- 配置确认后才启动后台进程。
- 同一时间只允许一项运行任务。
- 网页服务重启后可以继续查询任务状态、事件、结果和产物。
- 真实 Strix 适配器使用固定提交、锁定依赖和独立后台进程。
- 运行记录保存状态、阶段、Agent、发现、原生产物和错误信息。
- 参考资料使用 `/workspace/reference/...` 路径装配，敏感资料使用 `/workspace/penny-access.json`，日志与报告进行遮盖。

## 公开接口

- `GET /api/pentests`
- `POST /api/pentests`
- `GET /api/pentests/[taskId]`
- `POST /api/pentests/[taskId]/start`
- `GET /api/pentests/[taskId]/events`
- `GET /api/pentests/[taskId]/results`
- `GET /api/pentests/[taskId]/artifacts`

## 测试证据

- `tests/pentests.test.mjs`：目标校验、敏感资料隐藏、持久化、认证和同源保护。
- `tests/pentest-runtime.test.mjs`：确认启动、单任务限制、后台执行、页面服务重启、事件、结果、产物、独立源码副本和原始输入保护。
- 真实 Strix 运行证据位于 `docs/verification/issue-3/`，仅代表固定样本和固定运行环境的验证结果。

## 已知边界

- Target 类型扩展、Target List、API Specification、Instruction File 和新的五步创建页面由 Issue #21 处理。
- 目标容器可达性和 `192.168.0.180` 集成记录由 Issue #5 处理。
- Agent 控制、暂停、中止、恢复和再次测试由 Issue #6/#7 处理。
