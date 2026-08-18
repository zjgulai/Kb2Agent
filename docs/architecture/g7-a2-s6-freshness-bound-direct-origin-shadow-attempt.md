---
title: G7-A2-S6 Freshness-bound Direct-origin Shadow Attempt
status: blocked-authentication-rejected
updated: 2026-08-14
---

# G7-A2-S6 Freshness-bound Direct-origin Shadow Attempt

## 1. 授权与冻结对象

用户授权执行已由 `ll` 独立接受的 G7-A2-S6：先在同一 run 读取 DeepSeek 官方定价页并匹配冻结合同，只有成功后才读取 `ANTHROPIC_API_KEY`，再按顺序最多调用两个固定 canary。模型固定为 `deepseek-v4-flash`，每次超时 10 秒、零重试、输入不超过 1,200 tokens、输出不超过 500 tokens，总成本上限 USD 0.25。

执行器精确锁定 S5-R1 接受回执 `1bdc8a82...bf768`、S5 admission、两个 S3 request、S3 直连客户端/合同和 S4 成本计算器。任何 SHA 或 bytes 漂移都在网络与密钥读取前失败关闭。

## 2. 同一运行定价结果

run `G7A2S6-20260814T024618Z` 在 `2026-08-14T02:46:22Z` 读取 DeepSeek 官方定价页，TLS 与 HTTP 200 检查通过。现行 `deepseek-v4-flash` 价格仍与冻结 S4 合同一致：cache-hit input `2800`、cache-miss input `140000`、output `280000` micro-USD / 1M tokens。

官方页面同时预告 `2026-08-16T16:00:00Z` 起切换峰谷计费：Flash off-peak 为 `7000 / 220000 / 660000`，peak 为 `14000 / 440000 / 1320000` micro-USD / 1M tokens。S6 只在该生效时刻之前接受现行价格，之后重放必须失败关闭，不能把本回执当作永久新鲜证据。

## 3. Provider 尝试终态

在官方价格匹配后，执行器读取密钥一次并发送第一条固定 canary。Provider 在 318 ms 返回 HTTP 401，分类为 `AUTHENTICATION_REJECTED`。执行器没有重试，也没有发送第二条 canary：

- official-document reads：1；
- credential reads：1；
- Provider calls：1 / authorized maximum 2；
- retries：0；
- passed / failed：0 / 1；
- response usage 与实际账单：未验证；
- external writes、remote/Docker、配置/服务、production/live Agent、commit/push：均为 0。

这证明官方端点可经受信 TLS 到达并返回鉴权结果，但不证明凭证有效、模型 entitlement、模型返回、usage、成本或生产 Agent 可用。

## 4. 隐私语义 finding

Provider 的 401 错误文本包含一个已遮罩的凭证引用。原 call receipt 以权限 `0600` 保留该受限历史；它不得进入公开网站、部署包、评审展示或日志摘录。原 attempt receipt 同时声明 `credentialValueOrDerivativeRecorded=false`，因此存在追加式隐私语义修正义务。不得原位改写历史回执。

后续本地修正还必须加固错误文本净化：任何包含 API key、遮罩片段、前后缀、长度、哈希或指纹的 Provider 错误都只能记录统一常量，不得记录原文。

## 5. 证据等级与下一门禁

S6 最大证据等级为 `L4 authorized live Provider shadow + L1 same-run official documentation + L2 reviewed contract`，终态是 blocked，不是 Agent live readiness。

最小下一门禁为 `G7-A2-S6-R1`，且当前未授权。建议范围仅包括：

1. 追加式物化隐私语义 correction，将原 call/attempt 回执标为 internal restricted history；
2. source-lock 本次三份终态证据，修正未来错误净化合同与 fixture；
3. 本地判定 401 为 credential validity / injection mismatch 类问题，不读取、输出或派生密钥，不访问网络；
4. 生成独立评审材料和后续新凭证 attempt 的前置条件。

R1 不授权再次读取密钥、Provider 调用、远端/Docker、配置/服务变更、production/live Agent、commit 或 push。任何新调用必须由更晚的独立门禁重新授权。
