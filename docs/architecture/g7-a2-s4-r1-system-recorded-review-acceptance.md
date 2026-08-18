---
title: G7-A2-S4-R1 系统记账时间独立评审接受
status: accepted-local-review-only
updated: 2026-08-13
---

# G7-A2-S4-R1 系统记账时间独立评审接受

## 1. 决定对象

本门禁只接受冻结的 G7-A2-S4 本地准备对象：DeepSeek 官方公开文档规范化快照、`deepseek-v4-flash` 模型与缓存计价映射、整数 micro-USD 成本计算器、24 个边界 fixture、readiness manifest 和零 Provider 副作用证明。

物化器必须精确锁定 S4 回执 `72377b3244af9459af3df820de93339ac5be3ae1c7df1fa924bd56eb2f9910bb` 与评审包 `bd237087f1f5c94cbd48d079a869100906bbcffe785dd176f2a06930ff80e09d`。任一输入 SHA-256 或 bytes 变化均失败关闭。

## 2. 用户确认与时间语义

用户确认评审人 `ll`：

- 三项检查全部 `passed`；
- `findings=[]`；
- `independenceAttestation=true`；
- `decision=accepted`；
- 使用系统记账时间。

因此 `signedAt` 使用追加式物化执行时的 UTC 秒级系统时间。其 provenance 必须写为 `system-recorded-on-user-confirmation`，`humanProvidedSignedAt=null`。该时间表示系统处理完整用户确认的时间，不得描述为评审人手写或主动提供的签署时间。

## 3. 接受后允许声明

完成后只允许声明：

1. `ll` 独立接受了精确冻结的 S4 本地定价证据与确定性成本合同。
2. 三项检查均通过且 findings 为空。
3. `pricingPolicyMaterialized=true`、`pricingPolicyIndependentlyReviewed=true`。
4. S4 的 6 个官方来源记录、24 个 fixture 和所有本地 source locks 保持不变。
5. 证据等级仍为官方文档 L1 加本地合同 L2，并附用户确认的独立评审；评审不会把证据提升为 live 或生产证据。

## 4. 继续禁止的结论

此次接受不证明：

- DeepSeek 远端页面在评审时或此后仍与规范化快照相同；
- 定价在任何未来 live call 时仍有效；
- 本地授权取整等于 DeepSeek 最终账单；
- Anthropic-compatible 响应一定返回可用缓存拆分；
- 密钥、DNS、TLS、鉴权、模型 entitlement 或 Provider 行为已验证；
- live Provider call、production/live Agent 或任何外部动作已授权。

由于官方快照明确记录价格波动与近期整体提价风险，任何 live call 前仍必须重新访问官方定价页、冻结新鲜证据并绑定新的 admission。S4-R1 对旧快照的接受不能替代该 freshness gate。

## 5. 副作用与下一门禁

物化器只能追加创建四个本地 JSON：用户确认、完成评审、accepted packet 与接受回执。它不得读取环境变量，不得加载网络模块，不得访问官方文档，不得调用 Provider，也不得修改配置、服务、Docker、远端、生产 Agent 或 Git。

建议下一门禁为 `G7-A2-S5`：仅准备 freshness-bound live-attempt admission，要求 live 前重新核对官方价格并把新快照精确绑定到原有两个 canary、零重试、10 秒、token 和 USD 0.25 上限。S4-R1 不授权该门禁，也不授权价格刷新、密钥读取、探测或 Provider 调用。
