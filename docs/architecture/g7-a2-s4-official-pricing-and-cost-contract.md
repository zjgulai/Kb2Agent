---
title: G7-A2-S4 DeepSeek 官方定价证据与确定性成本合同
status: prepared-local-only
updated: 2026-08-13
---

# G7-A2-S4 DeepSeek 官方定价证据与确定性成本合同

## 1. 目标与边界

本门禁只把 DeepSeek 官方公开文档中的 `deepseek-v4-flash` 定价、模型与缓存计价语义，转化为可校验的本地证据快照、映射和确定性计算合同。它不读取 `ANTHROPIC_API_KEY`，不做 DNS/TLS 定向探测，不调用 Provider，不修改配置或服务，不触碰 Docker、远端、生产 Agent 或 Git 历史。

授权限定为 DeepSeek 官方公开文档，因此研究使用六个同发布者的一手来源。它们适合确认供应商当前公开定价，却不构成跨发布者独立交叉验证；这是范围约束，不得被改写为“多方独立验证”。

## 2. 官方事实

截至 `2026-08-13T08:18:08Z`，DeepSeek 官方 Models & Pricing 页面列出：

- `deepseek-v4-flash` 当前模型版本为 `DeepSeek-V4-Flash-0731`；
- cache-hit 输入为 USD 0.0028 / 1M tokens；
- cache-miss 输入为 USD 0.14 / 1M tokens；
- 输出为 USD 0.28 / 1M tokens；
- Anthropic-compatible base URL 为 `https://api.deepseek.com/anthropic`；
- 官方明确提示价格可能变化，并计划近期整体提价。

Chat Completions 文档把 `prompt_tokens` 表达为 cache-hit 与 cache-miss 之和，Context Caching 文档也给出相同两类计数语义，并注明缓存属于 best-effort。Token Usage 文档说明真实 token 用量应取模型响应中的 usage；离线估算不能冒充实际用量。

## 3. 本地推断与确定性政策

以下不是 DeepSeek 账单规则，而是 fail-closed 的本地授权政策：

1. 只有 `deepseek-v4-flash` 精确模型 ID 可进入计算器。Pro、旧别名、Claude 家族名与自动映射均拒绝；文档映射只用于说明，不扩大 admission。
2. 若可信适配器同时提供 cache-hit 与 cache-miss 输入 token，且二者之和严格等于总输入，则按拆分计价。
3. 若两类缓存计数均缺失，则把全部输入按 cache miss 计价，防止低估。
4. 若只出现一类计数、计数为负/非整数、或总和不一致，则失败关闭。
5. 计算使用整数 micro-USD rate 与 BigInt 分子，避免二进制浮点漂移。
6. 单次授权成本向上取整到 1 micro-USD；批次预算使用“各调用向上取整后求和”。该数只用于 USD 0.25 上限判断，不代表 Provider 发票。

精确分子公式为：

```text
hitTokens × 2,800
+ missTokens × 140,000
+ outputTokens × 280,000
--------------------------------
          1,000,000
```

分子单位为 `micro-USD × token / 1M-token rate denominator`，结果单位为 micro-USD。两项 canary 在全部输入按 miss 的保守模式下分别为 84 与 82 micro-USD，批次授权成本为 166 micro-USD，明显低于 250,000 micro-USD 上限。

## 4. Source lock 的精确定义

本门禁的 source lock 包含两层：

- 快照保存规范化事实、来源 URL、定位描述、抓取时间、事实/推断分类和限制；
- 准备回执锁定快照、政策、计算器、schema、fixtures 与上游 S3-R1 接受回执的本地精确 SHA-256 和 bytes。

它不声称保存了远端 HTML 原始字节，也不声称能证明 DeepSeek 页面之后没有更新。因此任何 live call 前必须重新打开官方定价页，生成新快照并经过独立评审；不得静默沿用本快照。

## 5. 证据等级与未解决项

本门禁最多形成 `L2-local-contract-plus-L1-official-documentation`：可以证明本地合同对冻结官方事实的实现、24 个边界 fixture 的结果和无 Provider 外部副作用；不能证明密钥有效、DNS/TLS 可达、模型 entitlement、响应 usage 真实字段、Provider 实际收费、生产稳定性或 live Agent 可用。

完成 S4 后仍保持：

- `pricingPolicyMaterialized=true`；
- `pricingPolicyIndependentlyReviewed=false`；
- `providerBillingVerified=false`；
- `liveExecutionReady=false`。

建议下一门禁为 `G7-A2-S4-R1`：由独立评审人仅在本地核对来源锁、模型/价格映射、缓存回退、整数公式、边界 fixture 和授权边界，再追加式物化决定。该门禁在 S4 回执中保持未授权。

## 6. 官方来源

1. [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
2. [DeepSeek Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api)
3. [DeepSeek Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)
4. [DeepSeek Context Caching](https://api-docs.deepseek.com/guides/kv_cache)
5. [DeepSeek Token & Token Usage](https://api-docs.deepseek.com/quick_start/token_usage/)
6. [DeepSeek Change Log](https://api-docs.deepseek.com/updates/)
