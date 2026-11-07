# PennyAgent 应用架构（现状）

基线：`PennyHub@a64e2b9`（origin/main，2026-11-07）。行数为该提交的实际统计（含空行与注释）。
本文只描述**模块边界与缺口**，功能语义见 `docs/design/Strix_PoC_功能与交互设计.md`。

## 1. 模块图

```mermaid
flowchart TB
  subgraph SHELL["外壳"]
    L["app/layout.tsx<br/>Providers + 字体 + accent"]
    P["app/page.tsx · 7<br/>仅渲染 FlocksPage"]
    LG["app/login/page.tsx<br/>+ components/platform/login-form"]
  end

  subgraph UI["界面"]
    FP["components/platform/flocks-page.tsx · 1118<br/>12 处 activeModule 分支"]
    CH["components/chat/secops-chatbot.tsx · 704"]
    HC["components/chat/home-chat-composer.tsx · 291"]
    MS["components/platform/model-settings.tsx · 261"]
    SB["components/sidebar-app/*"]
    UIK["components/ui/* · 44（上游组件，勿改形）"]
  end

  subgraph SERVER["服务端 · lib/server"]
    PA["platform-auth.ts · 56"]
    PH["platform-http.ts · 48<br/>requireSession / apiError"]
    PS["platform-store.ts · 74<br/>AES-256-GCM 加密存储"]
    PT["pentests.ts · 190<br/>draft / read / list"]
    PR["pentest-runtime.ts · 269<br/>processAlive / startPentest / readPentestEvents"]
    PSNAP["pentest-snapshot.ts · 84"]
    PART["pentest-artifacts.ts · 91"]
    MC["model-config.ts · 217"]
  end

  subgraph API["路由 · app/api（11 个 route.ts）"]
    A1["auth/{login,logout,session}"]
    A2["model-config + /test"]
    A3["pentests + [taskId]/{start,events,results,artifacts}"]
  end

  subgraph NATIVE["原生执行 · 仓库外"]
    W["scripts/strix-worker.py<br/>固定版本校验 + run_strix_scan"]
    S["Strix 沙箱容器<br/>strix-sandbox:1.4.0"]
    R["run 目录<br/>strix.log / vulnerabilities / coverage"]
  end

  P --> FP
  FP --> CH
  FP --> HC
  FP --> MS
  FP --> SB
  FP --> UIK
  CH --> A1
  CH --> A3
  MS --> A2
  A3 --> PT
  PT --> PR
  PR --> PSNAP
  PR --> PART
  PR -->|spawn| W
  W --> S
  S --> R
  PR -->|读事件| R
  API --> PH
  PH --> PA
  PT --> PS

## 2. 执行链路

```mermaid
sequenceDiagram
  autonumber
  participant U as 界面
  participant R as app/api/pentests
  participant S as lib/server/pentests
  participant RT as pentest-runtime
  participant W as scripts/strix-worker.py
  participant X as Strix run

  U->>R: POST /api/pentests（目标/模式/上下文）
  R->>S: createPentestDraft
  U->>R: POST /api/pentests/{id}/start
  R->>RT: startPentest(id)
  RT->>W: spawn(python, worker, stdin=payload)
  W->>X: run_strix_scan(event_sink, status_sink)
  X-->>W: 事件流
  loop 轮询
    U->>R: GET /api/pentests/{id}/events?after=N
    R->>RT: readPentestEvents(id, after)
    RT-->>U: 新增事件
  end
```

## 3. 结构缺口

| # | 位置 | 现象 | 删除测试 | 影响 |
|---|---|---|---|---|
| G1 | `components/platform/flocks-page.tsx` | 1118 行，12 处 `activeModule === "…"` 字符串分支决定渲染哪个视图 | 删掉它复杂度不会消失，而是散进 10 个新组件 → 它本身没挣钱，"隐式注册表"在挣钱 | 加一个模块必须改这个大文件；无法按视图独立测试 |
| G2 | `components/chat/secops-chatbot.tsx` | 组件内直接 `fetch("/api/chat/sessions…")`，路径/请求体/错误态都在组件里 | 删掉它，交互复杂度回到页面 → 它在承载行为，但**接口只有 props**，没有消息源 seam | 换 SSE、加 mock、写测试都要改组件；且 main 上 `/api/chat/*` 尚不存在（后续 PR） |
| G3 | `lib/server/pentest-runtime.ts` vs 缺失的 chat 服务端模块 | 运行侧只有 3 个导出（深模块，正面样板）；聊天侧尚无对应模块，逻辑散在路由与组件 | — | 聊天一旦接入真实模型，容易复制出第二个"混层"模块 |

## 4. 按设计稿的变更量（相对当前基线）

| 层 | 变动 | 说明 |
|---|---|---|
| 视觉/组件 | ≈0 | `components/ui` 44 个与 Fluid 原语保持不动 |
| 页面 | 中 | G1 拆分：视图模块 + 注册表；`pentests` 详情/向导仍是新增主体 |
| 数据 | 中 | `flocks-data.ts`（481 行）继续退化为类型与文案；真实数据走 API |
| 执行 | 已完成主体 | 11 个路由 + `pentest-runtime` + worker 已落地；剩事件流形态与恢复语义 |

## 5. 边界

- 不在本文档定义接口形状；接口决策走 `codebase-design`
- 不覆盖审批（本期排除）与 Caido 工作台入口
- 图表基线随 `origin/main` 更新；模块边界变化时才需要改图
