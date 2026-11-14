# Issue #44 真实停止验证

## 代码与测试

- spawn 封装提交：`a088880`。
- 完整 `npm test`：70/70，通过；其中单元测试 38、Pentest 测试 11、目录测试 7。
- 类型检查、改动文件 ESLint 通过。
- 原始测试输出保存在 `checks.json`，真实接口和进程／容器输出保存在 `real-stop-verification.json`。

## 真实验证范围

仅测试本机独立静态页面 `http://host.docker.internal:8099/`；quick 模式，maxTurns=20，指令限制到该页面。没有使用其他真实目标。静态页面保存于独立临时目录；Python HTTP 服务启动后未响应，随后使用 Node HTTP 服务提供同一页面。验证结束后该本地服务已停止。

## 最终验证结果

- 任务：`3fe10327-0073-4b73-a3ed-965e22bf98b2`。
- 启动接口 202；平台状态 running。
- `docker ps -q --filter label=strix-run-id=3fe10327-0073-4b73-a3ed-965e22bf98b2` 返回 `6720eeac20ec`。
- 结束接口 200；平台状态 stopped。
- `ps -p 68227 -o pid=,stat=,pgid=` 无输出，退出码 1，worker 已消失。
- 活动任务锁不再归属于该任务。
- `docker ps -aq --filter label=strix-run-id=3fe10327-0073-4b73-a3ed-965e22bf98b2` 无输出，退出码 0，对应容器已清除。
- 更早一次验证记录保留于 `real-stop-first.json`；最终记录额外使用仅显示运行容器的查询作为停止前检查。

当前回收函数仍采用 best-effort；清理失败保留 stopping、清理确认及重试属于 #45 的明确范围。本次真实通过记录只证明上述受控样例的停止及清理行为。
