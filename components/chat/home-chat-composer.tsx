"use client"

import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { InputMessage } from "@/components/ui/input-message"
import {
  Card,
  CardGroup,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsItem } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { typeClass } from "@/lib/size-context"
import { fontWeights } from "@/lib/font-weight"
import { cn } from "@/lib/utils"

const CHAT_FILE_ACCEPT =
  "image/*,text/*,application/*,.yaml,.yml,.json,.txt,.md,.pdf,.har,.pcap,.pcapng,.zip"

type TaskCategory =
  "web" | "cloud" | "recon" | "network" | "threat_intel" | "compliance"

interface RecommendedTaskItem {
  id: string
  category: TaskCategory
  title: string
  description: string
  prompt: string
}

const CATEGORY_TABS: Array<{ key: TaskCategory; label: string }> = [
  { key: "web", label: "Web" },
  { key: "cloud", label: "Cloud" },
  { key: "recon", label: "Recon" },
  { key: "network", label: "Network" },
  { key: "threat_intel", label: "Threat Intel" },
  { key: "compliance", label: "Compliance" },
]

const RECOMMENDED_TASKS: RecommendedTaskItem[] = [
  // Web
  {
    id: "web-api-authz",
    category: "web",
    title: "测试 API 越权与访问控制",
    description:
      "检查 API 端点的对象级与功能级访问控制缺陷（BOLA / IDOR）及跨租户权限提升路径...",
    prompt:
      "如何规划一次针对多租户 API 网关的渗透测试范围？请重点检查 API 端点的越权访问（BOLA / IDOR）与权限提升路径。",
  },
  {
    id: "web-oauth-jwt",
    category: "web",
    title: "分析 OAuth 与 JWT 认证流程",
    description:
      "评估令牌签发、redirect_uri 校验、JWT kid 注入与算法混淆中的安全缺陷...",
    prompt:
      "总结 OAuth 认证流程与 JWT kid 注入、算法混淆的防御检查项及只读验证思路。",
  },
  {
    id: "web-ssrf",
    category: "web",
    title: "检测 SSRF 服务端请求伪造向量",
    description:
      "排查 Webhook、文件导入、URL 预览等可触达内部元数据服务或内网资产的请求伪造路径...",
    prompt:
      "请梳理 Web 应用中常见 SSRF（服务端请求伪造）攻击面，以及针对云元数据与内网边界的无损探测方案。",
  },
  {
    id: "web-business-logic",
    category: "web",
    title: "审计核心业务逻辑漏洞",
    description:
      "挖掘应用中的逻辑缺陷：并发条件竞争、订单/状态机篡改、工作流步骤绕过...",
    prompt:
      "如何针对支付、优惠券与多步审批状态机开展业务逻辑漏洞（条件竞争、状态篡改、流程绕过）审计？",
  },
  // Cloud
  {
    id: "cloud-iam",
    category: "cloud",
    title: "审计云 IAM 角色与横向提权路径",
    description:
      "检查过度授权的策略、跨账号 AssumeRole 信任链及服务账户凭据暴露风险...",
    prompt: "如何排查云环境 IAM 角色配置中的权限过大问题与跨账号横向提权链路？",
  },
  {
    id: "cloud-k8s",
    category: "cloud",
    title: "评估 Kubernetes 集群与容器边界",
    description:
      "检查 RBAC 权限配置、特权容器逃逸面、ServiceAccount 令牌挂载与网络策略...",
    prompt:
      "请总结 Kubernetes 集群安全基线审查重点，包括 RBAC、Pod 安全上下文与网络隔离策略。",
  },
  // Recon
  {
    id: "recon-surface",
    category: "recon",
    title: "外部攻击面与影子资产测绘",
    description:
      "梳理子域名、暴露网关、遗留测试环境与未登记 API 端点的资产指纹...",
    prompt:
      "如何开展针对大型企业边界的外部攻击面测绘，快速识别影子 API 与遗留测试环境？",
  },
  {
    id: "recon-takeover",
    category: "recon",
    title: "检测悬挂 DNS 与子域名接管风险",
    description:
      "排查指向已释放云资源或第三方服务的 CNAME 记录与潜在接管链路...",
    prompt:
      "请说明子域名接管（Subdomain Takeover）的常见成因、自动化验证思路与修复方案。",
  },
  // Network
  {
    id: "network-exposure",
    category: "network",
    title: "内网边界服务与高危端口核查",
    description: "识别暴露在边界的数据库、缓存、管理面端口及未授权访问风险...",
    prompt:
      "针对网络边界暴露的高危端口与管理服务，如何制定非破坏性的安全核查方案？",
  },
  {
    id: "network-tls",
    category: "network",
    title: "评估传输层加密与协议降级隐患",
    description:
      "检查弱密码套件、证书链配置缺陷、mTLS 双向认证绕过与重放风险...",
    prompt: "请列出微服务网关与传输层 TLS/mTLS 配置安全审计的关键检查项。",
  },
  // Threat Intel
  {
    id: "ti-cve",
    category: "threat_intel",
    title: "高危 CVE 情报关联与可利用性研判",
    description:
      "结合当前资产栈评估最新高危漏洞的 PoC 原理、受影响版本与缓解措施...",
    prompt:
      "收到最新高危 CVE 威胁情报后，如何快速结合现有资产指纹研判真实可利用性并制定临时缓解规则？",
  },
  {
    id: "ti-ioc",
    category: "threat_intel",
    title: "告警线索与攻击链（IoC / TTPs）溯源",
    description:
      "围绕异常访问日志或样本线索，映射 ATT&CK 战术阶段并梳理排查动作...",
    prompt:
      "如何围绕异常请求特征与告警线索开展 ATT&CK 攻击链溯源及影响面评估？",
  },
  // Compliance
  {
    id: "compliance-baseline",
    category: "compliance",
    title: "生成安全基线与整改核查清单",
    description:
      "对标 OWASP Top 10 / API Security 基线，输出可落地的安全加固与复测标准...",
    prompt:
      "请对标 OWASP API Security Top 10，为研发团队生成一份上线前安全自检与复测核查清单。",
  },
  {
    id: "compliance-evidence",
    category: "compliance",
    title: "整理红队验证证据链与修复报告",
    description:
      "将漏洞复现步骤、风险评级与修复建议收敛为结构化安全审计报告...",
    prompt:
      "如何将渗透测试中的越权与注入发现整理为兼具复现证据链与可落地修复方案的审计报告？",
  },
]

