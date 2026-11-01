/* ==========================================================================
   PENNYHUB — Offensive Security Agents & Benchmarks Interactive Engine
   ========================================================================== */

const AGENTS_DATA = [
  {
    id: "xbow",
    index: "AGT-01",
    name: "XBOW",
    org: "XBOW Inc.",
    category: "autonomous-pentest",
    categoryLabel: "自主渗透 Agent",
    license: "Commercial",
    tags: ["WEB-EXPLOIT", "ZERO-FALSE-POSITIVE", "AUTONOMOUS", "CLOUD/ON-PREM"],
    summary: "行业标杆级全自主 Web 与 API 渗透测试 Agent 系统。通过数百个并发特化子 Agent 执行侦察、漏洞假设、PoC 构造与沙箱验证，在多项基准测试中超越人类资深渗透测试员。",
    metrics: {
      solveRate: "84.6% (XBOW Bench)",
      execMode: "Multi-Agent Swarm",
      sandbox: "Isolated Docker"
    },
    cli: "xbow scan --target https://staging.target.internal --verify-poc --concurrency 16",
    architecture: "基于分层 Validator-Exploiter 架构：每个漏洞类型（SQLi、SSRF、IDOR、SSTI、反序列化）由独立微调策略与确定性验证器闭环驱动，仅报告经过真实 payload 触发验证的漏洞。",
    repoUrl: "https://xbow.com",
    featured: true
  },
  {
    id: "cai",
    index: "AGT-02",
    name: "CAI (Cybersecurity AI)",
    org: "Alias Robotics",
    category: "autonomous-pentest",
    categoryLabel: "自主渗透 Agent",
    license: "Open-Source (MIT)",
    tags: ["OPEN-SOURCE", "300+-TOOLS", "MULTI-MODEL", "BUG-BOUNTY"],
    summary: "开源红队与漏洞赏金多智能体框架。内置超过 300 种安全工具接口（Nmap、Nuclei、Sqlmap、Ghidra、Pwntools），支持任意 LLM 路由（Claude、DeepSeek、Hermes、GPT）与 HITL 协同。",
    metrics: {
      solveRate: "68.2% (CAIBench)",
      execMode: "HITL / Autonomous",
      sandbox: "Docker + Kali"
    },
    cli: "pip install cai-framework && cai --model anthropic/claude-sonnet-4 --task 'Red team 10.10.11.42'",
    architecture: "采用模块化 Agentic 编排层，支持 Red-Team Planner、Recon Specialist、Exploit Crafter 与 Report Synthesizer 角色切换，原生兼容 MCP 工具协议。",
    repoUrl: "https://github.com/aliasrobotics/cai",
    featured: true
  },
  {
    id: "pentestgpt",
    index: "AGT-03",
    name: "PentestGPT",
    org: "GreyDGL (NTU)",
    category: "autonomous-pentest",
    categoryLabel: "自主渗透 Agent",
    license: "Open-Source (MIT)",
    tags: ["PTT-REASONING", "HTB-PROVEN", "INTERACTIVE", "OPEN-SOURCE"],
    summary: "基于渗透测试任务树（Penetration Testing Task Tree, PTT）的经典开源渗透辅助与半自主执行框架。通过将全局攻击图与局部终端执行分离，有效克服长上下文遗忘问题。",
    metrics: {
      solveRate: "58.0% (HTB Easy/Med)",
      execMode: "PTT Guided Loop",
      sandbox: "Local / Tmux"
    },
    cli: "pentestgpt --reasoning_model gpt-4o --parsing_model claude-3-7-sonnet --logging",
    architecture: "三模块协同设计：Reasoning Module（维护 PTT 状态树）、Generation Module（生成具体工具命令与 Exploit 脚本）、Parsing Module（压缩终端高噪输出）。",
    repoUrl: "https://github.com/GreyDGL/PentestGPT",
    featured: false
  },
  {
    id: "enigma",
    index: "AGT-04",
    name: "EnIGMA",
    org: "NYU / Princeton / Tel Aviv",
    category: "ctf-exploit",
    categoryLabel: "CTF 与漏洞利用",
    license: "Open-Source (MIT)",
    tags: ["SWE-AGENT-CORE", "BINARY-PWN", "INTERACTIVE-GDB", "CTF-SOLVER"],
    summary: "专为交互式攻防与 CTF 漏洞利用设计的安全 Agent（基于 SWE-agent 扩展）。独创 Interactive Agent Computer Interface (ACI)，让大模型能够在非阻塞模式下操作 GDB 调试器与远程 nc 会话。",
    metrics: {
      solveRate: "39.5% (NYU CTF)",
      execMode: "Interactive ACI",
      sandbox: "Containerized"
    },
    cli: "python run_enigma.py --model_name claude-3-7-sonnet --challenge_dir ./nyu_ctf/pwn/buffer_overflow",
    architecture: "針對二进制逆向（Rev）、Pwn 与密码学场景定制了 Decompiler View、Interactive Debugger Session 与 Server Connection 原语。",
    repoUrl: "https://enigma-agent.com",
    featured: true
  },
  {
    id: "cybench-agent",
    index: "AGT-05",
    name: "Cybench Harness Agent",
    org: "Stanford RegLab",
    category: "ctf-exploit",
    categoryLabel: "CTF 与漏洞利用",
    license: "Open-Source (Apache-2.0)",
    tags: ["SUBTASK-GUIDED", "BASH-LOOP", "STANFORD", "EVAL-HARNESS"],
    summary: "Stanford Cybench 官方参考红队评估 Agent。支持无引导（Unguided）与子任务引导（Subtask-Guided）双模式，提供可复现的 Kali 容器执行环境与细粒度观察-思考-行动轨迹记录。",
    metrics: {
      solveRate: "42.5% (Unguided) / 71% (Subtask)",
      execMode: "ReAct + Kali Bash",
      sandbox: "Docker Network"
    },
    cli: "./run_benchmark.sh --model anthropic/claude-3-7-sonnet --task_list subtask_list.txt --max_iterations 25",
    architecture: "标准化 Agent-Environment 交互循环，内置命令超时熔断、状态快照以及 First-Time-to-Solve (FST) 能力边界计算。",
    repoUrl: "https://github.com/andyzorigin/cybench",
    featured: false
  },
  {
    id: "garak",
    index: "AGT-06",
    name: "NVIDIA Garak",
    org: "NVIDIA AI Red Team",
    category: "llm-redteam",
    categoryLabel: "LLM / AI 红队",
    license: "Open-Source (Apache-2.0)",
    tags: ["LLM-SCANNER", "JAILBREAK", "PROMPT-INJECTION", "NVIDIA"],
    summary: "生成式 AI 领域的“Nmap/Metasploit”。自动化探测大模型及 Agent 系统的提示词注入、越狱（DAN/GCG/AutoDAN）、数据泄露、幻觉诱导、恶意代码生成与工具滥用漏洞。",
    metrics: {
      solveRate: "140+ Attack Probes",
      execMode: "Automated Probe Matrix",
      sandbox: "Python CLI"
    },
    cli: "python3 -m garak --model_type openai --model_name target-agent-v1 --probes encoding,dan,promptinject",
    architecture: "由 Probes（攻击载荷生成器）、Generators（目标模型适配层）、Detectors（基于规则或分类器的响应评估器）与 Buffs（载荷混淆变异器）组成。",
    repoUrl: "https://github.com/NVIDIA/garak",
    featured: false
  },
  {
    id: "pyrit",
    index: "AGT-07",
    name: "Microsoft PyRIT",
    org: "Microsoft AI Red Team",
    category: "llm-redteam",
    categoryLabel: "LLM / AI 红队",
    license: "Open-Source (MIT)",
    tags: ["MULTI-TURN-ATTACK", "MULTIMODAL", "MICROSOFT", "ORCHESTRATOR"],
    summary: "微软开源的 Python 风险识别工具（Python Risk Identification Tool）。支持多轮自适应红队博弈（Red-Teaming Orchestrator），利用攻击者 LLM 动态调整策略以攻破目标多模态/Agent 系统。",
    metrics: {
      solveRate: "Multi-Turn Adaptive",
      execMode: "Attacker-Target Loop",
      sandbox: "DuckDB Memory"
    },
    cli: "pyrit-run --orchestrator CrescendoOrchestrator --target https://api.internal/agent/chat",
    architecture: "内建 Crescendo（渐进式越狱）、Tree-of-Attacks (TAP)、Skeleton Key 等高级多轮攻击编排器，支持文本、图像与音频跨模态转换器。",
    repoUrl: "https://github.com/Azure/PyRIT",
    featured: false
  },
  {
    id: "promptfoo",
    index: "AGT-08",
    name: "Promptfoo Red Team",
    org: "Promptfoo",
    category: "llm-redteam",
    categoryLabel: "LLM / AI 红队",
    license: "Open-Source (MIT)",
    tags: ["AGENTIC-REDTEAM", "CI/CD-GATE", "SSR/BOLA", "OWASP-LLM-TOP10"],
    summary: "面向 AI 应用与 Tool-Calling Agent 的声明式红队扫描器。专门针对 Agent 权限越界（BOLA/BFLA）、间接提示词注入、SSR 工具调用、SQL 注入与敏感凭据泄露生成动态对抗用例。",
    metrics: {
      solveRate: "60+ Agent Plugins",
      execMode: "CI/CD & Dynamic Fuzz",
      sandbox: "Node / Local"
    },
    cli: "npx promptfoo@latest redteam run --config promptfooconfig.yaml --output report.html",
    architecture: "基于 Plugins（风险场景定义）与 Strategies（GOAT、Crescendo、Base64/ROT13/Leetspeak 动态对抗策略）矩阵式组合，直接集成 GitHub Actions。",
    repoUrl: "https://github.com/promptfoo/promptfoo",
    featured: false
  },
  {
    id: "autoattacker",
    index: "AGT-09",
    name: "AutoAttacker",
    org: "Academic / Red Team Lab",
    category: "post-breach",
    categoryLabel: "后渗透与内网横向",
    license: "Open-Source",
    tags: ["POST-EXPLOIT", "ACTIVE-DIRECTORY", "LATERAL-MOVE", "C2-AGENT"],
    summary: "专注于失陷后内网横向移动（Post-Breach & Lateral Movement）的自主红队 Agent。在真实 Windows Active Directory 与 Linux 混合域环境中自动化完成提权、凭据转储（Mimikatz）与域控接管。",
    metrics: {
      solveRate: "78.5% (AD Range Tasks)",
      execMode: "Summarizer-Planner-Nav",
      sandbox: "VMware /Ludus Range"
    },
    cli: "python autoattacker.py --c2 metasploit-rpc --session 1 --objective 'Dump NTDS.dit on DC01'",
    architecture: "結合经验回放库（Experience Manager）与 Metasploit/Sliver C2 RPC 接口，将抽象战术目标（MITRE ATT&CK TTPs）实时映射为免杀或原生内网命令。",
    repoUrl: "https://arxiv.org/abs/2403.01038",
    featured: false
  },
  {
    id: "hacksynth",
    index: "AGT-10",
    name: "HackSynth / Strix",
    org: "Autonomous Cyber Research",
    category: "ctf-exploit",
    categoryLabel: "CTF 与漏洞利用",
    license: "Open-Source",
    tags: ["ZERO-SHOT-EXPLOIT", "SYMBOLIC-EXEC", "CVE-REPRO", "DUAL-AGENT"],
    summary: "结合规划器（Planner）与总结器（Summarizer）双子架构的自主漏洞发现与 CTF 求解 Agent。无需人工介入即可在 PicoCTF 与 OverTheWire 靶场中循环合成利用代码。",
    metrics: {
      solveRate: "62.0% (PicoCTF 200)",
      execMode: "Planner-Summarizer",
      sandbox: "QEMU / Docker"
    },
    cli: "hacksynth --target ssh://bandit@localhost:2220 --model hermes-3-llama-3.1-405b",
    architecture: "双流记忆流架构：Planner 负责假设生成与 bash 工具合成，Summarizer 持续蒸馏历史命令反馈以保持固定窗口的高信噪比推理。",
    repoUrl: "https://arxiv.org/abs/2412.01778",
    featured: false
  },
  {
    id: "reaper-ai",
    index: "AGT-11",
    name: "ReaperAI",
    org: "Ghost Security",
    category: "autonomous-pentest",
    categoryLabel: "自主渗透 Agent",
    license: "Open-Source / Enterprise",
    tags: ["API-SECURITY", "BOLA-HUNTER", "HTTP-PROXY", "AUTONOMOUS"],
    summary: "基于实时 HTTP/API 流量感知的自主应用安全测试 Agent。自动抓包、推断业务逻辑状态机，并针对业务逻辑绕过、越权访问（IDOR/BOLA）与竞争条件发起精准变异测试。",
    metrics: {
      solveRate: "High API Logic Coverage",
      execMode: "Proxy + Agent Fuzzer",
      sandbox: "Docker Compose"
    },
    cli: "docker compose up reaper-agent --env TARGET_DOMAIN=api.acme.corp",
    architecture: "内嵌智能代理拦截器，将被动流量建模为领域对象图（Domain Graph），由 Attack Agent 自主编写并重放多账户越权测试序列。",
    repoUrl: "https://github.com/ghostsecurity/reaper",
    featured: false
  },
  {
    id: "caldera-agent",
    index: "AGT-12",
    name: "MITRE Caldera + LLM Plugin",
    org: "MITRE / Community",
    category: "post-breach",
    categoryLabel: "后渗透与内网横向",
    license: "Open-Source (Apache-2.0)",
    tags: ["MITRE-ATT&CK", "ADVERSARY-EMULATION", "C2-AUTOMATION", "ENTERPRISE"],
    summary: "基于 MITRE ATT&CK 框架的自动化对手模拟平台，结合 LLM 规划器插件后可根据目标主机实时回传的 Facts（进程、端口、域关系）动态合成下一阶段攻击链。",
    metrics: {
      solveRate: "350+ ATT&CK Abilities",
      execMode: "Fact-Driven Planner",
      sandbox: "Sandcat Agent"
    },
    cli: "python3 server.py --insecure --llm-planner hermes-pro",
    architecture: "在确定性逻辑规划器之上引入 LLM 战术推理层，支持红蓝对抗演练（Purple Teaming）的自动化闭环验证与 SIEM 告警覆盖率审计。",
    repoUrl: "https://github.com/mitre/caldera",
    featured: false
  }
];

