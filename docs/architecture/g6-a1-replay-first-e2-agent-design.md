---
title: G6-A1 Replay-first 单 E2 Agent 垂直切片
description: 本地确定性 Agent runtime、二十条门禁案例与 Agent Lab 的冻结设计
outline: deep
---

# G6-A1 Replay-first 单 E2 Agent 垂直切片

> 状态：`approved-local-design`  
> 证据上限：`L2-fixture-or-dry-run`  
> 授权日期：2026-08-11

## 决策摘要

G6-A1 在不改写 M1-B 历史的前提下，把现有 immutable synthetic snapshot 升级为可逐步审查的单 E2 Agent 垂直切片。它执行真实的本地确定性工具函数并导出完整 bundle；Agent Lab 只回放这些构建产物，不调用模型、不访问外部系统、不执行写操作。

本轮支持的最高声明是：

> 一个冻结的 Amazon Ads 合成任务可以在本地通过版本化合同、白名单确定性工具和失败关闭策略，稳定地产生 ExecutionPlan、逐工具回执、ActionPackage 与 AgentExecutionReceipt，并在 Agent Lab 中复放。

本轮不支持：production/live Agent、真实 provider、真实账户诊断、客户证据、外部平台操作、canonical knowledge 写入或公网 Agent 已发布。

## 继承与隔离

| 资产 | G6 行为 | 原因 |
| --- | --- | --- |
| M1-B snapshot / SQLite index | 只读复用 | 保留同一知识与证据基线 |
| M1-B 20/20 evaluation 与 receipts | 不修改 | 冻结历史证据与 lineage |
| M1-B `agent.mjs` | 不作为 G6 输出合同 | 避免新终态覆盖旧语义 |
| G6 schemas / fixtures / build / exports | 独立命名空间 | 可版本化、可回滚、可交叉审计 |
| 公网静态站 | 不修改 | 本轮无发布授权 |

## Runtime 架构

```text
G6 Fixture
  → input schema gate
  → CapabilityManifest / ToolPolicy
  → deterministic ExecutionPlan
  → tool executor registry
  → ToolCallReceipt[]
  → ActionPackage
  → ApprovalDecision 或 RefusalReceipt
  → AgentExecutionReceipt
  → immutable replay bundle
```

### 合同对象

1. `CapabilityManifest v1`：Agent 身份、模式、工具白名单、禁止能力与预算。
2. `ToolPolicy v1`：工具 mode、输入/输出合同、`sideEffect=false` 与失败策略。
3. `ExecutionPlan v1`：固定步骤、工具、输入引用、预期输出和 guard 条件。
4. `ToolCallReceipt v1`：每次真实本地函数调用的输入/输出 hash、状态、耗时常量和错误码。
5. `ActionPackage v2`：事实、推断、未知、计算、选项、风险、停止条件与批准要求。
6. `ApprovalDecision v1`：`pending` 状态和所需角色；本轮不生成 accepted。
7. `RefusalReceipt v1`：越权请求的规则、原因、请求摘要和安全替代路径。
8. `AgentExecutionReceipt v1`：run、snapshot、task、agent、plan、tools、artifacts、终态和零副作用计数。

### 工具边界

固定八个工具：

- `TOOL-READ-SNAPSHOT`
- `TOOL-SEARCH-FTS`
- `TOOL-LOAD-CLOSURE`
- `TOOL-CALCULATE-METRIC`
- `TOOL-CHECK-FRESHNESS`
- `TOOL-CHECK-PERMISSION`
- `TOOL-DRAFT-ACTION`
- `TOOL-EMIT-RECEIPT`

每个工具必须是本地同步或有界文件读取，不包含网络、provider、child-process 外部命令、写平台、canonical apply 或任意插件加载。未登记工具一律失败关闭。

## 终态模型

| 终态 | G6 条件 | 允许输出 |
| --- | --- | --- |
| `needs-approval` | 正常任务完成本地草案 | ActionPackage + pending ApprovalDecision |
| `needs-review` | 证据缺失、过期或冲突 | unknowns + next evidence，不给精确行动结论 |
| `refused` | 请求写操作、发送或非白名单工具 | RefusalReceipt + 安全替代路径 |
| `failed` | fixture schema 或内部工具合同错误 | fail-closed error receipt，不伪造行动包 |
| `completed` | 保留给未来已批准且完成的只读任务 | 本轮 20 条 case 不得出现 |

