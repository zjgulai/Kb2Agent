# G6-A5：精确静态候选四角色评审准备

## 决策目标

G6-A5 只回答一个问题：是否已经为 `mkd-m1c-438e6ae583fc952d` 的精确静态 package 建立可独立签署、不可继承旧结论、且不会自动授权远端动作的四角色评审门禁。

评审对象由三个不可分割的身份组成：

- release：`mkd-m1c-438e6ae583fc952d`；
- site digest：`sha256:438e6ae583fc952d813908b53a6c886ef127dad56d1a73eb017151f1f38bfadf`；
- archive SHA-256：`39c46be06d37507bbb5c1470d531c80988c6bc46d1d332425b51170ff840a892`。

任何一项不一致都不是同一个评审对象。

## 方案选择

采用 G6-A5 专属 schema、evidence pack、assigned packet 和 assigned records。G6-A3 schema 的 candidate 常量指向 A2-R1 实现接受，不能复用；G6-A3 已接受 records 也不能继承，因为它们没有审阅 G6-A4 的 package、88d4 diff 和未来 P9 计划。

所有产物追加到 G6-A5 命名空间，G6-A3、G6-A3-R1、G6-A4 与 88d4 历史字节保持不变。

## 冻结输入

preparation builder 必须逐字节验证：

1. G6-A4 closeout receipt、site manifest、diff manifest 与 public P9 plan；
2. 两次 deterministic build snapshot；
3. archive、checksum sidecar、bundle package manifest、candidate intent 与 site checksums；
4. G6-A3-R1 corrected receipt/packet 与未变 88d4 manifest；
5. G6-A4 builder、snapshot builder、专项合同与设计文件。

除 SHA 外还要重新计算 site manifest 文件集合、bundle payload、88d4 diff summary，并验证 P9 仍为未授权、未执行。

## 四角色职责

| 角色 | 评审人 | 三项检查主题 |
| --- | --- | --- |
| Product Experience | pray | Agent Lab 产品路径；移动/桌面阅读与终态语义；L2/replay 标签 |
| Evidence Integrity | ll | 双构建与 lineage；88d4 diff 完整性；支持/禁止声明 |
| Schema Capability | zy | package payload/hash；schema/合同可复现；P9 覆盖与 fail-closed 规则 |
| Security Governance | ly | secret 与部署资产隔离；全零副作用；所有远端/生产授权仍关闭 |

每人必须独立提供三项检查结果、findings、`independenceAttestation`、decision 和 UTC 秒级 `signedAt`。准备阶段这些字段保持 pending/null。

## 输出与状态机

- 三个 G6-A5 专属 schema：record、packet、submission；
- 一个 source-locked evidence pack；
- 一个 `in-review` assigned packet；
- 四份 `assigned/pending` records；
- 一份 reviewer briefing；
- 一份 preparation receipt。

本门禁不创建 `current` records、accepted packet、acceptance receipt 或 acceptance executor。完整人工输入与后续物化属于新的明确授权。

## 失败关闭

- 任一 source SHA、bytes、release identity、site file、bundle payload 或 diff 计算不一致：零输出停止；
- schema reference 不能从 record 实际目录解析：零输出停止；
- assigned record 出现 accepted/passed/签署时间：schema 拒绝；
- preparation source 包含网络、child process、SSH、Docker 或 acceptance 输出路径：合同拒绝；
- 重复执行：拒绝覆盖已有 G6-A5 产物。

## 证据等级与禁止声明

最高等级保持 `L2-fixture-or-dry-run-plus-local-package-review-preparation`。它只支持“精确本地静态候选已准备四角色评审”，不支持四人已接受、已上传、远端 baseline 已通过、runtime 已创建、edge 已切换、公网 P9 已执行、production/live Agent、provider 或业务效果。

## 验收条件

- G6-A5 定向合同全绿，包含 assigned 状态反例与 overwrite 保护；
- 全量 content contracts 和 `git diff --check` 通过；
- G6-A4、G6-A3-R1 与 88d4 父证据 SHA 不变；
- accepted/current G6-A5 资产不存在；
- public/SSH/upload/remote/Docker/edge/provider/production Agent/publication/commit/push effect ledger 全部为 0。
