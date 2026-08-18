# G6-A3 独立产品与证据验收设计

## 1. 门禁目标

G6-A3 只验收 G6-A2-R1 已冻结的本地 Replay-first E2 Agent 垂直切片。它回答两个问题：

1. 五项 G6-A2 findings 是否在产品体验、证据、schema 和能力边界上真实关闭；
2. 独立评审人是否接受该本地 L2 候选进入下一项另行授权的门禁。

本门禁不发布 Agent，不调用 provider，不访问远端服务器或 Docker，不执行外部写入，也不授权 commit/push。

## 2. 选择的方案

采用“四角色 assigned/accepted 分离”的 fail-closed 方案：

- `pray / ROLE-PRODUCT-EXPERIENCE`：产品叙事、交互、响应式与无障碍；
- `ll / ROLE-EVIDENCE-INTEGRITY`：五项 finding 闭环、fixture/golden、lineage 与证据等级；
- `zy / ROLE-SCHEMA-CAPABILITY`：schema 反例、终态相关性、工具回执与 import graph 能力审计；
- `ly / ROLE-SECURITY-GOVERNANCE`：审批/拒绝、零副作用、网络披露与发布边界。

准备器只生成待签记录、证据包和 preparation receipt；独立的验收器只消费人工提供的结构化评审结果。准备器没有生成 accepted/current 记录的路径。

未采用单评审人方案，因为它不能覆盖既定的多角色独立性要求；未采用模型自动代签，因为本门禁禁止 provider，且模型评审不能替代人工独立性声明。

## 3. 冻结输入

G6-A3 固定绑定以下 G6-A2-R1 证据：

- 39 文件 source manifest 及逐文件 SHA/bytes；
- product/evidence remediation review；
- QA evidence 与 94/100 visual verdict；
- local remediation closeout receipt；
- desktop/mobile Agent Lab 截图；
- 五项 findings 全部 closed、20/20 fixtures、9/9 G6 contracts、8/8 Agent Lab、136/136 content contracts。

历史 `docs:qa` 外链检查产生过只读公网探针，因此只允许主张“零外部写入/零远端动作”，禁止主张“零公网读取”。

## 4. 状态机

```text
prepared / assigned
  ├─ 任一缺签、检查失败、independence=false 或 decision!=accepted → blocked/rejected
  └─ 四人、三项检查全部 passed、findings 已显式记录、independence=true、decision=accepted
       → accepted-local-product-and-evidence
```

`accepted-local-product-and-evidence` 仍是 L2 本地证据，只能证明独立评审接受当前静态/fixture 候选，不能证明 production/live Agent、provider 有效性、真实 Amazon Ads 业务效果或已发布运行态。

## 5. 人工输入合同

每名评审必须提供：

- 精确 `roleId` 与 assignee；
- 三项检查逐项 `passed` 或 `failed`，并可附 note；
- `findings` 数组（无问题也必须显式为空数组）；
- `independenceAttestation`；
- `decision`；
- UTC 秒级 `signedAt`。

验收器不会把“全部通过”自动扩写成缺失的签名事实；只有用户明确提供完整字段后才能物化 accepted 记录。

## 6. 验收边界

G6-A3 完成后仍保持以下值：

- provider calls = 0；
- external writes = 0；
- remote server actions = 0；
- Docker actions = 0；
- production Agent actions = 0；
- public publications = 0；
- git commits/pushes = 0。

下一门禁必须再次单独授权。
