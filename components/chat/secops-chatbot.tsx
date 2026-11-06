"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { ChatMessage } from "@/components/ui/chat-message";
import { InputMessage, type QueuedMessage } from "@/components/ui/input-message";
import {
  ThinkingSteps,
  ThinkingStepsHeader,
  ThinkingStepsContent,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepSources,
  ThinkingStepSource,
} from "@/components/ui/thinking-steps";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";
import {
  AskUserQuestions,
  type AskUserQuestion,
  type AskUserAnswer,
} from "@/components/ui/ask-user-questions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { typeClass } from "@/lib/size-context";
import { fontWeights } from "@/lib/font-weight";
import { cn } from "@/lib/utils";
import {
  FLOCKS_SESSIONS,
  FLOCKS_AGENTS,
  type Lang,
  type FlocksSession,
} from "@/lib/flocks-data";

export interface EvidenceReceipt {
  id: string;
  title: string;
  cvss: string;
  severity: "严重" | "高危" | "中危";
  endpoint: string;
  sha256: string;
  snippet: string;
}

export interface SecOpsChatEntry {
  id: string;
  from: "user" | "assistant";
  text: string;
  time?: string;
  files?: File[];
  thinking?: {
    title: string;
    steps: Array<{
      label: string;
      description?: string;
      status: "complete" | "active" | "pending";
      details?: string[];
      sources?: Array<{
        label: string;
        color: "blue" | "purple" | "green" | "orange" | "red";
      }>;
    }>;
  };
  approvalGate?: {
    resolved?: boolean;
    decisionSummary?: string;
    questions: AskUserQuestion[];
  };
  receipt?: EvidenceReceipt;
}