const BENCHMARKS_DATA = [
  {
    id: "cybench",
    code: "BMK-01",
    name: "Cybench",
    institution: "Stanford RegLab & CRFM",
    year: "2024–2026",
    tasksCount: "40 Pro CTF Tasks (173 Subtasks)",
    domains: ["Web", "Crypto", "Rev", "Pwn", "Forensics"],
    highlightChip: "INDUSTRY STANDARD",
    desc: "精选自 HackTheBox、SekaiCTF、GlacierCTF、HKCERT 等 4 个顶级职业 CTF 赛事的 40 道高难度真题。首创 First-Solve-Time (FST) 人类耗时映射与 Subtask-Guided 细粒度评测，精准衡量模型自主攻防上限。",
    metricsLabel: "SOTA Pass@1 (Unguided): 46.5% | Subtask-Guided: 74.2%",
    url: "https://cybench.github.io"
  },
  {
    id: "nyu-ctf",
    code: "BMK-02",
    name: "NYU CTF Bench",
    institution: "NYU OSIRIS Lab (NeurIPS)",
    year: "2024–2026",
    tasksCount: "200 Real CSAW CTF Challenges",
    domains: ["Pwn", "Rev", "Crypto", "Web", "Misc"],
    highlightChip: "DOCKER-NATIVE",
    desc: "由纽约大学 OSIRIS 安全实验室构建的大规模开源 CTF 基准套件，涵盖 2017–2023 年 CSAW 预赛与决赛真题。全量提供容器化靶场服务与自动化 Flag 校验流水线。",
    metricsLabel: "SOTA Pass@1: 41.0% (EnIGMA + Claude Sonnet)",
    url: "https://nyu-ctf-bench.github.io"
  },
  {
    id: "bountybench",
    code: "BMK-03",
    name: "BountyBench",
    institution: "Stanford / CMU / UC Berkeley",
    year: "2025–2026",
    tasksCount: "40 Real-World Bug Bounty Systems ($100 to $30,000)",
    domains: ["Detect", "Exploit", "Patch", "Real-World CVE"],
    highlightChip: "REAL BUG BOUNTY",
    desc: "超越合成 CTF 题目的真实开源软件漏洞赏金评测基准。在复杂多容器生产级代码库中同时评测 Agent 的三大核心能力：自主发现未知漏洞（Detect）、构造可验证利用（Exploit）与生成安全补丁（Patch）。",
    metricsLabel: "SOTA Detect: 52.5% | Exploit: 67.8% | Patch: 75.0%",
    url: "https://bountybench.github.io"
  },
  {
    id: "xbow-bench",
    code: "BMK-04",
    name: "XBOW Web Validation Benchmark",
    institution: "XBOW Security Research",
    year: "2024–2026",
    tasksCount: "104 Containerized Web & API Vuln Labs",
    domains: ["SQLi", "SSRF", "IDOR", "XSS", "SSTI", "Deserialization"],
    highlightChip: "WEB PENTEST",
    desc: "专注于现代 Web 应用与微服务漏洞挖掘的实战靶场集。涵盖 104 个分级难度场景（含盲注、二阶注入、JWT 伪造、GraphQL 越权），广泛用于对比自主渗透 Agent 与人类白帽黑客的速度与覆盖率。",
    metricsLabel: "XBOW Agent: 84.6% (in 28 mins) vs Senior Human: 85.0% (in 40 hrs)",
    url: "https://xbow.com/blog/xbow-benchmark/"
  },
  {
    id: "caibench",
    code: "BMK-05",
    name: "CAIBench",
    institution: "Alias Robotics",
    year: "2025–2026",
    tasksCount: "Multi-Domain Meta-Benchmark (AD Ranges + OT/Robotics)",
    domains: ["Attack & Defense", "Jeopardy CTF", "OT/ICS", "Cyber Ranges"],
    highlightChip: "ATTACK-DEFENSE",
    desc: "首个融合传统 Jeopardy CTF、动态攻防靶场（Attack & Defense Cyber Ranges）、工控/机器人安全（RCP）与信息安全理论的综合元基准框架。",
    metricsLabel: "Evaluates Dual-Use Offensive vs Defensive Agent Loops",
    url: "https://arxiv.org/abs/2510.26317"
  },
  {
    id: "cyberseceval",
    code: "BMK-06",
    name: "CyberSecEval 3 / SEC-bench",
    institution: "Meta Purple Llama",
    year: "2024–2026",
    tasksCount: "8 Evaluation Suites (Autonomous Cyberattack + Spear Phishing)",
    domains: ["Exploit Gen", "Prompt Injection", "Social Eng", "Secure Code"],
    highlightChip: "FRONTIER SAFETY",
    desc: "Meta 开源的前沿大模型网络安全风险与红队能力基准。覆盖自主网络攻击辅助度、视觉提示词注入、自动化鱼叉钓鱼劝诱力及 C/C++/Python 不安全代码生成率。",
    metricsLabel: "Adopted by Frontier AI Labs for Pre-Deployment Red Teaming",
    url: "https://github.com/meta-llama/PurpleLlama"
  }
];

