---
title: G7-A2-S6-R2-A Owner Attestation 与独立评审准备
status: authorized-local-append-only-materialization
updated: 2026-08-14
---

# G7-A2-S6-R2-A Owner Attestation 与独立评审准备

## 1. 本门禁输入

凭证所有者 `pray` 明确确认已知悉 G7-A2-S6-R2 post-materialization 网络边界偏差，七项 owner checks 均 `passed`，其中包含 API access 与余额确认；没有提供任何 secret material；decision 为 `accepted`，时间使用系统记账时间。用户同时授权仅本地追加式物化，并准备 reviewer `ll` 的独立评审。

七项 owner checks 固定为：官方 DeepSeek 控制台已检查、检查时凭证 active、目标账户与项目一致、API access 与余额已确认、受限历史引用后已轮换、安全注入已在带外更新、格式检查在不披露内容的前提下通过。

## 2. 证据语义

这七项是 credential-owner attestation，不是 Codex 读取凭证或 Provider runtime 验证。物化后可声明 `ownerAttestationComplete=true`，但必须继续声明 `credentialRuntimeValidated=false`、`providerValidated=false`、`modelEntitlementValidated=false` 和 `actualProviderBillingVerified=false`。

用户没有提供凭证值、长度、前后缀、哈希、指纹、截图或 secret-bearing artifact。本地 materializer 禁止读取环境凭证，也不具备网络、Provider、服务、Docker 或远端能力。

## 3. Append-only 关系

R2 的 pending owner template、四-blocker readiness、review packet、preparation receipt 和 boundary-deviation receipt 均保持不变。R2-A 创建独立 confirmation、accepted owner attestation、admission supplement、三-blocker readiness、`ll` assigned-review 和 preparation receipt，不能覆盖历史文件。

`OWNER_ATTESTATION_FACTS_PENDING` 在 supplement 中标记为 resolved。以下三项仍是硬 blocker：

1. `ATTEMPT_2_EXECUTOR_NOT_MATERIALIZED`；
2. `INDEPENDENT_ADMISSION_REVIEW_PENDING`；
3. `SAME_RUN_PRICING_REFRESH_NOT_PERFORMED`。

## 4. ll 独立评审边界

本门禁只分配三项检查，不推断 `ll` 已执行检查：

1. owner attestation 与用户确认、secret boundary 和 deviation acknowledgement 一致；
2. R2 历史保持 append-only，source-lock、canary、model 与 limits 无漂移；
3. 三项 blocker、历史价格不可重放和零 Provider 权限保持 fail-closed。

`reviewItems`、`findings`、`independenceAttestation`、`decision` 和 `signedAt` 均保持 pending/null。

## 5. 下一最小门禁

下一门禁为 `G7-A2-S6-R2-A-REVIEW`，当前未授权。只有 `ll` 返回三项检查结果、findings、independence 和 decision 后，才可单独授权本地追加式决定物化。该下一门禁仍不授权密钥读取、网络、Provider、executor、production/live Agent、commit 或 push。
