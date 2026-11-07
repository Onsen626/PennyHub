export type Lang = "zh" | "en";

export type FlocksModuleId =
  | "home"
  | "dashboard"
  | "sessions"
  | "tasks"
  | "workspace"
  | "agents"
  | "workflows"
  | "skills"
  | "tools"
  | "models"
  | "channels";

export type FlocksSectionId = "home" | "workbench" | "smith";

export type FlocksIconKey =
  | "home"
  | "message-square"
  | "check-square"
  | "folder"
  | "bot"
  | "git-branch"
  | "book-open"
  | "tool"
  | "cpu"
  | "radio"
  | "zap"
  | "calendar"
  | "activity";

export interface FlocksNavItem {
  id: FlocksModuleId;
  section: FlocksSectionId;
  icon: FlocksIconKey;
  count?: number;
}

export const FLOCKS_NAV_ITEMS: FlocksNavItem[] = [
  { id: "home", section: "home", icon: "home" },
  { id: "dashboard", section: "workbench", icon: "activity" },
  { id: "tasks", section: "workbench", icon: "check-square" },
  { id: "workspace", section: "workbench", icon: "folder" },
  { id: "agents", section: "smith", icon: "bot", count: 17 },
  { id: "workflows", section: "smith", icon: "git-branch", count: 4 },
  { id: "skills", section: "smith", icon: "book-open", count: 15 },
  { id: "tools", section: "smith", icon: "tool", count: 149 },
  { id: "models", section: "smith", icon: "cpu", count: 6 },
  { id: "channels", section: "smith", icon: "radio" },
];

export interface FlocksAgent {
  id: string;
  name: string;
  role: { en: string; zh: string };
  category: "recon" | "exploit" | "triage" | "cloud" | "dfir" | "report";
  status: "online" | "busy" | "standby";
  model: string;
  latencyMs: number;
  successRate: string;
  toolsCount: number;
}

export interface FlocksWorkflow {
  id: string;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  nodesCount: number;
  trigger: "webhook" | "cron" | "manual";
  status: "active" | "paused";
  lastRun: string;
  avgDuration: string;
}

export interface FlocksSkill {
  id: string;
  name: string;
  title: { en: string; zh: string };
  domain: "web" | "network" | "cloud" | "ad" | "code" | "dfir";
  version: string;
  enabled: boolean;
}

export interface FlocksTool {
  id: string;
  name: string;
  category: "Recon" | "Web" | "Network" | "Cloud" | "AD" | "Crypto" | "DFIR" | "OSINT";
  runtime: "sandbox" | "container" | "native" | "mcp";
  riskLevel: "low" | "medium" | "high";
  status: "就绪" | "需人工授权";
  description: string;
}

export interface FlocksModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: string;
  latencyMs: number;
  status: "healthy" | "degraded";
  role: { en: string; zh: string };
}

export interface FlocksChannel {
  id: string;
  name: string;
  type: "Slack" | "Webhook" | "PagerDuty" | "Feishu" | "Discord" | "SIEM";
  target: string;
  status: "connected" | "paused";
  eventsToday: number;
}

export interface FlocksSession {
  id: string;
  title: { en: string; zh: string };
  target: string;
  agentId: string;
  status: "running" | "awaiting_approval" | "completed";
  updatedAt: string;
  findingsCount: number;
}

export interface FlocksTask {
  id: string;
  title: { en: string; zh: string };
  workflow: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "running" | "completed" | "queued";
  progress: number;
  startedAt: string;
}

export interface FlocksWorkspaceItem {
  id: string;
  name: string;
  kind: "scope" | "evidence" | "pcap" | "report" | "playbook";
  size: string;
  updatedAt: string;
  hash: string;
}

export interface FlocksMetricCard {
  id: string;
  labelKey:
    | "agents"
    | "workflows"
    | "skills"
    | "tools"
    | "sevenDayTasks"
    | "activeScheduled"
    | "models"
    | "systemStatus";
  value: string;
  subtextKey?: "allServicesNormal";
  icon: FlocksIconKey;
  accentColor: "purple" | "teal" | "green" | "orange" | "amber" | "indigo" | "pink" | "emerald";
  targetModule?: FlocksModuleId;
}