const LEADERBOARD_DATA = [
  {
    rank: "01",
    agent: "XBOW Autonomous Swarm",
    backbone: "Multi-Model + Custom Validators",
    mode: "Autonomous Swarm",
    cybench: 62.5,
    nyuCtf: 54.0,
    xbowWeb: 84.6,
    bountyExploit: 71.2,
    license: "Commercial"
  },
  {
    rank: "02",
    agent: "CAI Framework (v0.5)",
    backbone: "Claude 4 Sonnet / DeepSeek-R1",
    mode: "Multi-Agent + 300 Tools",
    cybench: 57.5,
    nyuCtf: 48.5,
    xbowWeb: 76.9,
    bountyExploit: 66.0,
    license: "Open-Source"
  },
  {
    rank: "03",
    agent: "EnIGMA Interactive ACI",
    backbone: "Claude 3.7 Sonnet (Thinking)",
    mode: "Interactive GDB/Shell",
    cybench: 50.0,
    nyuCtf: 44.5,
    xbowWeb: 68.2,
    bountyExploit: 61.5,
    license: "Open-Source"
  },
  {
    rank: "04",
    agent: "Cybench Harness + Hermes-3/4",
    backbone: "Nous Hermes Pro / 405B",
    mode: "ReAct + Subtask Memory",
    cybench: 47.5,
    nyuCtf: 39.0,
    xbowWeb: 64.4,
    bountyExploit: 55.8,
    license: "Open-Source"
  },
  {
    rank: "05",
    agent: "HackSynth Dual-Agent",
    backbone: "GPT-4o / o3-mini",
    mode: "Planner-Summarizer",
    cybench: 42.5,
    nyuCtf: 36.5,
    xbowWeb: 61.5,
    bountyExploit: 51.0,
    license: "Open-Source"
  },
  {
    rank: "06",
    agent: "PentestGPT (PTT v2)",
    backbone: "GPT-4o + Local Parser",
    mode: "Task-Tree Guided",
    cybench: 35.0,
    nyuCtf: 31.0,
    xbowWeb: 58.6,
    bountyExploit: 44.2,
    license: "Open-Source"
  }
];

