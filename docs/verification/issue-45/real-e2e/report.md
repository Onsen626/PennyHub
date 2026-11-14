# #45 真实端到端补充验收

源码：`6abdee262a201ba3c79ef8c6cb1e0971a236cdde`。

## 范围

前端五步向导创建任务，目标仅为独立静态页面 http://host.docker.internal:8099/ 。Quick，maxTurns=20。指令限定页面根路径、一次请求、无子 Agent。使用现有真实模型与固定 Strix 原生环境。未修改产品代码；测试目标服务已停止，前端开发服务继续运行。

## 观察结果

1. 首次任务 b8b28c8b-666b-47e8-865a-1ff7d3538ded 原生执行自然完成。旧开发服务没有加载新增运行管理模块，页面停留 preparing；重启服务后启动核查读取完成事件，确认 completed 与资源清理。
2. 最终任务 eff072e4-98a4-4c07-ac51-0e57ffe65863 重新通过前端创建，无服务重启、无人工停止，自然完成。执行事件包含 preparing、running、completed；约 19 秒，最终 revision=8。
3. final=true，零项发现；页面显示最终报告，刷新后仍为 completed。进程组退出与沙箱清理均已确认。
4. 四份原生产物下载 HTTP 200 且非空：coverage.json、findings.sarif、penetration_test_report.md、run.json。
5. worker 消失，同任务标签容器为空，活动名额释放。精确命令、退出状态与输出见 verification.json。

## 已观察缺口

事件转换调用 dataclasses.asdict，深度复制带线程锁的原生事件时记录 TypeError: cannot pickle '_thread.lock' object。最终任务出现 15 次。自然完成、结果持久化与产物下载成功，部分 Activity 事件可能遗漏，事件展示完整性仍需修复。本次没有修改该逻辑，也没有宣称全部真实事件展示通过。

## 证据

verification.json、final-api.json、downloads.json、reloaded-page.txt、两次 execution-events 文件及截图。未保存登录凭据或模型密钥。
