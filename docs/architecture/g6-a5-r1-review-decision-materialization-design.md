---
title: G6-A5-R1 精确候选评审决定物化
status: complete-local-only
date: 2026-08-11
---

# G6-A5-R1：精确候选评审决定物化

## 决策目标

G6-A5-R1 只把用户提供的 pray、ll、zy、ly 四角色评审事实物化为本地、追加式、可复验的接受资产。评审对象必须同时匹配：

- release：`mkd-m1c-438e6ae583fc952d`；
- site digest：`sha256:438e6ae583fc952d813908b53a6c886ef127dad56d1a73eb017151f1f38bfadf`；
- archive SHA-256：`39c46be06d37507bbb5c1470d531c80988c6bc46d1d332425b51170ff840a892`。

本门禁不重新构建站点或 archive，不访问公网、SSH、Docker、远端服务器、edge 或 provider，也不执行 publication、commit 或 push。

## 方案选择

采用追加式 `current` records、accepted packet 与独立 acceptance receipt。G6-A5 assigned packet、assigned records、preparation receipt、evidence pack 和 reviewer briefing 全部按 SHA/bytes source-lock，绝不原位覆盖。

拒绝两个替代方案：

1. 原位把 assigned records 改成 completed，会破坏评审历史与准备回执；
2. 继承 G6-A3 或 88d4 的旧接受结论，它们没有评审本轮 release/site/archive 三重身份。

## 人工输入

submission 固定包含四个独立角色，每人三项 `passed`、`findings=[]`、`independenceAttestation=true`、`decision=accepted` 和用户明确提供的 UTC 秒级 `signedAt`。

除 schema 校验外，执行器必须验证：

- 角色与 assignee 顺序、唯一性和 assigned packet 完全一致；
- 三项检查文本来自 assigned record，只允许提交结果和 note；
- `signedAt` 不得早于 packet `preparedAt` 或 record `assignedAt`；
- submission `submittedAt` 不得早于任一 `signedAt`；
- 任一检查失败、独立性不成立、决定非 accepted 或 findings 与输入不一致时不生成接受资产。

首次用户输入 `2026-08-11T11:31:51Z` 早于冻结的 `preparedAt=2026-08-11T14:42:30Z`，执行器因此在零输出状态失败关闭。用户随后明确把四人统一签署时间更正为 `2026-08-11T14:52:30Z`；该时间通过顺序校验后才允许物化。整个过程没有自动时区换算或使用执行时间代签。

## 输出与不可变性

有效输入下只允许新增：

- `reference/reviews/g6-a5/current/*.json` 四份 completed records；
- `knowledge-system/g6-a5-candidate-review-packet-accepted.json`；
- `reference/receipts/g6-a5-candidate-review-acceptance-receipt.json`。

所有输出先 schema 校验，再以 `wx` 创建；任一写入失败只清理本轮已写入的精确输出。重复执行必须拒绝覆盖。current record 的 `$schema` 必须从真实目录解析到仓库内 G6-A5 record schema。

## 证据边界

完成后最高仍是 `L2-fixture-or-dry-run-plus-user-provided-independent-human-package-review`。它只支持“精确本地静态 package 已通过四角色评审”，不支持远端 baseline、上传、runtime 创建、edge switch、公网 P9、真实 provider、production/live Agent 或业务效果。

## 验收条件

- submission、四份 completed records 和 accepted packet 通过专属 schema；
- accepted packet/receipt 精确绑定 preparation、evidence、assigned history 与三重候选身份；
- assigned history 字节不变，current schema refs 4/4 可解析；
- 定向合同、全量 content contracts 与 `git diff --check` 通过；
- public/SSH/upload/remote/Docker/edge/provider/production Agent/publication/commit/push effect ledger 全部为 0。