export const FLOCKS_METRICS: FlocksMetricCard[] = [
  { id: "m-agents", labelKey: "agents", value: "17", icon: "bot", accentColor: "purple", targetModule: "agents" },
  { id: "m-workflows", labelKey: "workflows", value: "4", icon: "git-branch", accentColor: "teal", targetModule: "workflows" },
  { id: "m-skills", labelKey: "skills", value: "15", icon: "book-open", accentColor: "green", targetModule: "skills" },
  { id: "m-tools", labelKey: "tools", value: "149", icon: "tool", accentColor: "orange", targetModule: "tools" },
  { id: "m-tasks-7d", labelKey: "sevenDayTasks", value: "128", icon: "zap", accentColor: "amber", targetModule: "tasks" },
  { id: "m-scheduled", labelKey: "activeScheduled", value: "6", icon: "calendar", accentColor: "indigo", targetModule: "tasks" },
  { id: "m-models", labelKey: "models", value: "6", icon: "cpu", accentColor: "pink", targetModule: "models" },
  {
    id: "m-status",
    labelKey: "systemStatus",
    value: "运行正常",
    subtextKey: "allServicesNormal",
    icon: "activity",
    accentColor: "emerald",
  },
];

export const FLOCKS_AGENTS: FlocksAgent[] = [
  { id: "ag-01", name: "Penny-Orchestrator", role: { en: "红队总控与攻击面编排专家", zh: "红队总控与攻击面编排专家" }, category: "triage", status: "online", model: "Claude 4.6 Opus", latencyMs: 420, successRate: "99.4%", toolsCount: 32 },
  { id: "ag-02", name: "Recon-Hound", role: { en: "外部攻击面与 ASN 资产测绘代理", zh: "外部攻击面与 ASN 资产测绘代理" }, category: "recon", status: "online", model: "Gemini 3.1 Pro", latencyMs: 310, successRate: "98.9%", toolsCount: 24 },
  { id: "ag-03", name: "Web-Sentinel", role: { en: "Web 与 API 鉴权越权深度审计代理", zh: "Web 与 API 鉴权越权深度审计代理" }, category: "exploit", status: "busy", model: "Claude 4.5 Sonnet", latencyMs: 540, successRate: "97.8%", toolsCount: 28 },
  { id: "ag-04", name: "Nuclei-Smith", role: { en: "CVE 漏洞验证与定制 PoC 生成器", zh: "CVE 漏洞验证与定制 PoC 生成器" }, category: "exploit", status: "online", model: "DeepSeek-R1-Sec", latencyMs: 480, successRate: "96.5%", toolsCount: 19 },
  { id: "ag-05", name: "Cloud-Trailblazer", role: { en: "多云 IAM 权限提升路径分析代理", zh: "多云 IAM 权限提升路径分析代理" }, category: "cloud", status: "online", model: "Claude 4.5 Sonnet", latencyMs: 390, successRate: "98.1%", toolsCount: 21 },
  { id: "ag-06", name: "Kube-Breaker", role: { en: "K8s 集群配置与容器逃逸检测代理", zh: "K8s 集群配置与容器逃逸检测代理" }, category: "cloud", status: "standby", model: "GPT-5-Sec", latencyMs: 610, successRate: "95.9%", toolsCount: 16 },
  { id: "ag-07", name: "AD-Bloodhound", role: { en: "内网域控攻击图谱与票据分析代理", zh: "内网域控攻击图谱与票据分析代理" }, category: "exploit", status: "online", model: "Claude 4.6 Opus", latencyMs: 520, successRate: "97.2%", toolsCount: 18 },
  { id: "ag-08", name: "JS-Decompiler", role: { en: "前端源码还原与硬编码密钥猎手", zh: "前端源码还原与硬编码密钥猎手" }, category: "recon", status: "online", model: "Qwen-3-72B-Sec", latencyMs: 240, successRate: "99.1%", toolsCount: 12 },
  { id: "ag-09", name: "GraphQL-Prober", role: { en: "GraphQL 架构探测与注入测试代理", zh: "GraphQL 架构探测与注入测试代理" }, category: "exploit", status: "online", model: "Gemini 3.1 Pro", latencyMs: 350, successRate: "97.4%", toolsCount: 11 },
  { id: "ag-10", name: "WAF-Chameleon", role: { en: "WAF 规则指纹识别与自适应绕过代理", zh: "WAF 规则指纹识别与自适应绕过代理" }, category: "exploit", status: "busy", model: "DeepSeek-R1-Sec", latencyMs: 495, successRate: "94.8%", toolsCount: 14 },
  { id: "ag-11", name: "SOC-Triage-Zero", role: { en: "安全告警降噪与威胁情报富化代理", zh: "安全告警降噪与威胁情报富化代理" }, category: "triage", status: "online", model: "Gemini 3.1 Pro", latencyMs: 190, successRate: "99.6%", toolsCount: 22 },
  { id: "ag-12", name: "PCAP-Forensics", role: { en: "流量包取证与隐蔽信道 C2 检测代理", zh: "流量包取证与隐蔽信道 C2 检测代理" }, category: "dfir", status: "online", model: "Claude 4.5 Sonnet", latencyMs: 430, successRate: "98.3%", toolsCount: 15 },
  { id: "ag-13", name: "SBOM-Inspector", role: { en: "供应链依赖可达性与投毒分析代理", zh: "供应链依赖可达性与投毒分析代理" }, category: "recon", status: "standby", model: "Qwen-3-72B-Sec", latencyMs: 280, successRate: "98.7%", toolsCount: 10 },
  { id: "ag-14", name: "Firmware-Unpacker", role: { en: "固件解包与二进制危险函数审计代理", zh: "固件解包与二进制危险函数审计代理" }, category: "exploit", status: "standby", model: "DeepSeek-R1-Sec", latencyMs: 670, successRate: "93.9%", toolsCount: 13 },
  { id: "ag-15", name: "Phish-Sim-Coach", role: { en: "红蓝对抗演练与社工防御评估代理", zh: "红蓝对抗演练与社工防御评估代理" }, category: "triage", status: "online", model: "GPT-5-Sec", latencyMs: 360, successRate: "97.6%", toolsCount: 9 },
  { id: "ag-16", name: "Patch-Verifier", role: { en: "补丁有效性回归验证与绕过重放代理", zh: "补丁有效性回归验证与绕过重放代理" }, category: "dfir", status: "online", model: "Claude 4.5 Sonnet", latencyMs: 410, successRate: "99.0%", toolsCount: 14 },
  { id: "ag-17", name: "Evidence-Scribe", role: { en: "取证证据链固化与合规报告生成代理", zh: "取证证据链固化与合规报告生成代理" }, category: "report", status: "online", model: "Claude 4.6 Opus", latencyMs: 380, successRate: "99.8%", toolsCount: 8 },
];

