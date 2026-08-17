---
title: G7-A2-S5-R1 Freshness Admission 独立评审门禁
status: assigned-awaiting-independent-review
updated: 2026-08-14
---

# G7-A2-S5-R1 Freshness Admission 独立评审门禁

## 1. 决定对象

本门禁只评审冻结的 G7-A2-S5 本地准备对象：准备回执 `2270b1512a7d003c3c86a669edba0d6ae453e1a65be449d8d2d53d24c4eb8922`、评审包 `e4107999faf8c964e65d6aa351eb13461ff514c39fd32fc40f0984cf42c29e47`、freshness-bound admission、同日官方定价刷新、24-case fixture report 和零 Provider 副作用边界。

2026-08-14 对这些 2026-08-13 冻结对象的评审只能决定“该准备对象是否作为有边界的本地 admission 合同被接受”。它不能把 2026-08-13 的价格快照重新变成当前或未来调用时的新鲜证据。

## 2. 已授权与缺失事实

用户已授权 G7-A2-S5-R1 的本地独立评审与追加式决定物化。按照前序 G7 评审链和上一门禁建议，评审任务分配给 `ll`。授权不等于决定；当前没有可验证的独立评审结果，因此必须保持：

- `reviewState=assigned`；
- 三项检查均为 `pending`；
- `findings=null`；
- `independenceAttestation=null`；
- `decision=pending`；
- `signedAt=null`。

决定物化授权已保留，但在 `ll` 给出完整评审事实前失败关闭。不得由准备者或自动化测试推断 `passed`、无 findings、独立性或 accepted。

## 3. 三项独立检查

1. `SAME-DAY-OFFICIAL-REFRESH-AND-S4-NO-DRIFT`：核对四个 DeepSeek 官方来源、单发布者限制、五次无可用结果记录，以及模型、版本、base URL、三项价格与 S4-R1 的精确无漂移比较。
2. `EXACT-CANARIES-TRANSPORT-MODEL-AND-BUDGET`：核对两个 S3 canary 的 SHA、`deepseek-v4-flash`、Anthropic path、2 calls、0 retries、10 秒、1200/500 tokens 与 USD 0.25 上限。
3. `SAME-RUN-PRECALL-REFRESH-FAIL-CLOSED-AND-ZERO-PROVIDER-EFFECTS`：核对准备时新鲜不等于未来新鲜、未来调用必须同 run 重新核价且在密钥读取前失败关闭，以及 S5 Provider/密钥/探测副作用均为零。

自动化预检可以验证 schema、SHA、fixture 和零副作用字段，但不构成独立评审决定。

## 4. 决定输入最小格式

完成本门禁只需要 `ll` 的一条完整结果：三项是否全部 passed、findings、`independenceAttestation`、decision；时间可继续使用透明的系统记账时间。若任一字段缺失，决定物化器必须拒绝且不得创建 accepted 对象。

## 5. 授权边界

本门禁不访问官方文档，不读取 `ANTHROPIC_API_KEY`，不做 DNS/TLS 探测，不调用 Provider，不修改配置、服务、Docker、远端、production/live Agent 或 Git。即使未来评审 accepted，也只接受本地 admission 合同，不授权 live attempt。
