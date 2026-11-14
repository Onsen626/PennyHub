# Strix 工具用途汇总（当前已知信息）

- 整理日期：2026-11-13。
- 来源：当前工作区 `third_party/strix`，Strix 1.7.0。
- 固定提交：`06015506625a78b981ae0b34be40239fc1b389be`。
- 本文依据已读取的源码、工具文档和现有目录实现整理，没有执行扫描或逐项探测工具环境。

## 1. 页面中的工具分类是什么意思

| 分类 | 当前已知数量 | 具体含义 |
| --- | ---: | --- |
| 原生函数 | 46 | Strix 用 Python 实现并通过 SDK 提供给 Agent 调用的函数，涵盖记录、报告、代理流量、协作和外部服务访问等。 |
| SDK 沙箱能力 | 2 | `Shell` 和 `Filesystem`，用于在任务沙箱内执行命令、操作文件。 |
| 沙箱工具使用说明 | 13 | 来自 `strix/skills/tooling/*.md` 的说明条目，包含命令行程序、Python 和程序库。 |
| MCP 工具 | 随配置和发现结果变化 | 由外部 MCP 服务提供，通过 Strix 的 MCP 访问函数发现并调用。 |

当前固定源码的前三类合计 **61 个目录条目**。此数字统计目录条目，包含说明文件与条件装配的函数，不能据此推断可执行程序数量或本次任务的可用工具数量。

### “原生函数”具体指什么

例如，Agent 调用 `create_note` 时，SDK 会执行 Strix 内的 Python 函数，保存一条笔记；调用 `list_requests` 时，函数会访问当前任务的 Caido 客户端，返回捕获的 HTTP 请求。

这个分类表示**实现与调用方式**。阅读用途时，需要同时看函数名称、中文说明、依赖条件以及是否产生外部操作。

### 命令行程序如何被使用

典型路径：Agent 选择工作步骤 → 通过 SDK `Shell` 执行命令 → 沙箱中的程序运行 → Agent 读取输出。

`nmap`、`nuclei`、`sqlmap` 等程序通常通过这条路径使用。对应的 Markdown 文件为 Agent 提供用法参考。

## 2. 原生函数逐项说明

以下列出当前目录提取器识别的全部 46 个函数。每组附源码路径，路径相对于 `third_party/strix/`。

### 2.1 过程辅助

源码：`strix/tools/thinking/tool.py`。

源码：`strix/tools/load_skill/tool.py`。

| 函数 | 用途 |
| --- | --- |
| `think` | 接收一段思考文本，返回确认结果。当前函数实现没有执行扫描、检索或持久化正文。 |
| `load_skill` | 读取一个或多个技能的 Markdown 正文，提供给 Agent 参考；加载说明文件本身不执行程序。 |

### 2.2 待办管理

源码：`strix/tools/todo/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `create_todo` | 为当前 Agent 创建一项或多项待办。 |
| `list_todos` | 按状态与优先级读取当前 Agent 的待办。 |
| `update_todo` | 修改待办标题、描述、优先级或状态。 |
| `mark_todo_done` | 将指定待办标记为完成。 |
| `mark_todo_pending` | 将指定待办恢复为待处理状态。 |
| `delete_todo` | 删除指定待办。 |

### 2.3 共享笔记

源码：`strix/tools/notes/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `create_note` | 记录观察、发现、方法或问题，供同一次任务中的 Agent 共享。 |
| `list_notes` | 按分类、标签或关键字查询笔记，默认返回摘要。 |
| `get_note` | 读取一条笔记的完整内容。 |
| `update_note` | 修改已有笔记的标题、正文或标签。 |
| `delete_note` | 删除一条笔记。 |

### 2.4 覆盖记录

