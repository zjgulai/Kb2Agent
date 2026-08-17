# G6-A2-R1 本地修订与复审

> 状态：`accepted-local-remediation-pending-independent-review`  
> 证据等级：`L2-fixture-or-dry-run`  
> 复审时间：2026-08-11T11:02:25Z

## 结论

G6-A2 确认的 3 个 P1、2 个 P2 findings 已在授权的本地范围内关闭。当前结论只接受“五项 finding 已完成本地确定性修订并通过 source-locked 复审”，不等于独立人工产品接受，不授权公开发布、远端部署、真实 provider 或 production/live Agent。

## Finding 闭环

### G6A2-001 · closed

七个 `needs-review` 案例只输出“精确 ACOS 变化不可用”的 evidence-gate 事实；facts、calculation result 和顶层 evidence refs 不再泄露 28.4%、36.9% 或精确 delta。反例合同逐一覆盖七个案例。

### G6A2-002 · closed

G6 runtime 与 builder 改为依赖独立纯模块 `g6-utils.mjs`。能力合同从两个入口文件字符串扫描升级为递归遍历相对 import graph；当前图中没有 `child_process`、网络、provider 或远端执行能力。

### G6A2-003 · closed

ActionPackage schema 关联 terminal state、calculation state、inputs 与 result；AgentExecutionReceipt schema 禁止 G6 `completed` 并关联 approval/refusal/error 和 artifact hashes；ToolCallReceipt schema 关联非完成态与 errorCode。原三个矛盾对象和新增 approval/failure/tool-call 反例均被 AJV 拒绝。

### G6A2-004 · closed

Agent Lab 审计抽屉现在可直接展开 ApprovalDecision、RefusalReceipt 和八条 ToolCallReceipt，显示 required/accepted roles、call/step/tool/status/error、完整 input/output hashes 和零副作用计数，无需先下载原始 bundle。

### G6A2-005 · closed

六个移动分类按钮的最小高度由 38px 提升为 44px，并纳入 390px 触控合同。

## 复审证据

- 红灯基线：6/9；三个失败精确对应事实提升、schema 语义和传递能力审计。
- G6 focused：9/9；20/20 fixtures；终态 8/7/3/2/0。
- Agent Lab focused browser：8/8；390/960/1440px、同源、44px、Axe 和截图均通过。
- 完整 `docs:qa`：content 131/131、hydration 3/3、site 44/44、Web Vitals 通过、Lighthouse accessibility 100/100。
- 新 closeout 合同加入后最终 content 目标：136/136。
- 视觉参考回读：94/100，`pass`。新增审批/逐工具区域是预期增量，既有暖白 editorial operations dossier 品牌结构保持。

## 只读例外

完整 `docs:qa` 的既有 `docs:links` 对登记的外部文档 URL 做了只读可达性检查，OpenAI 文档返回 403。因此本门禁不声明零公网读取。没有公网 P9、SSH、provider、外部写入、Docker、生产 Agent、runtime 发布、commit 或 push。

## 证据上限

当前 reviewer 与实现仍属于同一 Codex 任务，`implementationIndependence=false`、`independenceAttestation=false`、`humanReviewAccepted=false`。下一门禁必须单独授权；在此之前，G6-A1 只能称为“本地 L2 垂直切片及五项修订通过”，不能称为独立产品验收完成或生产能力成立。
