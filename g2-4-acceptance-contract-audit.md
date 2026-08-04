# MKD Guide G2.4 机器可验收契约审计

审计日期：2026-08-02<br>
审计范围：安全合规、成本模型、质量评估三章的仓库内容验收契约<br>
判定：`allowed-with-label`

允许描述为“三个试点已具备锁定集合、负例、本地阈值复放和基线差异检查”；不允许描述为“三章已验收”、业务数据已授权、阈值已批准或生产已经就绪。

## 本轮完成

- 新增 `knowledge-system/acceptance.yml` 与 Draft 2020-12 schema；验收范围固定为 `repository-content`，每个契约强制 `productionReady: false`。
- 三个试点各绑定唯一 `acceptanceRef`、稳定数据集身份、SHA-256、基线回执、三类阈值、四角色责任链和最终回执状态。
- 状态由门禁重新计算为 `draft-invalid → regression-blocked → approval-blocked → accepted`，YAML 申报值与计算结果不一致会失败。
- `docs:acceptance` 校验固定集合、至少一个正例和负例、数据集与回执摘要、L2 边界、阈值复放、基线差异、owner 接受和页面成熟度。
- 附录 A 与三个试点页面使用同一 `AcceptanceWorkbench` 数据源；组件没有复制接受状态或伪造审批日期。
- `docs:qa` 已插入 `docs:acceptance`，本地 fixture 语法门禁从 6 个增加为 7 个。

## 三个契约的实测矩阵

| 契约 | 固定用例 | 负例 | 本地复放 | 基线差异 | 责任接受 | 计算状态 |
|---|---:|---:|---:|---:|---:|---|
| `ACC-SECURITY-001` | 5 | 3 | 5/5 | 0.0 pp | 0/4 | `approval-blocked` |
| `ACC-COST-001` | 4 | 3 | 4/4 | 0.0 pp | 0/4 | `approval-blocked` |
| `ACC-EVALUATION-001` | 3 | 2 | 3/3 | 0.0 pp | 0/4 | `approval-blocked` |

合计 12 个本地合成用例、8 个负例、0 次外部调用、0 个外部副作用。三个固定集合和三个基线回执都有登记摘要；当前候选按同一 runner 复放后均未观察到通过率退化。

## 四类共同阻断

三个契约都由机器计算出以下阻断，不是人工备注：

1. `DATASET_NOT_BUSINESS_AUTHORIZED`：当前集合都是合成 fixture，不是获授权业务数据。
2. `THRESHOLDS_NOT_APPROVED`：9 条阈值均能在本地通过，但状态仍是 `illustrative`，没有批准回执。
3. `OWNER_ACCEPTANCE_INCOMPLETE`：12 个角色均为 `role-mapped`，没有具名 assignee 或接受回执。
4. `FINAL_RECEIPT_MISSING`：没有最终仓库内容验收回执。

因此当前 3/3 契约为“本地可复放”，0/3 为“已验收”；页面总账继续保持 2 runnable、22 solution、2 principle、0 acceptance 与 24 pending。

## 失败关闭规则

当前门禁会阻断：

1. 重复或错误格式的契约、数据集、阈值、回执、文档和角色 ID；
2. 路径越出仓库、JSON 不可解析、SHA-256 漂移或 runner/数据版本不一致；
3. 固定集合没有正例、没有负例、case ID 重复或基线 case 顺序漂移；
4. 基线不是完整 L2 本地通过、出现外部调用/副作用、候选用例失败或通过率下降；
5. 三类阈值缺失、同一指标重复、实测不通过，或“已批准”但没有回执；
6. owner 不属于目标文档、四种职能不完整、阈值批准人不在责任链；
7. 数据集自称业务授权但没有证据，或最终回执自称已签发但无法解析；
8. 页面将 `maturity` 提升为 `acceptance`、却没有同时达到 `acceptance-tested` 和计算态 `accepted`；
9. 注册表申报状态、决策或 blockers 与机器计算结果不一致。

内容测试显式构造了无负例集合、无证据阈值批准、伪造 accepted 状态、页面提前升级和候选退化五类反例。

## 界面与浏览器证据

- 桌面截图：`artifacts/g2-4-design-audit/acceptance-workbench-desktop.png`
- 移动截图：`artifacts/g2-4-design-audit/acceptance-workbench-mobile.png`
- 桌面为两列摘要，展开卡横跨全宽；390px 为单列，summary 触控区域至少 44px，页面无横向溢出。
- 鼠尾草绿只标识已观察到的 L2 本地复放通过；“审批受阻”、示意阈值、0/4 owner 和四类 blockers 使用警示色。
- Chromium 验证 3 张卡、评估契约 3 例/2 负例、100% 本地复放、0.0 pp 差异、4 个 blockers、跨页 hash 与移动重排。
- 首次新增浏览器用例因中文 hash 在 URL 中百分号编码而失败；页面跳转正确。断言改为解码后核对语义 hash，完整浏览器复跑 11/11 通过。

## 允许与禁止解释

### 允许

- 允许说三个试点都有机器可检查的仓库内容验收契约，12 个固定本地用例全部复放通过。
- 允许说 8 个负例、基线摘要、当前候选与 0.0 pp 差异都进入失败关闭门禁。
- 允许说本地复放的最高证据等级是 L2，当前 3 个契约都被审批条件阻断。

### 禁止

- 不得说三个章节已经验收、已经上线或生产可用。
- 不得把合成 fixture 说成获授权业务数据，把本地示意阈值说成业务批准阈值。
- 不得把角色映射说成具名责任接受，也不得由代码生成最终批准事实。
- 不得把 0 次外部调用推断为真实模型、数据库、安全演练或账单已经验证。

## 下一阶段

G2.5 应建立 10–15 个版本化黄金查询，验证首页搜索排名、推荐路径、零结果和错误类型；学习顺序只能在任务完成率、前后测或错误分布证据出现后调整。与此同时，G2.4 的组织阻断只能由获授权业务数据、批准阈值、具名责任接受和最终回执解除，不能由更多本地代码替代。

## 范围声明

本轮没有部署、推送、合并、生产调用、真实数据导入、远程写入或自然人代签；没有修改或清理 `.omo/run-continuation` 与 `example/` 的既有用户状态。