源码：`strix/tools/coverage/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `record_coverage` | 记录某个测试对象与风险类别的检查结论，包括发现问题、未发现问题、排除候选和需要跟进。 |
| `update_coverage` | 更新已有覆盖记录的结论与证据，并保留历史。 |
| `list_coverage` | 查询覆盖记录及结论统计，帮助识别尚待处理的检查项目。 |

### 2.5 威胁模型

源码：`strix/tools/threat_model/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `get_threat_model` | 读取本次任务中某个目标的共享威胁模型及补充说明。 |
| `save_threat_model` | 保存目标的完整威胁模型；替换已有正文并清除原有补充说明。 |
| `amend_threat_model` | 追加威胁模型的修正或补充说明，保留已有正文。 |

### 2.6 外部资料

源码：`strix/tools/web_search/tool.py`。

| 函数 | 用途 |
| --- | --- |
| `web_search` | 通过 Exa 或 Perplexity 搜索公开资料；需要对应服务配置。 |
| `web_get_contents` | 通过 Exa 获取指定网页的整理后正文；需要 Exa 配置。 |

### 2.7 发现与报告

源码：`strix/tools/reporting/tool.py`。

| 函数 | 用途 |
| --- | --- |
| `create_vulnerability_report` | 登记一条漏洞发现，包含影响、技术分析、复现说明、证据及修复建议。 |
| `create_dependency_report` | 登记已知 CVE 对应的依赖组件问题；这是源码中存在的能力，本期黑盒创建流程没有新增源码输入。 |
| `update_vulnerability_report` | 修订已登记的漏洞报告，保留报告 ID 并说明修改原因。 |
| `delete_vulnerability_report` | 撤回后续验证推翻的漏洞报告，并记录撤回原因。 |
| `list_reports` | 按严重程度、发现类别、目标或关键字查询本次任务的报告。 |
| `get_report` | 读取指定报告的完整内容。 |

### 2.8 代理流量

源码：`strix/tools/proxy/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `list_requests` | 查询 Caido 已捕获的 HTTP 请求，支持筛选与分页。 |
| `view_request` | 查看指定请求或响应，支持正文分页及正则查找。 |
| `repeat_request` | 重放已捕获的请求，可修改地址、查询参数、请求头、正文或 Cookie；会发送实际网络请求。 |
| `list_sitemap` | 浏览 Caido 从已捕获流量整理出的站点目录。 |
| `view_sitemap_entry` | 查看某个站点目录条目的详细信息与关联请求。 |
| `scope_rules` | 管理 Caido 的范围规则，用于过滤代理工具看到的流量；该函数的规则用途限定在 Caido 代理范围。 |

### 2.9 MCP 访问

源码：`strix/tools/mcp/agent_tools.py`。

| 函数 | 用途 |
| --- | --- |
| `list_mcps` | 列出本次任务的 MCP 连接，首次使用时可以加载远端工具目录。 |
| `search_mcp_tools` | 在指定 MCP 连接中查询工具名称与简要描述。 |
| `get_mcp_tool_schema` | 获取指定 MCP 工具的输入结构，供后续调用使用。 |
| `describe_mcp` | 读取某个 MCP 连接的完整工具说明，保留为兼容方式。 |
| `call_mcp` | 调用指定连接中的具体工具；实际行为取决于远端工具。 |

### 2.10 Agent 协作

源码：`strix/tools/agents_graph/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `view_agent_graph` | 查看本次任务的 Agent 层级关系和运行状态。 |
| `send_message_to_agent` | 向其他 Agent 发送问题、指令或信息。 |
| `wait_for_agents` | 等待其他 Agent 的消息或等待超时。 |
| `create_agent` | 创建负责指定子任务的 Agent，并可指定技能和上下文继承。 |
| `stop_agent` | 请求指定 Agent 在当前轮次结束后停止，可包含其后代 Agent。 |

### 2.11 任务结束

源码：`strix/tools/finish/tool.py`。

源码：`strix/tools/agents_graph/tools.py`。

| 函数 | 用途 |
| --- | --- |
| `finish_scan` | 供根 Agent 保存最终报告并结束扫描；报告包含执行摘要、方法、技术分析和建议。 |
| `agent_finish` | 供子 Agent 提交工作总结并结束自身执行；漏洞报告通过报告工具单独登记。 |

