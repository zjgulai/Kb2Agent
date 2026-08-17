---
title: G7-A2-S6-R2 Attempt-2 Admission 本地准备
status: authorized-local-preparation
updated: 2026-08-14
---

# G7-A2-S6-R2 Attempt-2 Admission 本地准备

## 1. 授权解释

用户授权执行 `G7-A2-S6-R2`，范围仅为凭证所有者 attestation 模板和 source-locked attempt-2 admission 的本地准备。授权不是凭证事实：用户尚未逐项确认 DeepSeek 控制台检查、凭证状态、账户/项目、API access/余额、轮换、安全注入或无披露格式检查，因此所有 owner facts 必须保持 `null`，attestation decision 保持 `pending`。

本门禁禁止读取或输出凭证、访问 DeepSeek 控制台或任何网络、调用 Provider、修改配置/服务、远端/Docker、production/live Agent、commit 或 push。

## 2. Attempt-2 固定边界

Admission 继续冻结两个原始 canary、`deepseek-v4-flash`、最多两次调用、零重试、每次 10 秒、输入 1,200 tokens、输出 500 tokens 和 USD 0.25 总上限。它新增 source-locked safe-code-only Provider 错误净化器，任何未来 runtime 都不得保留原始 Provider error message/class。

R2 不创建可执行 runtime。`attempt2ExecutorMaterialized=false`，因此即使 owner facts 后续完整，仍不能在本门禁调用 Provider。

## 3. 价格时间边界

S6 的 2026-08-14 官方快照只作为历史输入。它明确规定现行价格窗口在 `2026-08-16T16:00:00Z` 结束，跨越该时刻不得重放。Attempt-2 必须在未来单独授权的同一运行中重新读取官方价格，并按当时有效的 current/peak/off-peak 或更新后的规则重新计算成本；R2 不访问官方文档，也不声称旧快照仍新鲜。

## 4. 四项硬 blocker

1. `OWNER_ATTESTATION_FACTS_PENDING`；
2. `ATTEMPT_2_EXECUTOR_NOT_MATERIALIZED`；
3. `INDEPENDENT_ADMISSION_REVIEW_PENDING`；
4. `SAME_RUN_PRICING_REFRESH_NOT_PERFORMED`。

任何 blocker 存在时，credential read、network、Provider 和 live attempt 均必须为 false。

## 5. 下一最小门禁

R2 准备完成后的最小下一门禁为 `G7-A2-S6-R2-A`，只在凭证所有者真实完成清单后追加物化七个非敏感布尔事实和系统记账时间，并准备独立 admission review。所有者不得提交凭证值、长度、前后缀、哈希、指纹、截图或其他 secret-bearing artifact。R2-A 仍不授权密钥读取、网络或 Provider 调用。