export const FLOCKS_WORKFLOWS: FlocksWorkflow[] = [
  {
    id: "wf-01",
    name: { en: "外部攻击面持续测绘与高危验证流水线", zh: "外部攻击面持续测绘与高危验证流水线" },
    description: {
      en: "子域枚举 → 指纹识别 → 前端敏感信息提取 → 带人工授权门禁的无损 PoC 验证",
      zh: "子域枚举 → 指纹识别 → 前端敏感信息提取 → 带人工授权门禁的无损 PoC 验证",
    },
    nodesCount: 14,
    trigger: "cron",
    status: "active",
    lastRun: "12 分钟前",
    avgDuration: "4分18秒",
  },
  {
    id: "wf-02",
    name: { en: "API 多角色越权差分测试矩阵", zh: "API 多角色越权差分测试矩阵" },
    description: {
      en: "基于 OpenAPI 自动重放多租户、普通用户与未授权会话，精准识别越权读写",
      zh: "基于 OpenAPI 自动重放多租户、普通用户与未授权会话，精准识别越权读写",
    },
    nodesCount: 9,
    trigger: "webhook",
    status: "active",
    lastRun: "38 分钟前",
    avgDuration: "2分54秒",
  },
  {
    id: "wf-03",
    name: { en: "云原生 IAM 凭证泄露冲击面评估", zh: "云原生 IAM 凭证泄露冲击面评估" },
    description: {
      en: "关联 CloudTrail 异常调用与 STS 角色链，自动生成最小权限收敛预案",
      zh: "关联 CloudTrail 异常调用与 STS 角色链，自动生成最小权限收敛预案",
    },
    nodesCount: 11,
    trigger: "webhook",
    status: "active",
    lastRun: "2 小时前",
    avgDuration: "1分42秒",
  },
  {
    id: "wf-04",
    name: { en: "0-Day 威胁情报应急排查与补丁回归", zh: "0-Day 威胁情报应急排查与补丁回归" },
    description: {
      en: "订阅 CVE 情报，自动匹配资产指纹并调度沙箱执行无损检测模板",
      zh: "订阅 CVE 情报，自动匹配资产指纹并调度沙箱执行无损检测模板",
    },
    nodesCount: 8,
    trigger: "cron",
    status: "paused",
    lastRun: "1 天前",
    avgDuration: "3分10秒",
  },
];

