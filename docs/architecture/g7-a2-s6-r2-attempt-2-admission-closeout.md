---
title: G7-A2-S6-R2 Attempt-2 Admission 本地准备 Closeout
status: complete-local-preparation-blocked-with-post-materialization-boundary-deviation
updated: 2026-08-14
---

# G7-A2-S6-R2 Attempt-2 Admission 本地准备 Closeout

## 1. 确定事实

- 本地 run-id：`G7A2S6R2-20260814T064942Z`。
- 冻结回执：`reference/receipts/g7-a2-s6-r2-attempt-2-admission-preparation-receipt.json`，SHA-256 `33c0631a3b9c190cdc97320e80ddf230c8305d566878d0508780e3b2f8682d11`，9,203 bytes，mode `0600`。
- 21 项 source-lock 与 6 项 generated-artifact 全部回读一致；7 个本地生成产物均为 mode `0600`。
- 16/16 确定性 synthetic fixtures 通过；完整物化后 9/9 门禁合同通过，无 skip。
- owner facts 为 `0/7`，七项值全部为 `null`；owner decision 为 `pending`。
- 冻结 materializer run 内的 credential reads、credential derivatives、network calls、Provider calls、external writes、远端/Docker、配置/服务、production/live Agent、commit、push 均为 0。

## 2. Post-materialization 边界偏差

最终交叉审计阶段误执行了 `npm run docs:links`。该脚本除本地链接外，还对 91 个唯一外部 URL 发起 HEAD 检查，并可能在 HTTP 405/501 时改用 GET、在临时失败时有界重试；因此实际 HTTP 请求总数未被仪表化，只能确定不少于 91。审计结果通过，包含 2 个 access-restricted warning。

这是一次未获授权的公开网络只读访问。它没有读取凭证、没有发起 authenticated Provider API call、没有外部写入，也没有修改冻结产物；但整个门禁不能再声明为 clean boundary conformance。原冻结回执保持不变，其 `networkCalls=0` 只描述 materializer run。追加式偏差回执为 `reference/receipts/g7-a2-s6-r2-post-materialization-boundary-deviation.json`，SHA-256 `6696735d54776d810fae855503f463b8ff33b6039070b83e89f4e57c6d478a8c`，2,983 bytes，mode `0600`；其 4/4 correction contracts 通过。

## 3. 当前阻断态

Attempt-2 同时保留四项硬 blocker：

1. `OWNER_ATTESTATION_FACTS_PENDING`；
2. `ATTEMPT_2_EXECUTOR_NOT_MATERIALIZED`；
3. `INDEPENDENT_ADMISSION_REVIEW_PENDING`；
4. `SAME_RUN_PRICING_REFRESH_NOT_PERFORMED`。

因此本门禁没有可执行 runtime，没有凭证读取许可，没有网络或 Provider 调用许可，也没有 production/live Agent 就绪结论。

## 4. 推断与未证明项

HTTP 401 仍只能归类为 `AUTHENTICATION_REJECTED`，不能从中选择凭证失效、账户/项目错误、余额/API access、注入环境或格式污染中的任何具体根因。R2 只创建所有者 attestation 模板，不证明所有者已登录官方控制台、完成轮换或更新安全注入。

2026-08-14 的 S6 官方价格快照仅是历史证据。其 replay 窗口在 `2026-08-16T16:00:00Z` 结束，未来 attempt 必须在另行授权的同一次运行中重新读取官方价格并解析届时有效规则。

## 5. 下一最小门禁

`G7-A2-S6-R2-A` 当前未授权。只有用户确认知悉上述边界偏差，且凭证所有者在 Codex 之外真实完成七项检查后，才可在同一条授权中允许本地追加物化七个非敏感布尔值和系统记账时间，并准备独立 admission review。不得提交凭证值、长度、前后缀、哈希、指纹、截图或任何 secret-bearing artifact；R2-A 仍不授权密钥读取、网络或 Provider 调用。