const INITIAL_TRANSCRIPTS: Record<string, SecOpsChatEntry[]> = {
  "ses-101": [
    {
      id: "m-1",
      from: "user",
      time: "10:12",
      text: "对 api.pay-staging.penny.internal 执行多租户 BOLA/IDOR 越权审计（重点检测 /v3/merchants/{id}/payout-bank），并验证 JWT kid 字段是否存在密钥混淆漏洞。",
    },
    {
      id: "m-2",
      from: "assistant",
      text: "已完成 `api.pay-staging.penny.internal` 的 OpenAPI 路由测绘，并在租户 A (`M-8821`) 与租户 B (`M-9044`) 之间完成了差分重放。已确认跨租户读取结算卡号漏洞！在继续执行主动式 JWT `kid` 密钥混淆探测前，请确认下方的红队授权门禁：",
      thinking: {
        title: "Penny-Orchestrator · 3 步攻击链推理 (耗时 2.4s)",
        steps: [
          {
            label: "解析 OpenAPI 规范与鉴权中间件",
            description:
              "提取 38 个业务接口；发现 /v3/merchants/{id}/payout-bank 未校验 JWT 内的 tenant_id 归属。",
            status: "complete",
            sources: [
              { label: "httpx:200", color: "green" },
              { label: "jwt-tool", color: "purple" },
            ],
          },
          {
            label: "多租户差分越权测试 (租户 A → 租户 B)",
            description:
              "携带租户 A 令牌请求 GET /v3/merchants/M-9044/payout-bank 返回 200 OK，成功读取目标商户结算 IBAN。",
            status: "complete",
            details: [
              "请求头: Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6ImtleS0xIn0...",
              "响应状态: 200 OK (482 bytes, application/json)",
              "泄露字段: routing_number=021000021, iban=DE89370400440532013000",
            ],
            sources: [
              { label: "越权已确认", color: "red" },
              { label: "CVSS:9.1", color: "orange" },
            ],
          },
          {
            label: "合成无损 JWT kid 路径穿越验证载荷",
            description:
              "已构造基于 /dev/null 空密钥签名的只读验证探针，等待人工授权。",
            status: "complete",
          },
        ],
      },
      approvalGate: {
        questions: [
          {
            id: "gate-jwt-poc",
            title:
              "高风险动作门禁：是否授权在预发支付网关执行主动式 JWT PoC 验证？",
            layout: "stacked",
            options: [
              {
                id: "仅批准只读探针验证",
                title: "仅批准只读探针验证（推荐）",
                description:
                  "使用伪造的 kid 令牌调用只读接口 GET /v3/merchants/self，不修改任何结算数据。",
              },
              {
                id: "批准沙箱测试商户写入与回滚",
                title: "批准沙箱测试商户写入与回滚验证",
                description:
                  "仅针对隔离测试商户 M-9999 执行 PUT /payout-bank 并自动固化 HAR 证据包。",
              },
              {
                id: "跳过主动利用并导出证据",
                title: "跳过主动利用，直接导出当前 BOLA 证据链",
                description:
                  "仅保留被动差分越权证据，立即生成 CVSS 4.0 修复报告。",
              },
            ],
          },
        ],
      },
      receipt: {
        id: "EV-2026-101A",
        title: "商户结算接口跨租户越权读取",
        cvss: "9.1",
        severity: "严重",
        endpoint:
          "GET https://api.pay-staging.penny.internal/v3/merchants/M-9044/payout-bank",
        sha256: "3a10f98c4b2290e1d44a88e2",
        snippet: `HTTP/2 200 OK\nx-request-id: req_99281a\n{\n  "merchant_id": "M-9044",\n  "beneficiary": "Acme Global GmbH",\n  "iban": "DE89370400440532013000",\n  "routing_verified": true\n}`,
      },
    },
  ],
  "ses-102": [
    {
      id: "m-201",
      from: "user",
      time: "09:58",
      text: "对 *.pennycloud.io 进行外网子域名接管排查与前端 SourceMap 泄露扫描。",
    },
    {
      id: "m-202",
      from: "assistant",
      text: "已完成 412 个子域名的 `subfinder + dnsx` 测绘：发现 1 处悬空 CNAME（`promo-2025.pennycloud.io` 指向未注册的对象存储桶，存在子域名接管风险）以及 2 处暴露 `.js.map` 的预发站点。",
      receipt: {
        id: "EV-2026-102B",
        title: "悬空 CNAME 导致子域名接管风险",
        cvss: "8.2",
        severity: "高危",
        endpoint: "https://promo-2025.pennycloud.io",
        sha256: "7d19c004a2b81920f402b4",
        snippet: `promo-2025.pennycloud.io. 300 IN CNAME penny-promo-2025-static.s3.amazonaws.com.\nHTTP/1.1 404 Not Found (Code: NoSuchBucket)`,
      },
    },
  ],
  "ses-103": [
    {
      id: "m-301",
      from: "user",
      time: "08:40",
      text: "分析 arn:aws:iam::8492019201:role/eks-worker 的 IAM 角色链提权半径。",
    },
    {
      id: "m-302",
      from: "assistant",
      text: "图谱推演完成：`eks-worker` 同时具备 `iam:PassRole (*)` 与 `ecs:RunTask` 权限，可通过 2 跳横向提权至 `BillingAdminRole`。",
    },
  ],
};

const SUGGESTIONS_ZH: string[] = [
  "对预发网关执行 CVE-2026-2144 无损探针验证",
  "生成 /payout-bank 跨租户越权漏洞的中间件修复补丁与 CVSS 4.0 报告",
  "追踪云账号 IAM PassRole 最小权限收敛方案",
];

export interface SecOpsChatbotProps {
  lang?: Lang;
  mode: "workspace" | "drawer";
  initialSessionId?: string;
  initialPrompt?: string;
  onCloseDrawer?: () => void;
}

