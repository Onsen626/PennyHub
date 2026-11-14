# #45 验证记录

## 范围与来源

- 原始基线：`789caa202749f36ef334215a30183564e23290b8`。
- 实施分支：`issue-45-implementation`。
- 产品与测试源文件的原始／修改后 SHA-256：`source-sha256.json`。原始文件保存在基线 Git 提交中。
- 全部 Pentest 执行使用现有模拟执行端；测试可创建并结束自身进程。模拟 Docker 可执行文件只保存调用记录并返回测试输出，未运行真实 Docker 资源操作。
- #44 真实停止与容器清理证据继续保留在 `../issue-44/`，与本项模拟覆盖分别解释。
- 固定版本 Strix 文件没有修改。依赖使用本工作目录的 `npm ci` 安装，node_modules 为本地目录。

## 命令与实际日志

工作目录：`/Users/jennifer/orca/workspaces/PennyHub/issue45-implementation`。

| 命令 | 原始输出与退出状态 |
| --- | --- |
| `npm ci` | `npm-ci.log`；安装过程报告 7 项 moderate 依赖告警，未扩大本项范围升级依赖 |
| `npm run typecheck` | `typecheck.log` |
| `npm run lint` | `lint.log`；保留既有 color-picker.tsx 两项 unused eslint-disable 警告 |
| `npm test` | `npm-test.log` |
| `npm run build` | `build.log` |

最终检查全部返回退出状态 0：`npm test` 共 79 项通过（45 unit、2 findings、8 API、1 platform UI、3 chat、13 Pentest、7 catalog）；typecheck、lint 与生产构建通过。lint 保留上述两项既有警告；生产构建保留未修改的 native-catalog.ts 动态文件追踪提示。

日志末尾保存命令原始退出状态；开发诊断文件不计入最终通过结果。测试自动改写的历史截图与 tsconfig 生成类型目录已经恢复，恢复后重新通过 typecheck 与生产构建。`completed-fixture.png` 是最终页面测试生成的模拟任务截图，已重新打开检查。

## 覆盖行为

- 七项纯状态机测试：启动身份、执行确认、结束幂等及迟到事件、清理双重确认、最终持久化保护、清理观察、进度 revision。
- 公开任务接口：确认启动完成、服务重启、preparing 身份为空、准备期间结束、启动前取消、SIGTERM 无响应后强制终止、旧身份保留名额、不同 executionId 事件被忽略、终态迟到事件被忽略。
- 清理检查：删除后容器仍存在、Docker 命令失败、stopping 保留活动名额、重复结束与重启核查、清理重试成功后释放名额。
- 执行归属：重启时存活但身份错误的 PID 转为 interrupted，不发送信号、不删除沙箱；重复 GET 保持核查后记录不变。
- 最终结果：实际文件写入失败后误报 completed 被平台最终标记检查拒绝；部分发现保留；completed／failed 的清理重试保持原状态，执行错误与清理错误分别保留。
- 页面：旧 revision、结束前的旧请求回写、stopping／终态清理重试、刷新、最终／部分结果和结果读取异常的独立展示。

## 开发过程记录

`tdd/` 保留逐项失败与通过日志。`npm-test-development*.log` 保留开发期间诊断，包括终态清理入口接入前的 409、开发服务编辑期间的页面检查，以及旧记录状态核查后的错误分类修正；这些记录均独立于最终固定源码的完整检查。

本项不新增恢复执行、真实扫描或上游原生清理行为修改。
