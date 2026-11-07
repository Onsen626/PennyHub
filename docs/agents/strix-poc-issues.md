# Strix PoC 实施任务索引

规格：[#1](https://github.com/Onsen626/PennyHub/issues/1)。任务正文、依赖关系和验收边界已按开源版 Strix 黑盒 Web App Pentest 前端流程更新。

| 顺序 | Issue | 依赖 |
|---|---|---|
| 01 | [#2 [PoC 01] 平台登录与模型 API 配置](https://github.com/Onsen626/PennyHub/issues/2) | 无 |
| 02 | [#3 [PoC 02] 黑盒 Web App Pentest 创建与真实执行](https://github.com/Onsen626/PennyHub/issues/3) | #2 |
| 03 | [#4 [PoC 03] Target List、API Specification 与 Instruction File 输入](https://github.com/Onsen626/PennyHub/issues/4) | #3 |
| 04 | [#5 [PoC 04] 黑盒目标可达性与真实集成验证](https://github.com/Onsen626/PennyHub/issues/5) | #3 |
| 05 | [#6 [PoC 05] Agent 展示与运行控制](https://github.com/Onsen626/PennyHub/issues/6) | #3 |
| 06 | [#7 [PoC 06] 中断恢复与再次测试](https://github.com/Onsen626/PennyHub/issues/7) | #6 |
| 07 | [#8 [PoC 07] Home 与 Copilot 双形态](https://github.com/Onsen626/PennyHub/issues/8) | #2 |
| 08 | [#9 [PoC 08] 聊天生成并启动黑盒 Web App Pentest](https://github.com/Onsen626/PennyHub/issues/9) | #5, #8 |
| 09 | [#10 [PoC 09] 原生 Skills 与 Tools 目录](https://github.com/Onsen626/PennyHub/issues/10) | #3 |
| 10 | [#11 [PoC 10] 可复用 Workflows](https://github.com/Onsen626/PennyHub/issues/11) | #5 |
| 11 | [#12 [PoC 11] Home 真实数据展示](https://github.com/Onsen626/PennyHub/issues/12) | #3, #8 |
| 12 | [#13 [PoC 12] 黑盒 Web App Pentest 完整流程验收](https://github.com/Onsen626/PennyHub/issues/13) | #4, #5, #6, #7, #8, #9, #10, #11, #12, #18 |
| 13 | [#18 [PoC 13] 按 Strix 原生黑盒参数重构 Web App Pentest 创建页面](https://github.com/Onsen626/PennyHub/issues/18) | #3 |

#3 的前端流程固定为：Target → Authentication / Instructions → Scan Mode → Resource Budget → Review & Launch。#3 完成后并行推进 #4、#5、#6、#10；#8 已完成；#9 等待 #5 和 #8；#13 等待其余任务。

本期前端边界不包含 White-box、Git Repository、Local Codebase、SAST、源码修复、独立认证模式、结构化角色配置、最大 Agent 数量、并发数量、扫描时长和请求速率配置。
