# 架构文档

本目录记录两类架构事实，供实现与评审共用。

| 文档 | 内容 | 快照基线 |
|---|---|---|
| [strix-runtime.md](./strix-runtime.md) | 上游 Strix 内核：分层、回合循环、提示词装配、多智能体、可组合接缝 | `usestrix/strix@0601550` |
| [pennyagent-app.md](./pennyagent-app.md) | 本仓库现状：模块图、执行链路、结构缺口、按设计稿的变更量 | `PennyHub@a64e2b9`（origin/main） |

图表使用 Mermaid，GitHub 原生渲染；无需本地工具。

**维护约定**：任何改变模块边界的改动，同步更新对应文档的图与"缺口"表；只改实现细节则不必改图。
