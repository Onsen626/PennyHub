# Issue #45：Pentest 生命周期统一管理

## 基线

- #44 已关闭；spawn 封装提交 `a088880`，真实停止证据提交 `1ceeb6b`。
- 真实任务 `3fe10327-0073-4b73-a3ed-965e22bf98b2` 已验证运行容器、停止状态、worker 退出、活动锁释放及标签容器清除。
- #44 最终完整测试 70/70。该结果为迁移前基线，不代表 #45 验收完成。
- 分支：`issue-45-state-machine`。

## 完整实施范围

1. 纯状态机统一定义 draft、preparing、running、stopping、completed、stopped、failed、interrupted 的合法转换、结构化错误、executionId 及单调 revision。调用方提供事件时间，状态机不读取进程、文件或当前时钟。
2. 统一运行管理模块负责按任务串行保存转换、确认进程身份、停止及沙箱检查。ownerPid、workerPid、workerPgid、executionId、sandboxId 分别记录；preparing 中 workerPid 为空。
3. worker 写入带 executionId 的持久事件，并继续保存原生结果；平台运行管理模块消费事件并保存生命周期。任务读取保持只读，服务启动时的核查由运行管理模块执行，不恢复或新建扫描。
4. 结束请求进入 stopping；重复请求幂等。进程组和对应沙箱清理确认后进入 stopped 并释放活动名额。清理失败保留 stopping、错误、活动名额和重试入口。
5. 复用 #40 的最终结果确认规则；最终结果成功持久化后才发布 completed。部分结果、失败和停止结果继续可见。生命周期、结果完整性和清理结果分别保存、展示。
6. 页面按 revision 忽略旧响应，支持 stopping、重试、刷新及重新登录的一致状态。保留现有启动、读取、结束接口和兼容字段。
7. 更新状态图及职责文档，运行完整回归、类型检查、静态检查和生产构建，完成 Standards／Spec 审查后提交。#45 验收完成前保持开放。

## 用户已确认的测试边界

- 纯状态机公开接口：合法／非法转换、executionId、revision；不涉及真实进程。
- 公开任务接口：使用现有模拟执行端验证启动、准备期间结束、重复结束、迟到事件、SIGTERM 无响应、清理失败、最终保存失败及重启核查。
- 浏览器页面：stopping、重试入口、旧 revision 忽略和刷新后状态一致。

本项开发不新增真实扫描。已有 #44 真实清理记录单独保留，模拟执行端的测试结果单独报告。

## 当前进展

已完成四项逐项失败／通过的纯状态机测试：

1. 确认启动从 draft 转为 preparing，建立 executionId 和 ownerPid，workerPid／workerPgid 保持为空。
2. 当前执行确认 worker 身份后转为 running；旧 executionId 返回结构化错误。
3. 结束请求转为 stopping，重复请求保持幂等，迟到 running 事件被拒绝。
4. 仅在进程组退出与沙箱清理都确认后转为 stopped；缺少任一确认时保留 stopping。

这些转换保持输入不变，保存递增 revision 和事件原因、时间。测试已加入 `npm run test:unit`。其余终态转换、运行管理模块、worker 协议及页面接入继续待实施；本工单保持开放。
