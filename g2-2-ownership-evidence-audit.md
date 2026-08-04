# MKD Guide G2.2 责任链与 L2 证据审计

审计日期：2026-08-01<br>
审计范围：安全合规、成本模型、质量评估三章的 12 条关键断言<br>
判定：`allowed-with-label`

允许展示角色责任链和 L1/L2 证据状态；不允许把角色映射解释为自然人接受、把 fixture 解释为真实演练或生产验收。

## 本轮完成

- `knowledge-system/claims.yml` 从 schema v1.0 升级到 v2.0，新增 `ownerRoles` 与每条 claim 的四角色 `ownership`。
- 三章分别建立内容维护、证据复核、测试维护、最终批准角色，共 12 个角色；12/12 claim 映射完整，且四角色不可复用以保证职责分离。
- 角色状态机为 `role-mapped → assigned → accepted`。进入 `accepted` 必须同时具备具名 assignee、接受日期和 `acceptance-receipt`；仓库不能自动生成这些事实。
- 新增安全治理 fixture/test 与评估回归 fixture/test，原 3 条 L0 断言均提升至 L2。
- ClaimLedger 展示“4/4 角色已映射 · 0/4 已接受”，展开后可查看四类职责；具名认领前持续使用警示态。
- Playwright 使用独立 4174 测试端口且禁止复用既有服务器，避免人工静态预览造成旧 hash 资产假红。

## 责任链矩阵

| 文档 | 内容维护 | 证据复核 | 测试维护 | 最终批准 | 当前状态 |
|---|---|---|---|---|---|
| 安全合规 | `ROLE-SEC-CONTENT` | `ROLE-SEC-EVIDENCE` | `ROLE-SEC-TEST` | `ROLE-SEC-APPROVER` | 4/4 role-mapped；0/4 accepted |
| 成本模型 | `ROLE-COST-CONTENT` | `ROLE-COST-EVIDENCE` | `ROLE-COST-TEST` | `ROLE-COST-APPROVER` | 4/4 role-mapped；0/4 accepted |
| 质量评估 | `ROLE-EVAL-CONTENT` | `ROLE-EVAL-EVIDENCE` | `ROLE-EVAL-TEST` | `ROLE-EVAL-APPROVER` | 4/4 role-mapped；0/4 accepted |

角色 ID 表示组织职责槽位，不代表任何自然人已经被指定、知情或接受责任。

## L0 → L2 晋级矩阵

| Claim | 原状态 | 新状态 | 新增直接证据 | 证据边界 |
|---|---|---|---|---|
| `CLM-SEC-003` | L0 / pending | L2 / fixture-verified | `fixtures/security-governance.mjs`、`tests/content/security-governance.test.mjs` | 只证明本地 admission 会拒绝 production 标签、非隔离环境和缺失授权的最小化样本；没有真实数据或真实演练 |
| `CLM-SEC-004` | L0 / pending | L2 / fixture-verified | 同一安全 fixture/test | 只证明 180/365 天、48 小时、30 天保持 illustrative，缺生产字段时失败关闭；没有法定或组织批准效力 |
| `CLM-EVAL-004` | L0 / pending | L2 / fixture-verified | `fixtures/evaluation-regression.mjs`、`tests/content/evaluation-regression.test.mjs` | 只证明三用例 mock provider 合同覆盖回答、拒答、解析失败和退化阻断；不运行 RAGAS 或真实模型 |

最终分布：L0=0、L1=6、L2=6、L3=0、L4=0。L2 的新增不改变安全章和评估章的 `maturity: solution` / `verification: pending`。

## 允许解释

- 允许说三章的 12 条 claim 都已绑定四类职责槽位，且机器门禁可发现缺失、跨文档引用、职能错配和职责复用。
- 允许说新增安全与评估 fixture 在本地、零外部副作用边界内可复现，相关三条 claim 支持 L2。
- 允许说候选评估结果丢失所需 evidence 时，回归比较会返回 `regression-blocked`。
- 允许说 `authorized-live` 仍需要授权在线回执，并要求四类角色全部进入 `accepted`。

## 禁止解释

- 不得说 12 个角色已经有人负责、已经批准或已经完成 RACI 签署。
- 不得说本轮执行过真实攻击演练、接触过生产数据、验证过销毁流程或确定了适用法定期限。
- 不得说 RAGAS、OpenAI、真实向量库或任何供应商模型已经运行。
- 不得把 L2 fixture 解释为 L3 生产观察、L4 授权执行、法律合规、预算批准或整章 acceptance。
- 不得因为 3 条 L0 清零而批量提升页面成熟度；其余正文代码仍按各页 frontmatter 的边界解释。

## 门禁回执

| 命令 | 当前结果 |
|---|---|
| `npm run docs:claims` | 12 claims / 12 roles / 0 claim mapping gaps / 12 named assignees pending / 0 accepted |
| `npm run docs:evidence` | L0=0、L1=6、L2=6、L3/L4=0；反越级检查通过 |
| `npm run docs:snippets` | 6 个 fixture 语法门禁通过 |
| `npm run test:content` | 16/16 通过；覆盖虚假 owner acceptance 和 authorized-live 越级拒绝 |
| `npm run docs:build` | VitePress 完整构建通过 |
| `npm run test:site` | Chromium 9/9；责任链、390px 重排、axe 与性能门禁通过 |
| `npm run docs:qa` | 最终从头串行执行退出 0；16/16 内容测试、26/26 标题对账、Accessibility 100/100、最大初始 JS 147.6KB |

完整串行门禁和瞬态失败说明以 `qa-receipt.md` 为准。

## 未解决阻断与下一证据

1. **具名责任未接受**：需要组织提供 12 个角色的 assignee；每个角色必须独立留下接受回执，不能由代码或本文代签。
2. **安全证据仍是 L2**：需要辖区、数据类别、合同依据、批准威胁模型、获授权样本、隔离演练和销毁回执，才能讨论更高等级。
3. **评估证据仍是 L2**：需要获授权的版本化业务数据集、业务负例、批准阈值、锁定模型/依赖和真实回归回执。
4. **覆盖仍是试点**：其余 23 章尚未迁移到 claim/ownership v2.0，不能从本试点推断全站断言都已完成责任治理。
5. **生产边界未变化**：本轮没有部署、推送、合并、真实数据导入、外部模型调用或生产操作。