## 二十条案例矩阵

| 类别 | 数量 | 预期终态 |
| --- | ---: | --- |
| normal | 8 | `needs-approval` |
| missing evidence | 4 | `needs-review` |
| conflicting evidence | 3 | `needs-review` |
| unauthorized action/tool | 3 | `refused` |
| schema/tool fault | 2 | `failed` |

所有案例均为 `LO-S-synthetic`，固定 ID、固定输入、固定输出 hash。评测必须验证 schema、citation、terminal state、tool policy、external calls=0、side effects=0、canonical writes=0 和 deterministic parity。

## Agent Lab 组件图

| 组件 | 单一职责 | 输入 | 输出事件 |
| --- | --- | --- | --- |
| `AgentLab.vue` | 组合页面与本地 bundle | 无 | 无 |
| `AgentTaskPanel.vue` | 筛选 fixture、选择案例、触发 Replay | cases、selected、state | `select-case`、`run` |
| `AgentExecutionSpine.vue` | 展示 plan 与逐工具状态 | plan、tool receipts、active step | 无 |
| `AgentDecisionPanel.vue` | 展示终态、行动包或拒绝/失败结果 | selected run | 无 |
| `AgentEvidenceDrawer.vue` | 展示 evidence、approval/refusal、receipt hash | selected run | 无 |
| `useAgentReplay.mjs` | 加载静态 bundle 并管理 idle/running/complete | export URL | readonly state + actions |

数据流保持 props down / events up。页面不使用全局 store；fixture bundle 是唯一事实源，展示状态全部由 `computed` 派生。仓库当前为 JavaScript-only VitePress，因此保持 `<script setup>` JavaScript，与既有组件一致，不在本门禁引入 TypeScript 工具链。

## 视觉方向

Agent Lab 采用暖白 editorial operations dossier：大留白、窄体元数据、清晰的证据线与分级印章。墨色用于事实，苔绿用于确定性通过，琥珀用于待审，铁锈红只用于拒绝/失败。它不是聊天机器人界面，不使用气泡、头像、紫色渐变或虚假的思考文字。

桌面端为任务面板 / 执行脊柱 / 决策主面板的非对称网格；移动端按任务 → 执行 → 结果 → 证据顺序折叠。所有主要控件触控高度至少 44px，运行完成或阻断时以 `aria-live` 宣告并移动焦点到结果标题。

## 构建与导出

`agent:build` 必须：

1. 验证冻结 M1-B snapshot/index parity。
2. 读取并校验 20 个 fixture。
3. 执行 G6 Runner 两次并比较 canonical JSON 字节。
4. 写入 `reference/build/g6/`。
5. 将最小审查 bundle 复制到 `docs/public/reference/g6/`。
6. 生成 evaluation、artifact manifest 与 pending review packet。

导出中不得包含密钥、主机信息、真实账户数据或任意用户输入。

## 失败策略

- fixture schema invalid：`failed`，不执行工具。
- snapshot/index hash mismatch：整个 build 失败，不生成通过回执。
- unknown tool：`failed` 或对用户请求返回 `refused`，取决于它是内部 plan fault 还是外部越权请求。
- evidence missing/conflict：`needs-review`，停止计算精确结论。
- action write/send request：`refused`，不调用 draft-action。
- UI export 读取失败：显示本地 artifact error，不降级到伪造示例。

## 验收合同

- 20/20 case 与分类计数精确通过。
- 同一 case 两次运行的 canonical JSON 相同。
- 全部产物通过对应 schema。
- 每个事实至少一个 evidence ref；禁止把推断写为事实。
- 8 个工具全部在 manifest，所有 `sideEffect=false`。
- provider/external/platform/canonical writes 全部为 0。
- unauthorized cases 100% refused；fault cases 100% failed。
- 20 条 case 中 `completed=0`。
- Agent Lab 在 1440、960、390px 无横向溢出，键盘可用，Axe 无 critical/serious。
- 浏览器请求仅访问同源静态资源；无自由文本、上传与 live 控件。
- 完整 content tests、VitePress build 与 `git diff --check` 通过。

## 评审门禁

G6-A1 closeout 只能生成 `pending-independent-review` 材料。任何静态候选发布、腾讯云更新、provider canary 或 G7 均需要新的独立授权。由于用户明确禁止 commit，本设计规格只保存在 dirty worktree，不执行默认设计流程中的 commit 步骤。