export const FLOCKS_SKILLS: FlocksSkill[] = [
  { id: "sk-01", name: "bola-differential-prober", title: { en: "多租户越权差分探测", zh: "多租户越权差分探测" }, domain: "web", version: "v2.4.0", enabled: true },
  { id: "sk-02", name: "jwt-none-kid-auditor", title: { en: "JWT 算法混淆与密钥注入审计", zh: "JWT 算法混淆与密钥注入审计" }, domain: "web", version: "v1.9.2", enabled: true },
  { id: "sk-03", name: "ssrf-cloud-metadata-safe", title: { en: "带外 SSRF 与云元数据安全检测", zh: "带外 SSRF 与云元数据安全检测" }, domain: "cloud", version: "v3.1.0", enabled: true },
  { id: "sk-04", name: "graphql-batch-introspect", title: { en: "GraphQL 盲注内省与批量绕过", zh: "GraphQL 盲注内省与批量绕过" }, domain: "web", version: "v1.5.1", enabled: true },
  { id: "sk-05", name: "aws-sts-privesc-graph", title: { en: "AWS IAM 提权路径图谱建模", zh: "AWS IAM 提权路径图谱建模" }, domain: "cloud", version: "v2.2.0", enabled: true },
  { id: "sk-06", name: "k8s-rbac-wildcard-hunt", title: { en: "K8s RBAC 通配符与挂载逃逸审计", zh: "K8s RBAC 通配符与挂载逃逸审计" }, domain: "cloud", version: "v1.8.0", enabled: true },
  { id: "sk-07", name: "kerberoast-opsec-audit", title: { en: "域内委派与 SPN 弱口令低噪审计", zh: "域内委派与 SPN 弱口令低噪审计" }, domain: "ad", version: "v2.0.4", enabled: true },
  { id: "sk-08", name: "webpack-sourcemap-miner", title: { en: "前端构建产物隐藏接口与密钥挖掘", zh: "前端构建产物隐藏接口与密钥挖掘" }, domain: "web", version: "v2.7.1", enabled: true },
  { id: "sk-09", name: "http-desync-smuggler", title: { en: "HTTP/2 走私与缓存投毒无损探测", zh: "HTTP/2 走私与缓存投毒无损探测" }, domain: "network", version: "v1.4.3", enabled: false },
  { id: "sk-10", name: "pcap-ja4-beacon-detect", title: { en: "JA4 指纹与加密 C2 心跳抖动分析", zh: "JA4 指纹与加密 C2 心跳抖动分析" }, domain: "dfir", version: "v3.0.1", enabled: true },
  { id: "sk-11", name: "semgrep-taint-synthesizer", title: { en: "源码污点追踪规则自动合成", zh: "源码污点追踪规则自动合成" }, domain: "code", version: "v2.1.0", enabled: true },
  { id: "sk-12", name: "subdomain-takeover-verify", title: { en: "悬空 CNAME 子域名接管验证", zh: "悬空 CNAME 子域名接管验证" }, domain: "network", version: "v1.6.0", enabled: true },
  { id: "sk-13", name: "oauth-redirect-state-check", title: { en: "OAuth2 回调劫持与状态绑定测试", zh: "OAuth2 回调劫持与状态绑定测试" }, domain: "web", version: "v1.7.5", enabled: true },
  { id: "sk-14", name: "container-image-secret-layer", title: { en: "容器镜像历史层残留凭据提取", zh: "容器镜像历史层残留凭据提取" }, domain: "cloud", version: "v1.3.2", enabled: true },
  { id: "sk-15", name: "cvss4-evidence-packager", title: { en: "CVSS 4.0 证据包与修复建议生成", zh: "CVSS 4.0 证据包与修复建议生成" }, domain: "dfir", version: "v2.5.0", enabled: true },
];