export function SecOpsChatbot({
  mode,
  initialSessionId = "ses-101",
  initialPrompt,
  onCloseDrawer,
}: SecOpsChatbotProps) {
  const [activeSessionId, setActiveSessionId] =
    useState<string>(initialSessionId);
  const [sessions, setSessions] = useState<FlocksSession[]>(FLOCKS_SESSIONS);
  const [transcripts, setTranscripts] =
    useState<Record<string, SecOpsChatEntry[]>>(INITIAL_TRANSCRIPTS);

  const [draft, setDraft] = useState(initialPrompt ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [activeReceipt, setActiveReceipt] = useState<EvidenceReceipt | null>(
    INITIAL_TRANSCRIPTS["ses-101"][1]?.receipt ?? null
  );

  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [prevPrompt, setPrevPrompt] = useState(initialPrompt);
  if (initialPrompt !== prevPrompt) {
    setPrevPrompt(initialPrompt);
    if (initialPrompt) {
      setDraft(initialPrompt);
    }
  }

  const currentMessages =
    transcripts[activeSessionId] ?? INITIAL_TRANSCRIPTS["ses-101"];

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStatus("idle");
    setStreamedText("");
  }, []);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  const triggerSimulatedReply = useCallback(
    (userPrompt: string) => {
      setStatus("streaming");
      setStreamedText("");

      const fullReply = `已调度 **Web-Sentinel** 与 **Evidence-Scribe** 执行指令：「${userPrompt}」。\n\n1. **沙箱流量回放**：已完成无损探针验证，平均响应延迟 \`38ms\`，未触发 WAF 阻断。\n2. **证据链哈希固化**：请求与响应报文已签名写入工作区 \`evidence-${activeSessionId}.har\`。\n3. **修复建议**：建议在网关层强制注入 \`claims.tenant_id == path.merchant_id\` 鉴权断言。`;

      const newReceipt: EvidenceReceipt = {
        id: `EV-${Math.floor(100 + Math.random() * 899)}`,
        title: "自动化验证回执 · 零损沙箱重放",
        cvss: "8.6",
        severity: "高危",
        endpoint: "POST https://api.pay-staging.penny.internal/v3/verify",
        sha256: "9f82d41e77c109b82a40c41a",
        snippet: `HTTP/2 200 OK\nx-penny-sandbox: verified-clean\nx-evidence-sig: ed25519:88a19f...31c0\n{\n  "exploitability": "confirmed_readonly",\n  "waf_bypass": "chunked-encoding-v2"\n}`,
      };

      let cursor = 0;
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);

      streamTimerRef.current = setInterval(() => {
        cursor += 12;
        if (cursor >= fullReply.length) {
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;

          const replyEntry: SecOpsChatEntry = {
            id: `asst-${Date.now()}`,
            from: "assistant",
            text: fullReply,
            thinking: {
              title: "Web-Sentinel · 3 步沙箱验证完成 (1.1s)",
              steps: [
                {
                  label: "加载隔离网络命名空间与带外监听器",
                  status: "complete",
                  sources: [{ label: "沙箱就绪", color: "green" }],
                },
                {
                  label: "重放差分载荷并比对响应语法树",
                  status: "complete",
                  sources: [{ label: "nuclei-mcp", color: "blue" }],
                },
                {
                  label: "计算 SHA-256 证据指纹并归档",
                  status: "complete",
                  sources: [{ label: newReceipt.id, color: "purple" }],
                },
              ],
            },
            receipt: newReceipt,
          };

          setTranscripts((prev) => ({
            ...prev,
            [activeSessionId]: [...(prev[activeSessionId] ?? []), replyEntry],
          }));
          setActiveReceipt(newReceipt);
          setStreamedText("");
          setStatus("idle");
          scrollToBottom();
        } else {
          setStreamedText(fullReply.slice(0, cursor));
          scrollToBottom();
        }
      }, 28);
    },
    [activeSessionId, scrollToBottom]
  );

  const handleSend = useCallback(
    (text: string, attachedFiles: File[]) => {
      const userEntry: SecOpsChatEntry = {
        id: `usr-${Date.now()}`,
        from: "user",
        text,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setTranscripts((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] ?? []), userEntry],
      }));

      setDraft("");
      setFiles([]);
      scrollToBottom();
      triggerSimulatedReply(text || "附件报文取证分析");
    },
    [activeSessionId, scrollToBottom, triggerSimulatedReply]
  );

  const handleCreateNewSession = () => {
    const newId = `ses-${104 + sessions.length}`;
    const newSession: FlocksSession = {
      id: newId,
      title: {
        en: `专项红队渗透会话 #${sessions.length + 1}`,
        zh: `专项红队渗透会话 #${sessions.length + 1}`,
      },
      target: "staging-api.penny.internal",
      agentId: "ag-01",
      status: "running",
      updatedAt: "刚刚",
      findingsCount: 0,
    };
    setSessions((prev) => [newSession, ...prev]);
    setTranscripts((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `welcome-${newId}`,
          from: "assistant",
          text: "Penny-Orchestrator 总控代理已就绪。请输入目标域名、OpenAPI 规范或 CVE 编号，开始自动化渗透验证。",
        },
      ],
    }));
    setActiveSessionId(newId);
  };

  const handleGateComplete = (
    messageId: string,
    answers: Record<string, AskUserAnswer>
  ) => {
    const firstAnswer = Object.values(answers)[0];
    const chosenId = firstAnswer?.selectedIds?.[0] ?? "仅批准只读探针验证";
    const summary = `已授权策略：${chosenId}（由安全操作员签发）`;

    setTranscripts((prev) => {
      const list = prev[activeSessionId];
      if (!list) return prev;
      return {
        ...prev,
        [activeSessionId]: list.map((entry) =>
          entry.id === messageId && entry.approvalGate
            ? {
                ...entry,
                approvalGate: {
                  ...entry.approvalGate,
                  resolved: true,
                  decisionSummary: summary,
                },
              }
            : entry
        ),
      };
    });

    triggerSimulatedReply(
      `执行已批准门禁动作 [${chosenId}]：验证 JWT kid 签名绕过并固化证据`
    );
  };

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden bg-background text-foreground",
        mode === "workspace"
          ? "rounded-2xl border border-border/80 shadow-xs"
          : "flex-col"
      )}
    >
      {/* 左侧多会话列表（工作台模式） */}
      {mode === "workspace" && (
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border/70 bg-muted/20 lg:flex">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
            <div>
              <h3
                className={cn(typeClass("subtitle"), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                活跃渗透会话
              </h3>
              <p className={cn(typeClass("caption"), "text-muted-foreground")}>
                多智能体协同作战室
              </p>
            </div>
            <Button size="sm" variant="primary" onClick={handleCreateNewSession}>
              + 新建
            </Button>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {sessions.map((ses) => {
              const isSelected = ses.id === activeSessionId;
              const agent = FLOCKS_AGENTS.find((a) => a.id === ses.agentId);
              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => setActiveSessionId(ses.id)}
                  className={cn(
                    "w-full rounded-xl p-3 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-accent/15 ring-1 ring-accent/40"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        typeClass("caption"),
                        "truncate text-muted-foreground"
                      )}
                    >
                      {ses.target}
                    </span>
                    <Badge
                      size="sm"
                      variant="dot"
                      color={
                        ses.status === "awaiting_approval"
                          ? "orange"
                          : ses.status === "running"
                            ? "blue"
                            : "green"
                      }
                    >
                      {ses.status === "awaiting_approval"
                        ? "待授权"
                        : ses.status === "running"
                          ? "执行中"
                          : "已归档"}
                    </Badge>
                  </div>
                  <p
                    className={cn(
                      typeClass("body"),
                      "mt-1 line-clamp-2 text-foreground"
                    )}
                    style={{ fontVariationSettings: fontWeights.semibold }}
                  >
                    {ses.title.zh}
                  </p>
                  <div
                    className={cn(
                      typeClass("micro"),
                      "mt-2 flex items-center justify-between text-muted-foreground"
                    )}
                  >
                    <span>{agent?.name ?? "Penny-Orchestrator"}</span>
                    <span>
                      {ses.findingsCount} 个发现 · {ses.updatedAt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* 中间对话流 */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <h2
                className={cn(
                  typeClass("subtitle"),
                  "truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 text-foreground"
                )}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {
                  (
                    sessions.find((s) => s.id === activeSessionId) ??
                    sessions[0]
                  ).title.zh
                }
              </h2>
              <Badge size="sm" variant="solid" color="purple">
                Claude 4.6 Opus
              </Badge>
            </div>
            <p
              className={cn(
                typeClass("caption"),
                "truncate text-muted-foreground"
              )}
            >
              沙箱隔离已启用 · 高危载荷需人工门禁确认
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "drawer" && onCloseDrawer && (
              <Button size="sm" variant="ghost" onClick={onCloseDrawer}>
                收起
              </Button>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <AnimatePresence initial={false}>
            {currentMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2.5">
                {msg.thinking && (
                  <ThinkingSteps defaultOpen={false} className="w-full max-w-xl">
                    <ThinkingStepsHeader>
                      {msg.thinking.title}
                    </ThinkingStepsHeader>
                    <ThinkingStepsContent>
                      {msg.thinking.steps.map((st, idx) => (
                        <ThinkingStep
                          key={`${msg.id}-st-${idx}`}
                          label={st.label}
                          description={st.description}
                          status={st.status}
                          isLast={idx === msg.thinking!.steps.length - 1}
                        >
                          {st.details && st.details.length > 0 && (
                            <ThinkingStepDetails
                              summary="查看原始报文摘要"
                              details={st.details}
                            />
                          )}
                          {st.sources && st.sources.length > 0 && (
                            <ThinkingStepSources>
                              {st.sources.map((src, sIdx) => (
                                <ThinkingStepSource
                                  key={sIdx}
                                  color={src.color}
                                >
                                  {src.label}
                                </ThinkingStepSource>
                              ))}
                            </ThinkingStepSources>
                          )}
                        </ThinkingStep>
                      ))}
                    </ThinkingStepsContent>
                  </ThinkingSteps>
                )}

                <ChatMessage
                  from={msg.from}
                  time={msg.time}
                  files={msg.files}
                  className="max-w-[90%]"
                >
                  {msg.text}
                </ChatMessage>

                {msg.approvalGate && (
                  <div className="mt-1 pl-1">
                    {msg.approvalGate.resolved ? (
                      <div
                        className={cn(
                          typeClass("caption"),
                          "inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-emerald-600 dark:text-emerald-400"
                        )}
                        style={{ fontVariationSettings: fontWeights.semibold }}
                      >
                        <span>✓</span>
                        <span>{msg.approvalGate.decisionSummary}</span>
                      </div>
                    ) : (
                      <AskUserQuestions
                        questions={msg.approvalGate.questions}
                        onComplete={(ans) => handleGateComplete(msg.id, ans)}
                        skipLabel="跳过"
                      />
                    )}
                  </div>
                )}

                {msg.receipt && (
                  <div className="mt-1 flex max-w-xl items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <Badge variant="solid" color="red" size="sm">
                      CVSS {msg.receipt.cvss}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          typeClass("caption"),
                          "truncate text-foreground"
                        )}
                        style={{ fontVariationSettings: fontWeights.semibold }}
                      >
                        {msg.receipt.id} · {msg.receipt.title}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {msg.receipt.endpoint}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveReceipt(msg.receipt!)}
                    >
                      取证回执
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>

          {status === "streaming" && (
            <div className="flex flex-col gap-2">
              <ThinkingIndicator />
              {streamedText && (
                <ChatMessage from="assistant" className="max-w-[90%]">
                  {streamedText}
                </ChatMessage>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 p-3.5">
          <InputMessage
            value={draft}
            onValueChange={setDraft}
            onSend={handleSend}
            status={status}
            onStop={stopStreaming}
            queue={queue}
            onQueueChange={setQueue}
            files={files}
            onFilesChange={setFiles}
            suggestions={SUGGESTIONS_ZH}
            placeholder="下达红队渗透指令、粘入 HTTP 报文，或在流式输出时排队多条指令..."
            sendLabel="发送"
          />
        </div>
      </div>

      {/* 右侧可复现证据回执面板 */}
      {mode === "workspace" && activeReceipt && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border/70 bg-muted/15 xl:flex">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
            <div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {activeReceipt.id}
              </span>
              <h3
                className={cn(typeClass("subtitle"), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                可复现证据回执
              </h3>
            </div>
            <Badge variant="solid" color="red" size="sm">
              {activeReceipt.severity} · {activeReceipt.cvss}
            </Badge>
          </div>

          <div className={cn(typeClass("caption"), "flex-1 space-y-4 overflow-y-auto p-4")}>
            <div>
              <p className="text-muted-foreground">漏洞标题</p>
              <p
                className={cn(typeClass("body"), "mt-1 text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {activeReceipt.title}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">验证端点</p>
              <code className="mt-1 block break-all rounded-lg bg-muted p-2 font-mono text-[11px] text-foreground">
                {activeReceipt.endpoint}
              </code>
            </div>

            <div>
              <p className="text-muted-foreground">报文快照 (HAR 摘要)</p>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-neutral-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">
                {activeReceipt.snippet}
              </pre>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3">
              <p className="text-muted-foreground">证据链 SHA-256 签名</p>
              <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                {activeReceipt.sha256}
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
export default SecOpsChatbot;