const FAQS_DATA = [
  {
    q: "渗透测试 Agent（Autonomous Pentest Agent）与传统漏扫器（Nuclei / AWVS）有什么核心区别？",
    a: "传统漏扫器依赖静态签名与预定义规则模板，无法理解复杂的多步业务逻辑或动态上下文。而现代渗透测试 Agent（如 XBOW、CAI、EnIGMA）具备推理-执行-观测（ReAct）闭环：它们能阅读源码与报错信息、在交互式终端中编写定制 Python/Bash 利用脚本、通过 GDB 调试二进制程序，并将多个低危信息串联为完整的高危攻击链（Exploit Chain）。"
  },
  {
    q: "如何选择适合评估红队大模型或 Agent 的 Benchmark？",
    a: "取决于您的评估目标：若评估综合高阶攻防与二进制/密码学/Web 深度漏洞利用，首选 Stanford 的 Cybench（40 道职业级 CTF）与 NYU CTF Bench（200 道容器化真题）；若评估真实生产级代码库中的 0-day/N-day 漏洞挖掘与修复，推荐使用 BountyBench；若聚焦 Web 与 API 自动化渗透验证，XBOW Benchmark（104 个靶场）最具参考价值；若针对生成式 AI 应用自身的护栏越狱与提示词注入，则应使用 NVIDIA Garak 或 Promptfoo。"
  },
  {
    q: "什么是 Cybench 中的 Unguided（无引导）与 Subtask-Guided（子任务引导）评测模式？",
    a: "在 Unguided 模式下，Agent 仅收到靶场入口与题目描述，需完全自主完成侦察、分析到获取最终 Flag 的全过程；而在 Subtask-Guided 模式下，长链路渗透任务被拆解为 4~6 个阶段性子问题（例如：#1 识别服务端口与框架版本 -> #2 定位反序列化入口函数 -> #3 构造 ROP 链获取 shell），用于诊断模型在长程规划中的具体卡点。"
  },
  {
    q: "在企业内网或私有云环境中如何安全地运行这些红队 Agent？",
    a: "强烈建议采用双层隔离架构：所有目标靶场与被测服务运行在无外网出口的 Docker Bridge / Kubernetes Namespace 沙箱内，Agent 容器仅通过受控虚拟网卡访问目标子网；同时可通过本地私有化推理网关（如 Nous Hermes Enterprise / vLLM）替代公有云 API，确保敏感源码、内网拓扑与漏洞详情不出域。"
  },
  {
    q: "如何向 PennyHub 提交新的开源红队 Agent 或最新 Benchmark 评测数据？",
    a: "点击页面右上角或导航栏的「Submit Tool / Benchmark」，提供项目 GitHub 仓库地址、沙箱复现脚本以及在标准基准（如 Cybench / NYU CTF / BountyBench）上的可验证日志，即可纳入索引与排行榜。"
  }
];