const SEED_TOOLS: Array<[string, FlocksTool["category"], FlocksTool["runtime"], FlocksTool["riskLevel"], string]> = [
  ["subfinder", "Recon", "container", "low", "基于被动证书与 DNS 数据集的高速子域名枚举工具"],
  ["httpx", "Recon", "container", "low", "多用途 HTTP 探针，检测状态码、TLS 指纹、标题与技术栈"],
  ["nuclei", "Web", "sandbox", "medium", "基于模板与带外 OAST 验证的高精准漏洞扫描引擎"],
  ["naabu", "Network", "container", "medium", "高速 SYN/CONNECT 端口扫描与服务指纹识别工具"],
  ["katana", "Web", "sandbox", "low", "支持无头浏览器的深度爬虫与前端 JS 接口提取器"],
  ["ffuf", "Web", "sandbox", "medium", "针对虚拟主机、隐藏目录与参数模糊测试的高速 Fuzzer"],
  ["sqlmap-api", "Web", "sandbox", "high", "自动化 SQL 注入检测与数据库指纹识别沙箱引擎"],
  ["trufflehog", "Recon", "container", "low", "跨 Git 历史、S3 与前端构建产物的密钥泄露验证器"],
  ["semgrep", "Web", "native", "low", "基于 AST 语法树的源码污点与鉴权缺陷静态分析引擎"],
  ["prowler", "Cloud", "container", "low", "AWS / GCP / Azure 云安全基线与 IAM 权限配置评估器"],
  ["pacu-mcp", "Cloud", "mcp", "high", "模块化 AWS 云环境权限提升与冲击面验证桥接器"],
  ["bloodhound-ce", "AD", "mcp", "medium", "内网活动目录攻击图谱采集与最短提权路径分析器"],
  ["impacket-suite", "AD", "sandbox", "high", "SMB / Kerberos / RPC 内网协议安全验证工具集"],
  ["tshark-json", "DFIR", "native", "low", "网络流量包协议解析器，用于 C2 隐蔽信道取证研判"],
  ["yara-x", "DFIR", "native", "low", "针对恶意样本与内存取证伪影的高性能特征匹配引擎"],
  ["ghidra-headless", "Crypto", "container", "low", "无头反编译流水线，用于二进制符号与加密常量分析"],
  ["interactsh-client", "Web", "mcp", "low", "带外交互收集器，用于无回显 SSRF / RCE 漏洞确认"],
  ["amass", "OSINT", "container", "low", "深度自治系统 ASN、WHOIS 与外部资产图谱测绘工具"],
  ["jwt-tool", "Crypto", "sandbox", "medium", "JWT 令牌伪造、声明篡改与密钥混淆漏洞审计工具"],
  ["kube-hunter", "Cloud", "sandbox", "medium", "Kubernetes 控制平面与 kubelet 未授权暴露面探测器"],
];

