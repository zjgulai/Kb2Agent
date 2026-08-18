---
title: G7-A2-S6-R2-B-REVIEW 独立评审分配
description: 对 default-no-execute attempt-2 executor 候选执行 source-locked 机器预检并分配 ll 独立评审，不推断评审结论。
---

# G7-A2-S6-R2-B-REVIEW 独立评审分配

## 授权与决定边界

用户授权启动 `G7-A2-S6-R2-B-REVIEW`。授权允许本地重新验证冻结 subject、分配 reviewer `ll`，并在完整独立评审事实到达后进行追加式决定物化；授权本身不等于三项检查通过、findings 为空、独立性成立或 decision accepted。

本门禁继续禁止 credential 读取或输出、网络或 Provider 调用、executor 执行、服务或监听器、远端或 Docker、production/live Agent、commit 与 push。

## 冻结 subject

评审必须绑定以下不可替换对象：

- R2-B preparation receipt 与其中全部 source locks。
- Default-no-execute executor manifest。
- 24/24 synthetic fixture report 与 fixture set。
- 原始 pending review packet 的三个 required checks。
- Executor shell、runtime contracts 与已披露的历史网络边界偏差。

任一 SHA-256 或 byte size 漂移都必须 fail closed，并开始新的评审轮次。

## 三项独立检查

Reviewer `ll` 必须分别确认：

1. `DEFAULT-NO-EXECUTE-NO-SECRET-NETWORK-PROVIDER-ADAPTERS`
2. `SAME-RUN-PRICING-COST-TRACE-FAIL-CLOSED-AND-24-FIXTURES`
3. `SAFE-CODE-ONLY-SOURCE-LOCKS-AND-DEVIATION-DISCLOSURE`

机器预检只能证明 source locks、schemas、24/24 fixtures 与零执行副作用记录一致，不能替代以上独立判断。

## 完成条件

在 reviewer facts 缺失时，assigned review 必须保持：三个检查 `pending`、`findings=null`、`independenceAttestation=null`、`decision=pending`、`signedAt=null`，并以 `INDEPENDENT_REVIEW_FACTS_MISSING` 阻断 acceptance。

完整事实可用一条消息提交：

```text
ll 三项检查均 passed，findings 无，independenceAttestation=true，decision=accepted，使用系统记账时间。
```

系统记账时间只表示决定物化时间，不伪装成 reviewer 手写时间。即使未来评审接受，same-run official pricing refresh 与单独 execution authorization 仍是 live attempt 的必要门禁。
