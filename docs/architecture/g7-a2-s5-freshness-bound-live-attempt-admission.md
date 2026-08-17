---
title: G7-A2-S5 Freshness-bound Live-attempt Admission 准备
status: prepared-local-only
updated: 2026-08-13
---

# G7-A2-S5 Freshness-bound Live-attempt Admission 准备

## 1. 门禁目标

G7-A2-S5 只准备一个 default-no-execute 的 freshness-bound admission。它重新读取 DeepSeek 官方公开文档，比较已独立评审的 S4 定价合同，并把新鲜度规则、两个原始 canary、精确 transport、模型、token、时间、重试和成本边界绑定为本地合同。

本门禁不读取 `ANTHROPIC_API_KEY`，不做 DNS/TLS 定向探测，不调用 Provider，不启动监听器或服务，不修改配置、Docker、远端、production/live Agent 或 Git。`live-attempt` 是未来动作的 admission 名称，不表示本门禁执行了 live attempt。

## 2. 当日官方文档刷新

在 `2026-08-13T09:05:51Z` 记账的官方文档刷新确认：

- `deepseek-v4-flash` 仍是官方精确 API model ID；
- 当前页面列出的版本仍为 `DeepSeek-V4-Flash-0731`；
- Anthropic-compatible base URL 仍为 `https://api.deepseek.com/anthropic`；
- Flash cache-hit 输入仍为 USD 0.0028 / 1M tokens；
- Flash cache-miss 输入仍为 USD 0.14 / 1M tokens；
- Flash 输出仍为 USD 0.28 / 1M tokens；
- 官方仍声明计划近期整体提价，并保留调整产品价格的权利。

本次结果与独立评审的 S4 规范化快照在 admission 所需的模型、版本、endpoint 和三项价格字段上无漂移。DeepSeek 官方价格页、Anthropic API、Change Log 和 Chat Completions API 是四个可用来源；它们来自同一发布者，属于供应商一手证据，不是跨发布者独立验证。

## 3. Freshness 的精确定义

“同日取得官方价格页”只证明准备时新鲜，不证明未来调用时仍新鲜。S5 必须同时记录：

- `freshAtPreparation=true`；
- `freshAtFutureProviderCall=false`；
- `preCallSameRunOfficialPricingRefreshRequired=true`；
- `blockOnCanonicalDrift=true`。

因此未来 live executor 必须在读取密钥或发起 Provider request 前，在同一 run 中重新取得官方价格页，比较 model ID、model version、Anthropic base URL、cache-hit、cache-miss、output 三项费率和价格波动警告。任一字段变化、页面无法读取、来源不是官方域名或证据无法解析，都必须在密钥读取和 Provider 调用之前失败关闭。

## 4. 保留的原始 admission 边界

S5 复用并 source-lock G7-A2-S3 的两个已准备请求，不复制或改写消息内容：

| 项目 | 固定值 |
| --- | --- |
| Provider | `deepseek-official-api` |
| Origin | `https://api.deepseek.com/anthropic` |
| Effective path | `/anthropic/v1/messages` |
| Model | `deepseek-v4-flash` |
| Inputs | `G7-CANARY-01-CLEAN`、`G7-CANARY-02-REDACTION` |
| Calls | 2 |
| Retries | 0 |
| Timeout | 10,000 ms / call |
| Input ceiling | 1,200 tokens / call |
| Output ceiling | 500 tokens / call |
| Aggregate cost ceiling | 250,000 micro-USD |

缺失缓存拆分时继续采用已独立评审的“全部输入按 cache miss”保守计算；部分或不一致拆分继续失败关闭。本门禁不更改 S3 client，也不把 client 导入物化器。

## 5. 证据等级与准备状态

S5 最多形成 `L2-local-contract-plus-L1-same-day-official-documentation`。它可以证明当日官方页面字段与 S4 合同一致、admission 结构满足本地 schemas、24 个正负 fixture 通过并且外部副作用为零；不能证明密钥有效、网络可达、模型 entitlement、Anthropic 响应结构、Provider 账单或 live execution 成功。

准备终态必须保持：

- `freshAtPreparation=true`；
- `pricingMatchesReviewedPolicy=true`；
- `independentAdmissionReviewCompleted=false`；
- `candidateActivated=false`；
- `credentialValidated=false`；
- `providerValidated=false`；
- `liveExecutionReady=false`。

建议下一门禁为 `G7-A2-S5-R1`，只由独立评审人本地核对刷新来源、无漂移比较、same-run refresh fail-closed 规则、两个 canary、完整预算和零 Provider 副作用，再追加式物化决定。S5 不授权该评审决定，也不授权任何 live 动作。

## 6. 官方来源

1. [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
2. [DeepSeek Using the Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api/)
3. [DeepSeek Change Log](https://api-docs.deepseek.com/updates/)
4. [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
