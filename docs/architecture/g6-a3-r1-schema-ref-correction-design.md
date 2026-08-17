# G6-A3-R1 追加式 Schema Reference 修正设计

## 1. 问题与判定

G6-A3 attempt-1 已正确物化四名评审人的检查结果、空 findings、独立性声明、接受决定和统一签署时间。对象本身通过 `g6-a3-review-record.schema.json`，但路径级交叉审计发现：

- `reference/reviews/g6-a3/history/assigned/*.json` 的 `$schema` 从实际目录解析到不存在的 `reference/knowledge-system/...`；
- `reference/reviews/g6-a3/current/*.json` 同样解析到不存在的路径；
- attempt-1 packet、receipt 与四份 current record 已形成相互绑定的 SHA，不能原位修订。

因此 G6-A3 人工接受事实有效，但 attempt-1 的 schema-reference 元数据不能作为最终可解析 closeout。

## 2. 选择的方案

采用用户授权的追加式修正：

1. attempt-1 records、packet、receipt 保持原路径、原字节和原 SHA；
2. source-locked correction builder 只读取 attempt-1；
3. 在 `reference/reviews/g6-a3/corrected-current/` 生成四份纠正记录；
4. 在 `knowledge-system/g6-a3-independent-acceptance-packet-corrected.json` 生成纠正 packet；
5. 生成独立 `g6-a3-r1-schema-ref-correction-receipt.json`，声明 corrected-current 为 G6-A3 的可解析接受证据。

不采用原位修订，因为它会让 attempt-1 receipt 中的 content hashes 失真；不豁免该缺陷，因为相对引用无法被人工工具、IDE 或文件级审计解析。

## 3. 精确修正

四份 corrected-current record 只允许以下差异：

```text
$schema:
  ../../../knowledge-system/schemas/g6-a3-review-record.schema.json
→ ../../../../knowledge-system/schemas/g6-a3-review-record.schema.json
```

纠正后的相对路径必须从 `reference/reviews/g6-a3/corrected-current/` 解析到仓库根下真实的 `knowledge-system/schemas/g6-a3-review-record.schema.json`。

除 `$schema` 外，reviewId、roleId、assignee、candidate identity、assignedAt、三项检查、findings、独立性声明、decision 和 signedAt 必须逐字段深度相等。

## 4. Source locks 与写入策略

Builder 在任何写入前验证：

- 用户 submission SHA；
- attempt-1 acceptance receipt SHA；
- attempt-1 accepted packet SHA；
- 四份 attempt-1 current record SHA；
- record/packet schema 当前字节；
- attempt-1 的 accepted/4-of-4/零副作用/后续权限全 false 语义。

所有新文件使用 `wx`，目标存在即拒绝覆盖。中途失败只删除本轮已经新建的精确 R1 输出；不触碰 attempt-1、assigned history 或其他项目文件。

## 5. 合同与状态迁移

原 preparation/assigned artifacts 继续证明历史 pending 状态，不再要求 accepted 文件永远不存在。无效 submission 探针改为验证 attempt-1 与 corrected-current 的 SHA 均不变化。

G6-A3-R1 合同必须证明：

- attempt-1 字节保持不变；
- attempt-1 错误相对引用被明确记录为历史事实；
- corrected-current 四份引用全部可解析；
- record 内容除 `$schema` 外零差异；
- corrected packet/receipt 的所有文件引用和 SHA 精确匹配；
- correction builder 无网络、远端、Docker、provider 或 Git 执行能力；
- 重复执行拒绝覆盖。

## 6. 证据边界

G6-A3-R1 只修正本地证据元数据，不改变证据等级。完成后允许声明：当前 Replay-first 本地 L2 候选已获得四角色独立产品与证据接受，且 corrected-current schema references 可解析。

仍禁止声明：runtime 已公开发布、真实 provider 已验证、production/live Agent 已启用、真实业务效果已证明，或已授权任何远端、Docker、commit/push 动作。