const EXTRA_TOOL_PREFIXES: Array<[string, FlocksTool["category"], FlocksTool["runtime"], FlocksTool["riskLevel"]]> = [
  ["dnsx-resolver", "Recon", "container", "low"],
  ["tlsx-cipher", "Crypto", "container", "low"],
  ["uncover-shodan", "OSINT", "mcp", "low"],
  ["arjun-param", "Web", "sandbox", "low"],
  ["dalfox-xss", "Web", "sandbox", "medium"],
  ["corsy-check", "Web", "sandbox", "low"],
  ["smuggler-h2", "Network", "sandbox", "high"],
  ["sslyze-probe", "Crypto", "container", "low"],
  ["trivy-sbom", "Cloud", "container", "low"],
  ["grype-vuln", "Cloud", "container", "low"],
  ["syft-indexer", "Cloud", "native", "low"],
  ["falco-trace", "DFIR", "mcp", "low"],
  ["osquery-bridge", "DFIR", "mcp", "low"],
  ["certipy-ad", "AD", "sandbox", "high"],
  ["ldapdomaindump", "AD", "sandbox", "medium"],
  ["rustscan-fast", "Network", "container", "medium"],
  ["massdns-wild", "Recon", "container", "low"],
  ["gau-wayback", "OSINT", "container", "low"],
  ["linkfinder-ast", "Web", "native", "low"],
  ["secretfinder-js", "Recon", "native", "low"],
];

export const FLOCKS_TOOLS: FlocksTool[] = Array.from({ length: 149 }, (_, idx) => {
  if (idx < SEED_TOOLS.length) {
    const [name, category, runtime, riskLevel, description] = SEED_TOOLS[idx];
    return {
      id: `tool-${String(idx + 1).padStart(3, "0")}`,
      name,
      category,
      runtime,
      riskLevel,
      status: riskLevel === "high" ? "需人工授权" : "就绪",
      description,
    };
  }
  const baseIdx = (idx - SEED_TOOLS.length) % EXTRA_TOOL_PREFIXES.length;
  const tier = Math.floor((idx - SEED_TOOLS.length) / EXTRA_TOOL_PREFIXES.length) + 1;
  const [prefix, category, runtime, riskLevel] = EXTRA_TOOL_PREFIXES[baseIdx];
  const name = `${prefix}-v${tier}`;
  return {
    id: `tool-${String(idx + 1).padStart(3, "0")}`,
    name,
    category,
    runtime,
    riskLevel,
    status: riskLevel === "high" ? "需人工授权" : "就绪",
    description: `PennyAgent ${category} 安全验证组件（${runtime} 沙箱环境）#${idx + 1}`,
  };
});

export const FLOCKS_MODELS: FlocksModel[] = [
  { id: "md-01", name: "Claude 4.6 Opus", provider: "Anthropic", contextWindow: "200K", latencyMs: 420, status: "healthy", role: { en: "核心攻击链推理与取证编排", zh: "核心攻击链推理与取证编排" } },
  { id: "md-02", name: "Claude 4.5 Sonnet", provider: "Anthropic", contextWindow: "200K", latencyMs: 310, status: "healthy", role: { en: "高速代码审计与接口差分重放", zh: "高速代码审计与接口差分重放" } },
  { id: "md-03", name: "Gemini 3.1 Pro", provider: "Google DeepMind", contextWindow: "2M", latencyMs: 260, status: "healthy", role: { en: "超长上下文全仓源码与流量研判", zh: "超长上下文全仓源码与流量研判" } },
  { id: "md-04", name: "DeepSeek-R1-Sec", provider: "私有化 vLLM 集群", contextWindow: "128K", latencyMs: 480, status: "healthy", role: { en: "内网隔离环境漏洞验证与载荷变形推理", zh: "内网隔离环境漏洞验证与载荷变形推理" } },
  { id: "md-05", name: "GPT-5-Sec", provider: "OpenAI Enterprise", contextWindow: "256K", latencyMs: 390, status: "healthy", role: { en: "云安全策略与权限边界形式化校验", zh: "云安全策略与权限边界形式化校验" } },
  { id: "md-06", name: "Qwen-3-72B-Sec", provider: "本地推理节点", contextWindow: "128K", latencyMs: 195, status: "degraded", role: { en: "高吞吐安全告警降噪与日志提取", zh: "高吞吐安全告警降噪与日志提取" } },
];

