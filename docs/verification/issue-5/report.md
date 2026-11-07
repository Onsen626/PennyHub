# Issue #5 证据记录：Strix 本地实跑（Pentest 真实执行）

记录时间：2026-11-07。对应 issue：[#5 \[PoC 04\] Pentest 真实执行](https://github.com/Onsen626/PennyHub/issues/5)。

> **结论先说：本次实跑不满足 issue #5 的验收条件。**
> 它只提供其中一条验收项所需的事实证据——「真实本地应用集成记录」。
> 产品侧的创建入口、接口、持久化与页面路径均未由本次工作实现，因此本 PR **不关闭** #5。

## 1. 与验收条件的对照

| 验收项 | 本次是否覆盖 | 说明 |
|---|---|---|
| 创建入口提供 Code Review 与 Pentest；Pentest 必填目标、源码可选 | ❌ | 未实现产品路径 |
| 登录说明、Cookie、请求头、多身份；敏感资料单独处理 | ❌ | 未实现 |
| 目标按执行容器视角验证可达性，失败提示实际原因 | ❌ | 仅为手工可达性核验 |
| 配置汇总确认后调用真实 Strix | ⚠️ 部分 | 手工以 CLI 参数代替配置汇总，确实调用了真实 Strix |
| 仅地址 / 地址加源码两条路径 | ⚠️ 部分 | 本次为「地址 + OpenAPI 规格」，未走源码路径 |
| 保存配置、事件、发现与复现证据 | ⚠️ 部分 | Strix 原生产物已保存于仓库外；未接产品持久化 |
| 页面/公开接口行为测试 + 真实本地应用集成记录，保留原始输入且不部署修改 | ✅ 部分 | 真实本地应用集成记录成立；页面/接口行为测试未做 |

## 2. 实跑配置

| 项 | 值 |
|---|---|
| 工具 | strix 1.7.0（commit `09536cf`） |
| 模型 | DeepSeek `deepseek-flash`（chat_completions） |
| 模式 / 预算 | `-m quick` / `--max-budget 2` |
| 目标 | `http://192.168.0.82:8000`（WebMon 网站监测系统，FastAPI + SPA） |
| 附加输入 | OpenAPI 3.1.0 规格（61 路径 / 78 操作） |
| 运行 | 2026-11-07 07:50Z → 08:10Z，5 个子 Agent，487 轮，操作员中断 |
| 花费 | $0.4116（输入 45.5M / 缓存命中 44.7M / 输出 253.6K） |

## 3. 结果

**共 2 条已确认发现：**

1. **CRITICAL · 未认证超级管理员接管**（CVSS 9.1 / CWE-307 / `POST /api/auth/login`）
   登录锁定按 `X-Forwarded-For` 计数（不带该头 429、换一个头即 401），5 次上限形同虚设；配合默认超管口令，1406 条候选约 12 分钟命中，取得 `perms:["*"]` 会话后以只读方式确认特权数据可读。
2. **MEDIUM · 用户名枚举**（CVSS 5.3 / CWE-208 / `POST /api/auth/login`）
   bcrypt 仅对存在用户执行，`admin` 与不存在用户的响应时间相差约一个数量级。

**覆盖账本 17 条**：`reported` 3、`no_issue_found` 8（含 61 路径 78 操作的未认证访问、35 个操作的函数级越权矩阵、CORS、公开面等）、`ruled_out` 3、`needs_follow_up` 3（会话 cookie HMAC 签名密钥未能爆破，标注为待跟进而非漏洞）。

## 4. 副作用与清理（重要）

扫描过程创建了 7 个探针账号与 1 个只读角色，已按授权清理：

- 删除成功：`users 2/3/4/7/10`、角色 `pentest_ro`（均 HTTP 200）
- **删除受阻**：`user 5 (pt_adminh)`、`user 6 (pt_esc_user)` 为 active superadmin，API 对超管硬保护（删除 / 降权 / 停用均 400）
- 需服务端处理：`DELETE FROM users WHERE id IN (5,6)`（或先改 `role_id` 再删），并建议将保护逻辑改为「至少保留一个 superadmin」
- 审计行与巡检报告 73/74 无删除接口 / 已 sent，未清理

## 5. 产物位置（仓库外）

`~/pennyagent-pentest/` 下的 `runs/strix_runs/192-168-0-82-8000_b4d4/`（vulnerabilities、SARIF、coverage、日志）、`notes/webmon-probe-artifacts.md`、`notes/cleanup-archive/`。

**脱敏**：本记录不含凭据、Webhook 地址、被监测站点地址与审计明细；这些内容仅留在上述本地目录。

## 6. 本 PR 的边界

- 只新增 `docs/verification/issue-5/**` 两个文件，不改产品代码、不改模型配置、不入库敏感证据。
- 不关闭 #5；`Refs #5`。
- 真实执行接入（草稿 API → 运行接入）仍由主线推进，完成后可复用本记录的口径做集成验收。