export interface HomeChatComposerProps {
  draft: string
  onDraftChange: (value: string) => void
  files: File[]
  onFilesChange: (files: File[]) => void
  onSubmit: (text: string, files: File[]) => void
  disabled?: boolean
}

export function HomeChatComposer({
  draft,
  onDraftChange,
  files,
  onFilesChange,
  onSubmit,
  disabled,
}: HomeChatComposerProps) {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const activeCategory = CATEGORY_TABS[selectedTabIndex]?.key ?? "web"

  const visibleTasks = useMemo(() => {
    return RECOMMENDED_TASKS.filter((item) => item.category === activeCategory)
  }, [activeCategory])

  return (
    <section
      aria-label="Home AI Copilot 对话入口"
      className="mx-auto flex w-full max-w-3xl flex-col gap-7 pt-14 pb-10 sm:pt-20 sm:pb-14"
    >
      {/* Hero 标题：Fluid Typography */}
      <h1
        className={cn(
          typeClass("display"),
          "my-4 text-center tracking-tight text-foreground [text-box:trim-both_cap_alphabetic] sm:my-6 sm:text-4xl"
        )}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        今天需要验证哪个安全目标？
      </h1>

      {/* 主输入框 + 内置附件上传：Fluid InputMessage */}
      <InputMessage
        value={draft}
        onValueChange={onDraftChange}
        files={files}
        onFilesChange={onFilesChange}
        accept={CHAT_FILE_ACCEPT}
        disabled={disabled}
        minRows={3}
        maxRows={7}
        placeholder="输入安全问题、粘贴线索或描述目标需求..."
        sendLabel="从首页发送消息"
        textareaProps={{
          "aria-label": "Home 聊天输入框",
        }}
        onSend={(text, attachedFiles) => {
          onSubmit(text, attachedFiles)
        }}
        leftSlot={({ openFilePicker }) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              leadingIcon={Plus}
              aria-label="添加附件"
              onClick={() => openFilePicker()}
            >
              添加附件
            </Button>
            {files.length > 0 && (
              <span className={cn(typeClass("micro"), "text-muted-foreground")}>
                已选 {files.length} 个附件
              </span>
            )}
          </div>
        )}
      />

      {/* 分类 Tabs + 推荐任务卡片：Fluid Tabs + CardGroup + Card */}
      <div className="flex flex-col gap-4">
        <Tabs
          size="compact"
          selectedIndex={selectedTabIndex}
          onSelect={setSelectedTabIndex}
          aria-label="推荐任务分类"
        >
          {CATEGORY_TABS.map((tab, idx) => (
            <TabsItem key={tab.key} index={idx} label={tab.label} />
          ))}
        </Tabs>

        <CardGroup columns={2} separated border="outlined" fluidHover>
          {visibleTasks.map((task) => (
            <Card
              key={task.id}
              size="compact"
              label={`使用推荐任务：${task.title}`}
              onClick={() => {
                onDraftChange(task.prompt)
                onSubmit(task.prompt, files)
              }}
            >
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {task.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </CardGroup>
      </div>
    </section>
  )
}

export default HomeChatComposer
