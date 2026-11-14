# CI 测试命令

CI 使用 Node.js 24，依次执行测试，避免多个 Next.js 测试服务器同时使用相同构建目录。

| 命令 | 验证内容 |
| --- | --- |
| `npm run test:unit` | 核心输入函数：目标列表过滤、URL 规范化和去重、Postman 地址校验、文件路径解析、UTF-8 大小限制、OpenAPI/Swagger/Postman 摘要和无效文件处理；Strix 运行时选择与失效记录回退；结束进程组的 SIGTERM→SIGKILL 升级与平台自身 pid 排除；轮次耗时估算；按 strix-run-id 标签回收沙箱容器；spawn 封装与 detached 策略 |
| `npm run test:findings` | Findings 汇总、任务间身份区分、重复结果、缺失或损坏记录、未知严重等级、过滤和完整性标记 |
| `npm run test:api` | 认证、模型配置、持久化、连接错误和超时 |
| `npm run test:ui` | 平台浏览器流程 |
| `npm run test:chat` | 聊天认证、消息、附件元数据、持久化和浏览器流程 |
| `npm run test:pentests` | Pentest 输入、任务生命周期、结束测试的进程组终止与状态保持、worker SIGTERM 清理、浏览器流程和执行器检查 |

`npm test` 顺序执行上述全部测试，任一命令失败会返回非零状态。CI 为新增的单元、Findings 和聊天测试分别保存 `unit.log`、`findings.log`、`chat.log`。

单元测试直接加载生产模块，使用 TypeScript 转译并在需要时移除 `server-only` 标记，保留函数实现；文件操作使用独立临时目录并在结束后清理。模型和任务执行测试仍使用受控测试服务及执行器。

## 验证记录

- 聊天服务已包含完整的 `/api/chat/sessions` 路由与 `lib/server/chat-sessions.ts`；`tests/chat-copilot.test.mjs` 浏览器测试已将旧静态标题“现有风险 (5)”及示例文件断言更新为真实的 Findings 页面结构（“现有风险”标题、数据统计与当前范围空状态说明），`npm run test:chat` 全部通过（3/3）。
- Pentest 浏览器测试（`tests/pentest-ui.test.mjs`）已更新 Findings 空状态断言：检查中文空状态以及发现记录、结果缺失和读取异常三个计数均为零。
- 结束测试（`tests/pentest-stop.test.mjs`）：确认 worker 忽略 SIGTERM 时接口会升级为 SIGKILL、连同进程组内的沙箱子进程一起终止，且停止状态不会被 worker 的后续状态回写覆盖。
- 结束测试补充（`tests/pentest-stop.test.mjs`）：`preparing` 阶段结束会终止 worker、保持平台进程可用并释放活动锁；启动前已记录结束意图时，启动请求返回 `STOPPED` 且任务保持 `stopped`。
- 结束测试详情页竞态（`tests/pentest-stop-ui.test.mjs`）：拦截一次结束前的详情轮询，验证结束完成后旧快照不会把状态改回 `running`，结束按钮也不会重新出现。
- 结束测试进程控制（`tests/pentest-process.unit.test.mjs`）：验证已在运行的进程先 SIGTERM、超时升级 SIGKILL、SIGKILL 后仍存活时返回终止失败，以及平台自身 pid 永远不会被当作 worker。
- Strix 清理（`tests/strix-worker-stop.test.mjs`）：用替身 Strix 模块驱动真实 worker，验证 SIGTERM 触发 runner 的沙箱清理、worker 的 report cleanup，并最终发布 `stopped`。
- Strix 运行时选择（`tests/strix-runtime.unit.test.mjs`）：确认保存的运行时记录在源码目录或解释器失效时整条回退到内置 Strix，不再单独信任其中的 Python 路径。
- spawn 策略（`tests/controlled-spawn.unit.test.mjs`）：生产代码中的 detached 子进程只能来自 `lib/server/controlled-spawn.ts`；worker 必须成为进程组组长并带 `STRIX_RUN_ID`/`STRIX_RUN_TYPE`，非 detached 封装会覆盖调用方传入的 `detached`。
- 沙箱回收（`tests/strix-sandbox.unit.test.mjs`）：停止后按 `strix-run-id` 标签查找并 `docker rm -f` 对应容器；Docker 不可用或删除失败不影响停止流程。worker 启动环境注入 `STRIX_RUN_ID=<taskId>`，容器创建时会带上该标签。
- 轮次耗时估算（`tests/pentest-estimate.unit.test.mjs`）：按 DeepSeek v4.1 约 60 tokens/s、每轮约 600 输出 tokens 与 2–6 秒工具开销，验证预设 50/100/200/500 轮显示 10–15 分钟 / 20–30 分钟 / 45 分钟 / 1 小时以上，自定义轮次沿用计算结果；浏览器测试同时确认轮次步骤只保留回合上限并展示估算。