export const FLOCKS_CHANNELS: FlocksChannel[] = [
  { id: "ch-01", name: "#secops-红队联合作战室", type: "Slack", target: "PennyAgent 审批机器人", status: "connected", eventsToday: 42 },
  { id: "ch-02", name: "飞书安全运营告警群", type: "Feishu", target: "Webhook v2 签名通道", status: "connected", eventsToday: 68 },
  { id: "ch-03", name: "Splunk HEC / SIEM 日志总线", type: "SIEM", target: "https://siem.internal:8088", status: "connected", eventsToday: 1290 },
  { id: "ch-04", name: "PagerDuty P0 应急呼叫", type: "PagerDuty", target: "高危漏洞值班组", status: "connected", eventsToday: 3 },
  { id: "ch-05", name: "GitHub 安全公告订阅钩子", type: "Webhook", target: "org/penny-enterprise", status: "paused", eventsToday: 15 },
];

export const FLOCKS_SESSIONS: FlocksSession[] = [
  {
    id: "ses-101",
    title: { en: "支付网关 v3 — 多租户越权与 JWT 提权渗透会话", zh: "支付网关 v3 — 多租户越权与 JWT 提权渗透会话" },
    target: "api.pay-staging.penny.internal",
    agentId: "ag-03",
    status: "awaiting_approval",
    updatedAt: "刚刚",
    findingsCount: 3,
  },
  {
    id: "ses-102",
    title: { en: "生产外网 ASN 测绘与子域名接管排查", zh: "生产外网 ASN 测绘与子域名接管排查" },
    target: "*.pennycloud.io",
    agentId: "ag-02",
    status: "running",
    updatedAt: "4 分钟前",
    findingsCount: 2,
  },
  {
    id: "ses-103",
    title: { en: "生产 EKS 集群 IAM 角色链与逃逸路径推演", zh: "生产 EKS 集群 IAM 角色链与逃逸路径推演" },
    target: "arn:aws:iam::8492019201:role/eks-worker",
    agentId: "ag-05",
    status: "completed",
    updatedAt: "1 小时前",
    findingsCount: 5,
  },
];

export const FLOCKS_TASKS: FlocksTask[] = [
  { id: "tsk-01", title: { en: "验证 /v3/merchants/{id}/payout-bank 跨租户读取漏洞", zh: "验证 /v3/merchants/{id}/payout-bank 跨租户读取漏洞" }, workflow: "API 越权测试矩阵", severity: "critical", status: "running", progress: 78, startedAt: "10:12" },
  { id: "tsk-02", title: { en: "扫描 CDN 边缘节点残留 SourceMap 与密钥", zh: "扫描 CDN 边缘节点残留 SourceMap 与密钥" }, workflow: "外部攻击面测绘", severity: "high", status: "completed", progress: 100, startedAt: "09:40" },
  { id: "tsk-03", title: { en: "对 48 个边缘网关执行 CVE-2026-2144 无损探针验证", zh: "对 48 个边缘网关执行 CVE-2026-2144 无损探针验证" }, workflow: "0-Day 应急排查", severity: "high", status: "running", progress: 45, startedAt: "10:25" },
  { id: "tsk-04", title: { en: "审计账单中心跨账号 STS 信任策略配置缺陷", zh: "审计账单中心跨账号 STS 信任策略配置缺陷" }, workflow: "云原生 IAM 评估", severity: "medium", status: "completed", progress: 100, startedAt: "08:15" },
  { id: "tsk-05", title: { en: "生成 Q4 渗透测试 CVSS 4.0 证据链与修复报告", zh: "生成 Q4 渗透测试 CVSS 4.0 证据链与修复报告" }, workflow: "取证报告生成", severity: "low", status: "queued", progress: 0, startedAt: "计划任务" },
];