/* ==========================================================================
   State & Rendering
   ========================================================================== */
let currentCategory = "all";
let currentSearch = "";
let currentSortKey = "cybench";
let sortDesc = true;

function renderAgents() {
  const grid = document.getElementById("agents-grid");
  const countEl = document.getElementById("agents-visible-count");
  if (!grid) return;

  const filtered = AGENTS_DATA.filter((item) => {
    const matchCat = currentCategory === "all" || item.category === currentCategory;
    const q = currentSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.org.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchQuery;
  });

  if (countEl) {
    countEl.textContent = `SHOWING ${filtered.length} OF ${AGENTS_DATA.length} INDEXED AGENTS`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; border: 1px dotted var(--hermes-primary); text-align: center; font-family: var(--font-mono);">
        <p style="font-size: 14px; margin-bottom: 12px;">[ NO MATCHING OFFENSIVE AGENTS FOUND ]</p>
        <button type="button" class="hermes-button" data-variant="ghost" onclick="resetFilters()">
          <span>RESET FILTER MATRIX</span>
          <span class="hermes-button-hover-border"></span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (agent) => `
      <article class="agent-card" onclick="openAgentModal('${agent.id}')" tabindex="0" role="button" aria-label="View details for ${agent.name}">
        <div>
          <div class="agent-card-top">
            <span class="agent-index">[${agent.index}] // ${agent.categoryLabel}</span>
            <span class="hermes-chip ${agent.featured ? "accent" : ""}">${agent.license}</span>
          </div>
          <div class="agent-title-row">
            <h3 class="agent-name">${agent.name}</h3>
            <span class="agent-org">${agent.org}</span>
          </div>
          <p class="agent-desc">${agent.summary}</p>
        </div>
        <div>
          <div class="agent-metrics-row">
            <div class="agent-metric-cell">
              <span>Benchmark</span>
              <strong>${agent.metrics.solveRate}</strong>
            </div>
            <div class="agent-metric-cell">
              <span>Architecture</span>
              <strong>${agent.metrics.execMode}</strong>
            </div>
            <div class="agent-metric-cell">
              <span>Environment</span>
              <strong>${agent.metrics.sandbox}</strong>
            </div>
          </div>
          <div class="hermes-chip-row" style="margin-bottom: 16px;">
            ${agent.tags.map((t) => `<span class="hermes-chip">${t}</span>`).join("")}
          </div>
          <div class="agent-card-footer">
            <span>CLI & SPEC SHEET</span>
            <span class="agent-inspect-link">
              INSPECT
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11h11.17l-4.88-4.88c-.39-.39-.39-1.03 0-1.42.39-.39 1.02-.39 1.41 0l6.59 6.59c.39.39.39 1.02 0 1.41l-6.59 6.59c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41L16.17 13H5c-.55 0-1-.45-1-1s.45-1 1-1z"/></svg>
            </span>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function renderBenchmarks() {
  const container = document.getElementById("benchmarks-grid");
  if (!container) return;

  container.innerHTML = BENCHMARKS_DATA.map(
    (b) => `
    <div class="benchmark-card">
      <div class="benchmark-card-header">
        <div>
          <span class="benchmark-inst">[${b.code}] · ${b.institution} (${b.year})</span>
          <h3 class="benchmark-name" style="margin-top: 4px;">${b.name}</h3>
        </div>
        <span class="hermes-chip filled">${b.highlightChip}</span>
      </div>
      <p style="font-size: 14px; line-height: 1.55;">${b.desc}</p>
      <div class="hermes-chip-row">
        ${b.domains.map((d) => `<span class="hermes-chip">${d}</span>`).join("")}
      </div>
      <div class="benchmark-stats-bar">
        <div><strong>TASKS:</strong> ${b.tasksCount}</div>
        <div style="color: var(--hermes-primary);"><strong>${b.metricsLabel}</strong></div>
        <a href="${b.url}" target="_blank" rel="noopener noreferrer" style="margin-left: auto; text-decoration: underline; font-weight: 600;">PAPER / REPO ↗</a>
      </div>
    </div>
  `
  ).join("");
}

function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-tbody");
  if (!tbody) return;

  const sorted = [...LEADERBOARD_DATA].sort((a, b) => {
    const valA = a[currentSortKey];
    const valB = b[currentSortKey];
    return sortDesc ? valB - valA : valA - valB;
  });

  tbody.innerHTML = sorted
    .map(
      (row, idx) => `
    <tr>
      <td style="font-weight: 600; color: var(--hermes-primary);">#0${idx + 1}</td>
      <td>
        <div style="font-weight: 600;">${row.agent}</div>
        <div style="font-size: 11px; color: var(--hw-teams-ink-muted);">${row.mode}</div>
      </td>
      <td><span class="hermes-chip">${row.backbone}</span></td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar-track"><div class="score-bar-fill ${idx === 0 ? "top-score" : ""}" style="width: ${row.cybench}%"></div></div>
          <strong>${row.cybench.toFixed(1)}%</strong>
        </div>
      </td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar-track"><div class="score-bar-fill" style="width: ${row.nyuCtf}%"></div></div>
          <span>${row.nyuCtf.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar-track"><div class="score-bar-fill" style="width: ${row.xbowWeb}%"></div></div>
          <strong>${row.xbowWeb.toFixed(1)}%</strong>
        </div>
      </td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar-track"><div class="score-bar-fill" style="width: ${row.bountyExploit}%"></div></div>
          <span>${row.bountyExploit.toFixed(1)}%</span>
        </div>
      </td>
      <td><span class="hermes-chip ${row.license === "Open-Source" ? "filled" : ""}">${row.license}</span></td>
    </tr>
  `
    )
    .join("");
}

function renderFaqs() {
  const list = document.getElementById("faq-list");
  if (!list) return;

  list.innerHTML = FAQS_DATA.map(
    (item, idx) => `
    <div class="faq-item" data-state="${idx === 0 ? "open" : "closed"}">
      <h3>
        <button type="button" class="faq-trigger" onclick="toggleFaq(this)">
          <span class="faq-question-text">${item.q}</span>
          <svg class="icon-plus" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 11h7v2h-7v7h-2v-7H4v-2h7V4h2v7Z"></path>
          </svg>
          <svg class="icon-minus" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 11h16v2H4z"></path>
          </svg>
        </button>
      </h3>
      <div class="faq-answer">${item.a}</div>
    </div>
  `
  ).join("");
}

/* ==========================================================================
   Interactive Handlers
   ========================================================================== */
window.setCategoryFilter = function (cat, btnEl) {
  currentCategory = cat;
  document.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderAgents();
};

window.resetFilters = function () {
  currentCategory = "all";
  currentSearch = "";
  const input = document.getElementById("agent-search-input");
  if (input) input.value = "";
  document.querySelectorAll(".filter-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.cat === "all");
  });
  renderAgents();
};

window.sortLeaderboard = function (key) {
  if (currentSortKey === key) {
    sortDesc = !sortDesc;
  } else {
    currentSortKey = key;
    sortDesc = true;
  }
  renderLeaderboard();
};

window.toggleFaq = function (btn) {
  const item = btn.closest(".faq-item");
  if (!item) return;
  const isOpen = item.getAttribute("data-state") === "open";
  item.setAttribute("data-state", isOpen ? "closed" : "open");
};

window.openAgentModal = function (agentId) {
  const agent = AGENTS_DATA.find((a) => a.id === agentId);
  if (!agent) return;
  const backdrop = document.getElementById("spec-modal-backdrop");
  const content = document.getElementById("spec-modal-content");
  if (!backdrop || !content) return;

  content.innerHTML = `
    <div class="spec-modal-header">
      <span>[${agent.index}] // SPECIFICATION SHEET & CLI HARNESS</span>
      <button type="button" onclick="closeAgentModal()" style="background:none;border:none;color:#fff;cursor:pointer;font-family:var(--font-mono);font-size:13px;">[ ESC / CLOSE ✕ ]</button>
    </div>
    <div class="spec-modal-body">
      <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-family:var(--font-display);font-size:32px;font-weight:600;line-height:1.1;">${agent.name}</h3>
          <p style="font-family:var(--font-mono);font-size:12px;color:var(--hermes-primary);margin-top:4px;">MAINTAINER: ${agent.org} · LICENSE: ${agent.license}</p>
        </div>
        <a href="${agent.repoUrl}" target="_blank" rel="noopener noreferrer" class="hermes-button" data-variant="primary">
          <span>OPEN REPOSITORY / SITE ↗</span>
          <span class="hermes-button-hover-border"></span>
        </a>
      </div>

      <div class="hermes-chip-row">
        ${agent.tags.map((t) => `<span class="hermes-chip">${t}</span>`).join("")}
      </div>

      <div style="padding:14px;border:1px dotted var(--hermes-primary);background:var(--hpv2-row-well);">
        <div style="font-family:var(--font-mono);font-size:11px;text-transform:uppercase;color:var(--hermes-primary);margin-bottom:6px;">// OVERVIEW</div>
        <p style="font-size:14.5px;line-height:1.6;">${agent.summary}</p>
      </div>

      <div>
        <div style="font-family:var(--font-mono);font-size:11px;text-transform:uppercase;color:var(--hermes-primary);margin-bottom:6px;">// ARCHITECTURE & EXECUTION LOOP</div>
        <p style="font-size:14px;line-height:1.6;">${agent.architecture}</p>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-family:var(--font-mono);font-size:11px;text-transform:uppercase;color:var(--hermes-primary);">// QUICKSTART CLI COMMAND</span>
          <button type="button" class="hermes-chip" style="cursor:pointer;" onclick="copyCliText('${agent.cli.replace(/'/g, "\\'")}', this)">COPY COMMAND</button>
        </div>
        <div class="plate-code-snippet" style="background:#050518;color:#f2f2f2;">
          <span class="cmd-prompt">$</span> ${agent.cli}
        </div>
      </div>

      <div class="agent-metrics-row" style="margin-bottom:0;">
        <div class="agent-metric-cell">
          <span>Benchmark Score</span>
          <strong>${agent.metrics.solveRate}</strong>
        </div>
        <div class="agent-metric-cell">
          <span>Execution Mode</span>
          <strong>${agent.metrics.execMode}</strong>
        </div>
        <div class="agent-metric-cell">
          <span>Sandbox Isolation</span>
          <strong>${agent.metrics.sandbox}</strong>
        </div>
      </div>
    </div>
  `;

  backdrop.classList.add("is-open");
};

window.closeAgentModal = function () {
  const backdrop = document.getElementById("spec-modal-backdrop");
  if (backdrop) backdrop.classList.remove("is-open");
};

window.copyCliText = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = "COPIED ✓";
    setTimeout(() => {
      btn.textContent = old;
    }, 1500);
  });
};

window.toggleTheme = function () {
  const html = document.documentElement;
  const current = html.getAttribute("data-marketing-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-marketing-theme", next);
  document.querySelectorAll(".theme-toggle-label").forEach((el) => {
    el.textContent = next === "dark" ? "THEME: DARK" : "THEME: PAPER";
  });
};

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  renderAgents();
  renderBenchmarks();
  renderLeaderboard();
  renderFaqs();

  const searchInput = document.getElementById("agent-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderAgents();
    });
  }

  // Sticky paper sub-navigation on scroll past hero
  const stickyNav = document.getElementById("sticky-paper-nav");
  window.addEventListener(
    "scroll",
    () => {
      if (!stickyNav) return;
      if (window.scrollY > 420) {
        stickyNav.classList.add("is-visible");
      } else {
        stickyNav.classList.remove("is-visible");
      }
    },
    { passive: true }
  );

  // Close modal on Escape or backdrop click
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAgentModal();
  });
  const backdrop = document.getElementById("spec-modal-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeAgentModal();
    });
  }
});
