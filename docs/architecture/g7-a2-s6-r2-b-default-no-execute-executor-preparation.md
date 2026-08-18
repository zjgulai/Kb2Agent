---
title: G7-A2-S6-R2-B Default-no-execute Executor 本地准备
status: authorized-local-candidate-preparation
updated: 2026-08-14
---

# G7-A2-S6-R2-B Default-no-execute Executor 本地准备

## 1. 授权边界

本门禁只创建 source-locked、default-no-execute 的 attempt-2 candidate executor、同次官方价格刷新 fail-closed contract、safe-code-only Provider failure contract、synthetic fixtures、schemas 和独立评审材料。

禁止读取或输出密钥、访问网络、调用 Provider、运行 executor、创建服务/监听器、远端/Docker、production/live Agent、commit 或 push。测试只能导入纯合同并静态读取 executor 源码，不能启动 executor 进程。

## 2. Candidate executor 形态

`scripts/run-g7-a2-s6-r2-b-attempt-2.mjs` 是无网络、无 credential adapter、无 Provider adapter 的 default-deny shell。默认状态为 `DEFAULT_NO_EXECUTE`；任何参数都返回 `EXECUTION_NOT_AUTHORIZED_IN_R2_B`。它只物化候选 orchestration boundary，不具备 live execution 能力。

纯合同要求未来执行请求同时具备：executor 独立评审接受、单独 execution authorization、同一次运行中的官方价格刷新通过。合同即使对 synthetic 全量条件返回 admitted，也只表示纯判定结果，不代表本门禁执行或授权任何动作。

## 3. 同次价格刷新合同

未来刷新证据必须：

- 在 run start 之后、credential read 之前产生；
- 在判定时不超过 300 秒；
- 来源固定为 DeepSeek 官方 pricing URL、零 redirect、TLS authorized、body SHA-256 已记录；
- 精确模型为 `deepseek-v4-flash`，regime 为 current、peak 或 off-peak；
- 按两次调用、每次 1,200 input 与 500 output tokens 的最坏价格计算，总成本不超过 USD 0.25；
- pricing window 过期、来源/模型/顺序/费率异常时 fail closed。

R2-B 不访问官方文档，也不生成真实 pricing evidence；所有价格输入均为 synthetic fixtures。

## 4. Safe-error 与事件顺序

Provider failure projection 只能保留固定 safe code、reason code 和 credential-reference-detected boolean；raw message/class、credential value/length/hash/fingerprint 均不得输出。事件顺序必须为 pricing refresh 与 contract pass 在 credential read 之前；最多两次 canary，零重试。

## 5. 当前阻断态

候选 executor source 在本门禁物化后，可把 `ATTEMPT_2_EXECUTOR_NOT_MATERIALIZED` 标记为 source-level resolved，但新增或保留三项阻断：

1. `ATTEMPT_2_EXECUTOR_INDEPENDENT_REVIEW_PENDING`；
2. `SAME_RUN_PRICING_REFRESH_NOT_PERFORMED`；
3. `EXECUTION_AUTHORIZATION_MISSING`。

下一门禁为 `G7-A2-S6-R2-B-REVIEW`，当前未授权，只允许独立本地评审与追加式决定物化，仍不允许 executor 或任何外部动作。