### 2.12 交互等待

源码：`strix/tools/wait_for_user/tool.py`。

| 函数 | 用途 |
| --- | --- |
| `wait_for_user` | 在交互运行方式下暂停并等待用户回复，按运行条件装配。 |

### 使用条件补充

- 待办列表按 Agent 分开；笔记用于同一次任务中的共享信息。笔记源码包含 `notes.json` 的读取与保存逻辑，函数文档中“仅存在内存”的描述与当前实现存在差异。
- `web_search` 依赖 Exa 或 Perplexity 配置；`web_get_contents` 依赖 Exa 配置。
- 六个代理流量函数依赖当前任务中的 Caido 客户端和已捕获流量。`repeat_request` 会发送请求，`scope_rules` 的创建、修改和删除操作会改变代理规则。
- 五个 MCP 访问函数属于 Strix 本身。MCP 服务提供的具体工具另外发现，其行为取决于远端实现。
- 覆盖记录函数受 `coverage_tools` 装配条件影响。`wait_for_user` 在交互运行方式下加入。
- `finish_scan` 用于根 Agent，`agent_finish` 用于子 Agent。目录列出两者，具体 Agent 的装配结果按角色确定。
- `create_dependency_report` 包含依赖组件问题的报告能力；当前 PennyHub 黑盒范围没有因此增加源码输入或 SCA 页面。

## 3. SDK 沙箱能力

源码：`strix/agents/factory.py` 中的 `capabilities` 配置。

| 能力 | 用途 | 需要区分的内容 |
| --- | --- | --- |
| `Shell` | 提供执行命令的沙箱能力，使 Agent 可以调用沙箱内的程序。 | 命令执行工具在任务运行时绑定到具体沙箱。目录中的 `Shell` 是能力条目。 |
| `Filesystem` | 提供沙箱文件操作能力，供 Agent 处理输入文件、脚本和结果。 | 具体操作取决于 SDK 配置与任务沙箱。 |

## 4. 沙箱工具说明逐项汇总

来源：`strix/skills/tooling/`。目前读取到的说明文件如下；本文没有检查对应程序在当前运行容器中是否安装、是否可运行。

| 说明条目 | 对应工具 | 用途 | 来源文件 |
| --- | --- | --- | --- |
| `agent_browser` | agent-browser | 通过命令行操作浏览器，支持打开页面、填写表单、点击、截图及读取页面内容。 | `strix/skills/tooling/agent_browser.md` |
| `ffuf` | ffuf | 对目录、参数等输入位置进行批量请求测试，并按响应特征筛选结果。 | `strix/skills/tooling/ffuf.md` |
| `httpx` | ProjectDiscovery httpx | 探测 HTTP 服务，收集状态码、标题等信息。这里对应 ProjectDiscovery 的命令行工具。 | `strix/skills/tooling/httpx.md` |
| `hurl` | Hurl | 按文件描述执行 HTTP 请求序列和响应断言，适合复现登录流程或进行回归验证。 | `strix/skills/tooling/hurl.md` |
| `hypothesis` | Hypothesis | Python 属性测试库，通过生成输入和缩减失败样例检查规则或处理函数；属于程序库。 | `strix/skills/tooling/hypothesis.md` |
| `katana` | Katana | 爬取 Web 页面与相关资源，帮助发现链接和接口入口。 | `strix/skills/tooling/katana.md` |
| `naabu` | Naabu | 发现目标开放的网络端口。 | `strix/skills/tooling/naabu.md` |
| `nmap` | Nmap | 进行端口扫描、服务识别及相关网络检查。 | `strix/skills/tooling/nmap.md` |
| `nuclei` | Nuclei | 依据模板执行已知问题或配置特征检查。 | `strix/skills/tooling/nuclei.md` |
| `opengrep` | Opengrep | 根据规则分析源码；文档存在于上游源码，本期黑盒创建流程没有开放这类源码审查功能。 | `strix/skills/tooling/opengrep.md` |
| `python` | Python | 在沙箱内执行脚本，用于处理数据、自动化 HTTP 操作和编写验证逻辑。 | `strix/skills/tooling/python.md` |
| `sqlmap` | sqlmap | 辅助识别和验证 SQL 注入问题。 | `strix/skills/tooling/sqlmap.md` |
| `subfinder` | Subfinder | 通过被动信息来源收集子域名。 | `strix/skills/tooling/subfinder.md` |

