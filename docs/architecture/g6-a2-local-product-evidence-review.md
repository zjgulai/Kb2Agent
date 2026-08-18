# G6-A2 本地产品与证据评审

> 状态：`blocked-revision-required`  
> 决策：当前 G6-A1 不接受为“已通过独立产品与证据评审”  
> 证据等级：`L2-fixture-or-dry-run`  
> 评审时间：2026-08-11T10:31:31Z

## 评审边界

本轮只审查 G6-A1 的能力面、20 个合成案例、8 个 schema、ActionPackage/Receipt 关系、Agent Lab 产品体验和已披露的公网只读例外。没有调用额外 AI reviewer/provider，没有访问远端服务器或 Docker，没有发布 runtime，也没有 commit/push。

这是同一 Codex 任务中的 source-locked 新鲜交叉审计，不是组织意义上的独立人工签名；`independenceAttestation=false`。因此，即使没有产品 findings，也不能自动伪造人类独立接受。

## 已验证事实

- G6 定向合同 7/7，通过；Agent Lab 浏览器合同 7/7，通过。
- 20 个当前生成案例的 artifact hash、run/plan/tool/approval/refusal lineage 共 160 项核对通过。
- 终态分布保持 8 `needs-approval`、7 `needs-review`、3 `refused`、2 `failed`、0 `completed`。
- Agent Lab 本地请求全部同源，浏览器 runtime error=0，390px 横向溢出=0。
- 桌面与移动截图的品牌、层级、阅读节奏和响应式结构通过本地视觉读回。
- 上述事实只证明当前产物状态，不证明 schema 能拒绝所有未来错误组合。

## 阻断 findings

### G6A2-001 · P1 · 证据被阻断后仍发布精确 ACOS 事实

七个 `needs-review` 案例的 calculation 已是 `blocked`，但 ActionPackage 仍陈述“ACOS 从 28.4% 变化到 36.9%”。其中包含缺失 spend、attributed sales、attribution window 和不可比窗口的案例。

这会把证据门禁已经否定的精确值继续当作 FACT 呈现。修订时，blocked calculation 不得生成精确 delta fact；schema 与负向合同必须覆盖缺失 spend/sales/window。

### G6A2-002 · P1 · capability audit 漏掉传递 child_process 能力

G6 Runtime 与 builder 都依赖 `reference/runtime/utils.mjs`；该模块导入 `node:child_process` 并暴露通用 `execFile` 包装器。现有能力测试只扫描两个直接文件，没有追踪本地 import graph，因此会错误通过“无 remote execution capability”。

修订时应把 G6 使用的纯 hash/JSON helper 与通用执行 helper 分离，或删除 G6 依赖图中的 child-process；测试必须覆盖全部传递本地模块。

### G6A2-003 · P1 · Schema 没有关联终态与必需回执

AJV 反例探针证明，当前 schema 会接受以下矛盾对象：

- blocked 输入改成 `resultState=exact`，但没有 exact result；
- `terminalState=completed`，但没有 approval reference；
- `terminalState=refused`，但没有 refusal reference 或 refusal artifact hash。

当前生成对象本身一致，但 schema 不能阻止未来错误提升。需要通过 `if/then` 或 `oneOf` 锁定 calculation state、completed 禁止、needs-approval/approvalRef、refused/refusalRef、failed/error 及 artifact hash 组合，并加入反例合同。

## 产品质量 findings

### G6A2-004 · P2 · Agent Lab 未展示设计承诺的完整评审证据

设计要求 `AgentEvidenceDrawer` 展示 evidence、approval/refusal 和 receipt hash。当前页面没有显示 ApprovalDecision 的 required/accepted roles，也没有逐工具的 call ID、error code、input/output hash；必须下载原始 bundle 才能审查。

建议用 progressive disclosure 补齐 ApprovalDecision/RefusalReceipt 和逐工具 ToolCallReceipt，而不是把所有 JSON 平铺到主界面。

### G6A2-005 · P2 · 移动分类按钮只有 38px

390px 实测六个分类按钮高度均为 38px，低于本项目其他主交互采用的 44px。现有触控测试没有选择 `.agent-category-tabs button`，因此漏检。

修订时把分类按钮提高到至少 44px，并纳入移动触控合同。

## 最终判定

G6-A2 有 3 个 P1 和 2 个 P2 可执行 findings，当前 decision 为 `blocked-revision-required`。G6-A1 的现有 20/20、7/7 与浏览器 7/7 仍是有效的正向 L2 证据，但不能据此宣称产品/证据评审已接受。

下一建议门禁是 **G6-A2-R1 本地修订与复审**：只修复这五项，重新生成 G6 bundle/build/review/QA artifacts，运行负向 schema 合同、G6 focused tests、Agent Lab 浏览器测试和完整本地 QA，再进行 source-locked re-review。该门禁不包含静态发布、远端操作、Docker、真实 provider、production/live Agent、commit 或 push。