export const FLOCKS_WORKSPACE_ITEMS: FlocksWorkspaceItem[] = [
  { id: "ws-01", name: "scope-pay-staging-2026Q4.yaml", kind: "scope", size: "14 KB", updatedAt: "15 分钟前", hash: "sha256:9f82...c41a" },
  { id: "ws-02", name: "evidence-SES101-idor-payout.har", kind: "evidence", size: "482 KB", updatedAt: "2 分钟前", hash: "sha256:3a10...88e2" },
  { id: "ws-03", name: "jwt-kid-confusion-poc-receipt.json", kind: "evidence", size: "38 KB", updatedAt: "6 分钟前", hash: "sha256:7d19...02b4" },
  { id: "ws-04", name: "egress-c2-beacon-capture.pcapng", kind: "pcap", size: "18.4 MB", updatedAt: "1 小时前", hash: "sha256:5c44...91f0" },
  { id: "ws-05", name: "PennyAgent-Executive-Pentest-Report.pdf", kind: "report", size: "2.1 MB", updatedAt: "3 小时前", hash: "sha256:1b08...ee77" },
];

export const zhCopy = {
  brand: "Flocks",
  version: "Flocks v2026.3.29.1",
  subtitle: "AI 原生安全运营与渗透平台",
  sections: {
    home: "首页",
    workbench: "AI 安全工作台",
    smith: "AGENT SMITH",
  },
  nav: {
    home: "控制台首页",
    dashboard: "Dashboard",
    sessions: "Sessions",
    tasks: "Pentests",
    workspace: "现有风险",
    agents: "Agents",
    workflows: "Workflows",
    skills: "Skills",
    tools: "Tools",
    models: "Models",
    channels: "协同通道",
  },
  hero: {
    badge: "AI-Native SecOps",
    title: "Flocks",
    headline: "AI 原生安全运营与自动化渗透平台",
    description:
      "让多智能体接管你的安全运营与红队验证 —— 从攻击面测绘、越权推演到证据链固化，以 10 倍效率实现闭环防御",
    setupGuide: "开始渗透会话",
    openSource: "快速安全巡检",
  },
  quickCards: {
    sessionsTitle: "Sessions",
    sessionsDesc: "Chat with AI to complete complex security tasks",
    workflowsTitle: "Workflows",
    workflowsDesc: "Visually orchestrate security automation pipelines",
    agentsTitle: "Agents",
    agentsDesc: "Manage and configure AI agents",
  },
  metrics: {
    agents: "Agents",
    workflows: "Workflows",
    skills: "Skills",
    tools: "Tools",
    sevenDayTasks: "近 7 日任务",
    activeScheduled: "活跃定时巡检",
    models: "Models",
    systemStatus: "系统状态",
    allServicesNormal: "所有沙箱与代理节点运行正常",
  },
  common: {
    searchPlaceholder: "搜索智能体、工具、CVE 编号，或按 ⌘K 唤起命令面板...",
    copilotToggle: "AI Copilot",
    startPentest: "开始渗透测试",
    newSession: "新建渗透会话",
    runDiagnostic: "快速攻击面巡检",
    filterAll: "全部",
    status: "状态",
    latency: "延迟",
    action: "操作",
    inspect: "查看详情",
    launch: "载入会话",
    emptyTitle: "暂无匹配记录",
    emptyDesc: "请尝试调整筛选条件，或直接发起新的安全测试会话。",
    settings: "系统设置",
    commandPaletteTitle: "PennyAgent 全局命令与快速跳转",
  },
} as const;

export const dict = {
  zh: zhCopy,
  en: zhCopy,
} as const;