## 5. MCP 工具如何进入工具目录

原生流程：

1. 读取 MCP 连接配置。
2. 使用 `list_mcps` 查看连接与目录加载情况。
3. 使用 `search_mcp_tools` 查询工具。
4. 使用 `get_mcp_tool_schema` 读取某个工具的输入结构。
5. 使用 `call_mcp` 执行具体工具。

配置位置为环境变量 `STRIX_MCP_CONFIG` 指定的文件，默认位置为 `~/.strix/mcp-servers.json`。

当前 PennyHub 目录实现可以展示配置中声明的连接名称和 `allowed_tools`。上游允许省略 `allowed_tools`，含义为开放服务器返回的全部工具。因此，配置未列出工具名称时，实际工具清单仍需通过 MCP 发现结果确定。当前实现已增加从所选任务保存的 `search_mcp_tools`／`get_mcp_tool_schema` 结构化结果读取工具名称，并保留来源事件。旧事件缺少可识别输出时，目录保持未知。

本文没有读取或导出本机 MCP 凭据，也没有连接 MCP 服务。

## 6. 如何阅读页面上的三个状态

| 状态信息 | 能说明什么 | 仍需进一步确认什么 |
| --- | --- | --- |
| 目录中存在 | 找到了源码定义、工厂装配代码、说明文件或配置声明。 | 当前任务是否装配、程序是否安装、依赖是否配置。 |
| 环境尚未核验 | 当前目录没有完成相应运行环境验证。 | 需要在具体环境中核验依赖、连接与程序。 |
| 模型调用请求 | 保存的事件显示模型生成了调用请求。 | 函数是否实际执行、执行是否成功。 |
| 已记录调用事件 | 保存的 SDK 事件记录到了工具调用。 | 返回结果是否成功、是否产生有效发现。 |

当前页面没有依据目录文件的存在将工具标记为“环境已可用”。工具失败、任务失败与发现为空，也需要分别查看。

## 7. 阅读时可以优先关注的对应关系

| 你想了解的能力 | 优先查看 |
| --- | --- |
| 如何发现页面和入口 | `agent_browser`、`katana`、`httpx`，以及代理流量中的 `list_sitemap`。 |
| 如何执行具体检查 | SDK `Shell`，以及 `nuclei`、`ffuf`、`sqlmap` 等程序说明。 |
| 如何使用登录后的请求 | Caido 的请求查询、查看和重放函数。 |
| 如何组织多个 Agent | Agent 协作组的六个函数，以及子 Agent 的 `agent_finish`。 |
| 如何保存漏洞结论 | 报告组的创建、查询、更新和撤回函数。 |
| 如何说明检查过什么 | `record_coverage`、`update_coverage`、`list_coverage`。 |
| 如何接入外部能力 | 五个 MCP 访问函数及具体 MCP 服务的工具目录。 |
| 如何结束整个任务 | 根 Agent 的 `finish_scan`。 |

## 8. 信息来源与验证范围

- 函数清单：`scripts/strix-catalog.py` 对当前固定源码的 AST 提取结果。
- 装配方式：`third_party/strix/strix/agents/factory.py`。
- 各函数用途：对应函数的文档与已读取实现。
- 沙箱程序说明：`third_party/strix/strix/skills/tooling/*.md`。
- 当前页面分类与状态：`lib/native-catalog.ts`、`lib/server/native-catalog.ts`、`lib/server/native-catalog-usage.ts`、`components/platform/native-catalog-panel.tsx`。

本文整理当前已知信息，未执行真实扫描、批量工具安装、容器探测或 MCP 连接验证。
