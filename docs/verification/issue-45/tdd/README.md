# #45 逐项失败与通过记录

这些日志记录开发过程中的公开边界测试。最终完整检查另见上级目录，开发日志不代表最终验收结果。

| 行为 | 失败记录 | 随后通过记录 |
| --- | --- | --- |
| 公开任务接口持久化 executionId／revision | `api-revision-red.log` | `api-revision-green.log` |
| preparing 的 workerPid 保持为空 | `preparing-red.log` | `preparing-green.log` |
| 页面忽略较旧 revision | `ui-revision-red.log` | `ui-revision-green.log` |
| 最终结果写入失败后拒绝 completed | `final-result-red.log` | `final-result-green.log` |
| stopping 重启核查与存活错误归属 PID | `restart-red.log` | `restart-green.log` |
| 页面独立显示最终结果完整性 | `result-ui-red.log` | `result-ui-green.log` |
| 纯状态机执行进度保持状态与递增 revision | `progress-red.log` | `progress-green.log` |

公开接口使用模拟执行端；最终写入失败由实际 EISDIR 文件写入错误产生，随后故意报告 completed，验证平台重新读取最终标记的保护。停止测试只发送信号给测试自行创建的进程。Docker 命令由测试目录中的独立可执行文件模拟，覆盖命令失败、删除后仍有容器、清理重试以及归属未确认时没有删除操作。

`../npm-test-development.log` 保留开发期间完整检查的诊断，其中 completed 清理重试入口尚未接入时返回 409；该记录中的页面检查还跨越了正在编辑的开发服务。最终验收只使用固定源码之后重新运行的日志。
