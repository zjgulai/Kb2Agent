---
title: M1-A P0-P2 执行与交叉审计回执
description: 本地候选的实现范围、验证证据、残余风险与下一门禁
outline: deep
---

# M1-A P0-P2 执行与交叉审计回执

## 最终裁决

`LOCALLY_VERIFIED_CANDIDATE / NOT_ACCEPTED / NOT_PUBLISHED`

M1-A 的 P0–P2 已在隔离 worktree 实施并通过本地确定性 QA。该裁决允许 Owner 与四角色审阅候选，不构成 commit、发布、部署、真实模型调用、领域效果证明或产品验收。

## 实施边界

| 项 | 回执 |
|---|---|
| 基线 | `7943615d70609dcceb94b1098e4211a96f0ad924` |
| 分支 | `codex/mkd-m1a-p0-p2` |
| 隔离 | 独立 worktree；原脏工作区未修改 |
| 授权 | P0 产品合同、P1 高保真本地原型、P2 Schema/fixture/本地验证 |
| 外部调用 | 0 provider calls / 0 platform calls |
| 外部副作用 | 0 writes / 0 sends / 0 deploys |
| Git/发布 | 0 commit / 0 push / 0 package publication |

## 交付面

### P0 · 产品与治理合同

- A–AA 的已确认选择、授权白名单和越权黑名单机器可读。
- Guide 与 Reference 使用独立成熟度账本。
- 支持/禁止声明与四角色占位明确；四角色仍为 `unassigned`。
- 5 个 ADR 冻结双账本、Git/SQLite、Replay-first E2、公开输入和许可证门禁。

### P1 · 产品壳与交互原型

- Home 以 Reference Lab 为主 CTA，Guide 为方法与兼容参考层。
- `/lab/` 固定为 Replay，Live、上传、任意 URL 和自由文本均不可用。
- Result 默认给 A1 行动包；A2 的 Evidence/Trace/Eval/Object Closure 渐进展开。
- 所有结果可见 `LO-S synthetic`、`local prototype`、零调用/零副作用和未验收状态。

### P2 · Reference 合同

- 18 个 JSON Schema 覆盖 L0–L6 和 ActionPackage、Trace、Receipt、Snapshot、Governance、Evaluation、Relation、ReferencePackage。
- 4 个产品注册表和 1 个 Guide 映射适配器保持成熟度分账。
- 正例包含 20 个对象、7 个类型化关系；固定 manifest hash 为 `sha256:692f2403a260070c025cf6207914a5fc321010e372c2a7ef2c8f21dba9e2bdd5`。
- 6 个负例分别阻断 locator 缺失、E3 越权、关系错型、supersedes 环、snapshot hash 错误和 Case 直接晋级 Skill。

## QA 证据

最终从头执行：

```bash
MKD_TEST_PORT=4282 npm run docs:qa
```

结果：

- Reference contracts：18 schemas / 4 registries / 1 adapter / 20 objects / 7 relations / 6 negative fixtures，通过。
- Guide 内容与身份：26/26 路由；26 content tests 通过；352 code blocks 与基线一致。
- 构建与隔离：VitePress build 通过；预览只绑定 `127.0.0.1`，非 loopback 地址被拒绝。
- 浏览器：35/35 Playwright 通过；关键响应宽度、200% zoom、搜索焦点和导航均覆盖。
- 可访问性：首页和安全页 Lighthouse accessibility 均为 100；关键表面 axe critical/serious 为 0。
- 性能：最大初始 theme chunk 250.3 KB；无外部 Google Fonts。
- 链接：72 个内部引用和 84 个外部 URL 通过；OpenAI 两类链接返回 403，只证明地址存在，内容未在本轮复核。

## 交叉审计

| 视角 | 结论 | 仍需阻断的事项 |
|---|---|---|
| 产品 | 主任务、主次用户、输出层级和非目标一致 | Owner 尚未签署 M1-A 设计接受 |
| 架构 | L0–L6、关系、版本、snapshot 与 trace 闭合 | compiler、runner、导出器属于 M1-B，尚未实现 |
| 证据 | Claim、fixture、回执语言未越过 L2 | Amazon Ads 只有 LO-S，无领域/客户证据 |
| 安全 | E2、无自由输入、无外部副作用、loopback 预览 | 腾讯云会话、限频、预算与熔断属于 M1-C |
| 许可证 | 依赖清单与项目无 LICENSE 的边界明确 | 核心许可证未选，禁止 package/container publication |
| 依赖 | Ajv/Mermaid 可修复告警已升级 | `npm audit` 仍为 3 moderate / 2 high / 0 critical，Vite/VitePress 当前无兼容修复 |
| 角色 | 职责分离已建模 | 四角色均未具名、未接受；不能判定 accepted |

## 下一门禁

M1-B 不自动开始。进入前至少需要：

1. Owner 确认或提出 Home/Lab/Result 与产品合同修改意见。
2. 明确是否单独授权 M1-B 本地 compiler/runner/export 实现。
3. 保持 provider call、真实平台、canonical write、deploy、commit、push 与 publish 继续关闭。
4. Amazon Ads 领域 reviewer 与许可证决策可继续作为阻断项，不得用工程测试替代。
