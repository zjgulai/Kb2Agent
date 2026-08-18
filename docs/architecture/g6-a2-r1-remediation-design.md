---
title: G6-A2-R1 本地修订与复审设计
description: 五项 accepted findings 的最小修复、反例合同与 source-locked 复审边界
outline: deep
---

# G6-A2-R1 本地修订与复审设计

> 状态：`approved-local-remediation-design`  
> 授权日期：2026-08-11  
> 证据上限：`L2-fixture-or-dry-run`

## 决策与范围

用户已在 G6-A2 明确收到五项 finding 和精确的下一门禁建议，并以“同意下一门禁，开始执行”批准 G6-A2-R1。采用最小修复方案：保持二十条 fixture、终态分布、八工具白名单、Agent Lab 页面结构和历史 G6-A2 blocked 证据不变，只修复 `G6A2-001` 至 `G6A2-005`。

不采用两种扩张方案：一是不删除 `needs-review` ActionPackage，因为 unknowns、next evidence 与明确阻断结论仍有审查价值；二是不复制整套 runtime，因为只需把 G6 所需的 hash/JSON helper 隔离到无 `child_process` 的纯模块。

## 运行时与 schema

1. `needs-review` ActionPackage 只陈述“精确 ACOS 变化不可用”的 evidence-gate 事实；不得出现 28.4%、36.9% 或精确 delta，calculation 固定为 `blocked` 且没有 `result`。
2. G6 runtime、builder 与定向测试直接依赖纯 `g6-utils.mjs`。能力合同递归遍历相对 import graph，任何传递 `child_process`、网络、provider 或远程执行能力都失败关闭。
3. ActionPackage schema 关联 terminal state 与 calculation：`needs-approval` 只能是带 result 的 exact calculation；`needs-review` 只能是无 result 的 blocked calculation，并禁止百分比精确事实。
4. AgentExecutionReceipt schema 禁止 G6 `completed`，并关联：
   - `needs-approval` / `needs-review` 必须有 `approvalRef`、ActionPackage 和 ApprovalDecision hashes；
   - `refused` 必须有 `refusalRef` 与 RefusalReceipt hash；
   - `failed` 必须有 `error`；
   - 各终态禁止携带相互矛盾的引用或 artifact hash。
5. ToolCallReceipt 的 `completed` 禁止 `errorCode`；`blocked`、`skipped`、`failed` 必须有 `errorCode`。

## Agent Lab 组件图

| 组件 | 单一职责 | 本轮修改 |
| --- | --- | --- |
| `AgentLab.vue` | 页面组合与本地 bundle 接线 | 不改 |
| `AgentTaskPanel.vue` | 案例筛选、选择与 Replay 触发 | 分类按钮 `min-height` 提升为 44px |
| `AgentEvidenceDrawer.vue` | 审批、拒绝、工具与总回执的渐进披露 | 新增 Approval/Refusal 与 ToolCallReceipt `<details>` |
| `useAgentReplay.mjs` | bundle 加载与回放状态 | 不改 |

`run` 和 `bundle` 继续作为只读 props；不引入全局状态、双向绑定、新 composable 或外部请求。逐工具列表使用稳定 `callId` 作为 key，hash 既提供完整 `<code>` 文本也提供可读短显示。

## 失败关闭与回归合同

- 先加入反例：blocked exact fact、exact-without-result、completed receipt、缺失 approval/refusal/error 引用、传递 capability、38px 触控目标和 UI 证据缺失；旧实现必须红灯。
- 修复后重建全部二十条 artifacts，两次 canonical JSON 必须相同，终态仍为 8/7/3/2/0。
- Agent Lab 必须能直接审查 required/accepted roles、RefusalReceipt、八条 ToolCallReceipt 的 call/status/error/input/output/effects。
- 浏览器只允许 loopback same-origin；不执行公网 P9，不调用 provider，不访问远端或 Docker。
- G6-A2 blocked review、receipt 和 report 保持历史不可变；G6-A2-R1 使用独立 manifest/review/receipt 命名空间记录复审。
- 通过只支持“G6-A2 五项 finding 已在本地 L2 证据中关闭”；不支持独立人工接受、公开发布、production/live Agent 或真实业务效果。

## 验收门禁

1. 新反例合同全部通过，且三个原 AJV 矛盾对象全部拒绝。
2. G6 focused tests、Agent Lab browser、全量 content/build/site QA 通过，既有阈值不放宽。
3. 390/960/1440px 无横向溢出；390px 分类按钮及主要控件均不小于 44px；Axe 无 critical/serious。
4. 新旧截图做结构回归，审批/逐工具区域作为预期增量；无独立视觉参考时不伪造像素级品牌接受。
5. 新 source manifest 逐文件读回一致，effect ledger 全零，next gate 保持未授权。

由于用户明确禁止 commit/push，本规格和实现只保存在 dirty worktree，不执行 brainstorming 默认流程中的 commit 步骤。
