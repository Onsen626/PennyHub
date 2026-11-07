# Strix 内核架构

基线：`usestrix/strix@0601550`（2026-11-05，Apache-2.0）。文件行数为该 commit 的 raw 文件统计（含空行与注释）。

## 1. 运行时分层

代码只有三层：Agent 循环、工具集、协调器。工作流（recon → 威胁建模 → 狩猎 → 验证 → 报告 → 覆盖对账）不在这层，而在提示词与 skill 里。

```mermaid
flowchart TB
  subgraph ENTRY["入口 · strix/interface"]
    CLI["CLI<br/>interface/main.py · 556<br/>interface/cli.py · 259"]
    TUI["TUI<br/>interface/tui/backend/controller.py<br/>interface/tui/cmd/strix-tui（Go）"]
  end

  subgraph ENGINE["引擎 · core + runtime + agents"]
    RUN["run_strix_scan()<br/>core/runner.py · 731"]
    CO["AgentCoordinator<br/>core/agents.py · 709"]
    SM["沙箱会话 / Docker<br/>runtime/session_manager.py · 477"]
    RT["root SandboxAgent<br/>agents/factory.py · 870"]
    LOOP["run_agent_loop()<br/>core/execution.py · 1217"]
    PR["提示词装配<br/>agents/prompt.py · 171<br/>system_prompt.jinja · 543"]
    HK["回合 hook / 预算<br/>core/hooks.py · 450"]
  end

  subgraph TOOLS["工具 · strix/tools"]
    T1["host function tools<br/>tools/*/tool.py"]
    T2["sandbox 能力<br/>Shell / Filesystem"]
    T3["MCP 动态工具<br/>tools/mcp/session.py · 812"]
  end

  subgraph ASSETS["知识与落盘"]
    SK["skills/ · 75 个 .md"]
    RP["report/state.py · 1240<br/>report/coverage.py"]
    LL["llm/compaction.py · 401"]
  end

  CLI --> RUN
  TUI --> RUN
  RUN --> CO
  RUN --> SM
  RUN --> RT
  RT --> PR
  RT --> LOOP
  LOOP --> HK
  LOOP --> T1
  LOOP --> T2
  LOOP --> T3
  T1 --> RP
  T1 --> SK
  LOOP --> LL
```

## 2. 单次回合

关键不变量：**纯文本回合既不结束也不让出**，终止只能靠生命周期工具，否则循环把 Agent 推回去重跑。

```mermaid
sequenceDiagram
  autonumber
  participant M as interface/main.py
  participant R as core/runner.py
  participant C as core/agents.py
  participant E as core/execution.py
  participant H as core/hooks.py
  participant F as agents/factory.py
  participant T as tools/*
  participant L as llm/compaction.py

  M->>R: run_strix_scan(target, mode, budget)
  R->>C: 注册 root + budget_policy
  R->>F: build_strix_agent(skills, extra_tools)
  F-->>R: SandboxAgent（提示词 + 工具）
  R->>E: run_agent_loop(max_turns=500)
  loop 每个回合
    E->>H: 预算 / 暂停 / 轮次检查
    E->>L: 上下文超限时压缩
    E->>T: 工具调用
    T-->>E: tool result（超长经 output_store 落盘）
  end
  E->>T: finish_scan / agent_finish
```

| 机制 | 事实 |
|---|---|
| 轮次上限 | `DEFAULT_MAX_TURNS = 500`（`config/settings.py`） |
| 终止 | root `finish_scan`、子代理 `agent_finish`、交互式 `wait_for_user` |
| 瞬时错误 | 最多 5 次指数退避 2s→90s；401/402/403/404 不重试 |
| 上下文 | 自动压缩：保留 8k、缓冲 20k、摘要 4k |
| 预算 | `stop` 或 `pause`；子代理在 90% 处提前收手 |

## 3. 提示词装配

`scan_mode` 不是代码分支，而是 `_resolve_skills()` 决定的一份有序注入清单；`scope` 放最后以保证前缀可缓存。

```mermaid
flowchart LR
  A["调用方 skills<br/>factory.build_strix_agent"] --> R["render_system_prompt()<br/>agents/prompt.py · 171"]
  B["scan_modes/当前模式<br/>diff 时叠加 diff"] --> R
  C["永远注入<br/>agent_browser / python /<br/>counterevidence / severity"] --> R
  D["root 追加 coordination/root_agent<br/>白盒追加 4 个 source_*"] --> R
  R --> T["system_prompt.jinja · 543<br/>工作流 + 方法论 + 纪律"]
  R --> S["scope.jinja · 34<br/>目标 / MCP / 排除项"]
  R --> AV["available_skills 清单<br/>只列名字"]
  AV -.-> LS["tools/load_skill · 运行中拉正文"]
  AV -.-> CA["tools/agents_graph:create_agent<br/>永久分配给子代理 ≤5"]
```

## 4. 多智能体与共享状态

子代理之间不读彼此对话，靠共享状态协作。**注意**：root 不做测试只是提示词约束，代码里没有工具层 gate。

```mermaid
flowchart TB
  ROOT["root agent<br/>只编排"]
  SPAWN["create_agent<br/>tools/agents_graph · 855"]
  ROOT --> SPAWN
  SPAWN --> RECON["侦察 / 映射"]
  SPAWN --> HUNT["狩猎"]
  HUNT --> VAL["验证"]
  VAL --> REP["上报<br/>tools/reporting · 2602"]

  subgraph STATE["共享状态（同一容器）"]
    ST1["notes"]
    ST2["coverage · 535"]
    ST3["threat model"]
    ST4["reports / 去重"]
    ST5["proxy 证据 id"]
    ST6["/workspace"]
  end

  RECON --> STATE
  HUNT --> STATE
  REP --> STATE
  ROOT --> FIN["finish_scan<br/>tools/finish · 353"]
```

## 5. 可组合接缝

| 接缝 | 位置 | 作用范围 |
|---|---|---|
| `register_skill_dir()` | `skills/__init__.py` | 同名覆盖内置 skill |
| `register_agent_tools()` | `agents/factory.py:698` | 之后构建的所有 Agent |
| `build_strix_agent(...)` | `agents/factory.py:722` | `extra_tools` / `instructions_override` / `finish_tool` / `report_tool` / `coverage_tools` |
| `run_strix_scan(...)` | `core/runner.py:215` | `event_sink` / `status_sink` / `coordinator` |
| MCP | `~/.strix/mcp-servers.json` | 唯一运行期动态扩展 |
| CLI | `interface/cli_args.py` | `--scan-mode` / `--instruction` / `--max-budget` |

## 6. 三个容易误判的点

1. **浏览器不是 function tool**：它是沙箱内 CLI `agent-browser`，通过 `exec_command` 调用，只能在镜像层替换。
2. **`needs_approval` 只是透传**：`agents/factory.py:319` 从 `CustomTool` 继承，仓库内无工具启用，循环里也无审批中断处理。
3. **skill 不检索**：没有向量库，只有预加载、`load_skill`、`create_agent(skills=…)` 三种进入方式。
