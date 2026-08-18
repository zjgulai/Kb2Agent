---
title: G7-A2-S6-R2-B Default-no-execute Executor 准备 Closeout
description: Source-locked attempt-2 executor shell、同次价格合同、safe-code-only 错误合同与独立评审包的本地验证结论。
---

# G7-A2-S6-R2-B Default-no-execute Executor 准备 Closeout

## 结论

`G7-A2-S6-R2-B` 已在授权边界内完成。运行 `G7A2S6R2B-20260814T131244Z` 只创建 5 个 `0600` 本地产物；候选 executor 未执行，credential 未读取，网络与 Provider 调用均为 0。

- 准备回执：`reference/receipts/g7-a2-s6-r2-b-executor-preparation-receipt.json`，SHA-256 `d23b38afe5288fd1144cf32668ca84192c1436fa5231dbe045fb78ebff26e115`，8,019 bytes。
- Executor manifest：`reference/build/g7/a2-s6-r2-b/attempt-2-executor-manifest.json`，SHA-256 `9557a5d07becbff84a6d522ea69e5b81f05a2cbcaed0b0f7c5382c6758877e29`，2,866 bytes。
- Fixture report：`reference/build/g7/a2-s6-r2-b/attempt-2-contract-fixture-report.json`，SHA-256 `89696d472c6b423a17df60a9eba56e2b0bb04c9993b95bb215066c16558b2e3f`，10,161 bytes。
- Pending review packet：`reference/reviews/g7-a2-s6-r2-b/attempt-2-executor-review-packet.json`，SHA-256 `dbc432fcf639fdac3acd2c5b936095122dbf2f20be625b29cb8af373e898514c`，3,542 bytes。

## 确定性合同

候选 `scripts/run-g7-a2-s6-r2-b-attempt-2.mjs` 仅是 default-deny orchestration shell：默认 `DEFAULT_NO_EXECUTE`，任意参数均返回 `EXECUTION_NOT_AUTHORIZED_IN_R2_B`，且没有 credential、network 或 Provider adapter。它的存在不等于运行授权或 live execution 能力。

`reference/runtime/g7-attempt-2-r2b-contracts.mjs` 固定以下约束：

- 同一次未来执行中，必须先获取 DeepSeek 官方页面的价格证据，再允许 credential read；证据超过 300 秒、来源/模型/regime 不匹配或窗口过期均 fail closed。
- 两次调用、每次输入最多 1,200 tokens、输出最多 500 tokens，以较高 input rate 计算最坏成本，必须不超过 USD 0.25。
- 事件序列必须是价格合同通过后读取 credential，再依次完成两个 canary；重试为 0，第三次调用被拒绝。
- Provider 错误只输出固定 safe code 与布尔元数据；不保留 raw error text/class、credential value、长度、哈希或指纹。

## 验证证据

TDD 过程先观察到物化器缺失导致的预期红灯，随后实现最小物化器。生成前静态阶段为 4/4 passed、4 个产物级检查按设计 skipped；生成后联合执行两个测试文件得到 16/16 passed、0 skipped、0 failed。24 个 synthetic fixtures 的分布为：pricing 9、safe error 6、event trace 4、execution request 5，全部通过。

物化器使用 exclusive create 和 mode `0600`，再次运行会拒绝覆盖。其 source-lock 逐字节绑定已接受的 R2-A admission review、已披露的历史网络边界偏差、executor shell、runtime contracts、测试、设计与 6 个 schema。历史偏差保持披露，本门禁不能反向声明此前 whole-gate clean boundary conformance。

## 证据上限与剩余阻断

本门禁证据等级为 `L2-local-contract-and-synthetic-fixtures-no-executor-run`。它只证明本地候选源码和确定性合同存在，不证明 credential runtime 有效、官方价格已为某次未来调用刷新、Provider 可访问、模型 entitlement、真实 usage/billing 或 production/live Agent readiness。

源码层 `ATTEMPT_2_EXECUTOR_NOT_MATERIALIZED` 已解决，但以下三项仍是强阻断：

1. `ATTEMPT_2_EXECUTOR_INDEPENDENT_REVIEW_PENDING`
2. `SAME_RUN_PRICING_REFRESH_NOT_PERFORMED`
3. `EXECUTION_AUTHORIZATION_MISSING`

## 下一门禁

最小下一门禁为 `G7-A2-S6-R2-B-REVIEW`，当前未授权。范围只应是 reviewer `ll` 对冻结 packet 的三项独立本地检查，以及收到完整事实后的追加式决定物化；该门禁仍不授权 credential 读取/输出、网络、Provider、executor、服务/监听器、远端/Docker、production/live Agent、commit 或 push。
