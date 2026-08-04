# MKD Guide 知识体系 G0–G2.4 审计

审计日期：2026-08-02<br>
审计对象：`docs/knowledge/*.md`、首页内容加载器、知识体系注册表与本地 QA 门禁<br>
结论边界：本报告证明本地 G0/G1 实现与复核结果，不证明外部事实已全部复核、生产系统已运行或网站已部署。

## 审计结论

| 问题 | 本轮判定 | 证据 |
|---|---|---|
| 内容计量是否可信 | 已关闭 G0 | AST visitor 根因已修；固定 fixture 回归；逐页 baseline 对账通过 |
| 文档身份是否稳定 | 已关闭 G1 | 26/26 `docId`、显示编号、路由、学习顺序唯一且注册表一致 |
| 重复“第八章”是否消除 | 已关闭 G1 | 工具手册改为附录 B；原 URL 与旧 H1 锚点保留 |
| 章节链接是否语义一致 | 已关闭 G1 | 4 处错配已修；49 个知识链接可解析，20 个章节标签与目标编号一致 |
| 核心术语是否有统一入口 | G2.3 首批语义图完成 | 13 个 canonical concepts、22 个 aliases、13 个首次定义与 13 个跨章使用样本 |
| 成熟度升级是否有机器验收门禁 | G2.4 三章试点完成 | 3 个契约、12 个固定用例、8 个负例、3/3 本地可复放、0/3 accepted |
| 内容是否已全面可运行/可验收 | 未达到 | 仅 2/26 页面具备 smoke evidence，0/26 达到 acceptance |

## G0：真实计量基线

### 根因

旧实现使用了形如 `visit(tree, 'code', node => codeBlocks.push(node))` 的回调。`Array.push()` 返回数组长度；`unist-util-visit` 会把数字返回值解释为下一遍历索引，因此遍历路径被改变，最终将代码块和链接数量虚增为 2,107 / 182。标题回调使用了花括号，没有返回数字，所以 H2/H3 数量没有受到同一缺陷影响。

修复后的遍历统一收敛到 `scripts/markdown-metrics.mjs`，回调显式不返回值；固定 Markdown fixture 同时验证节点数、行号、链接文本和代码语言。

### 基线事实

| 指标 | 真实值 |
|---|---:|
| 页面 | 26 |
| H1 / H2 / H3 / H4 | 26 / 257 / 443 / 6 |
| 代码块 | 352 |
| Markdown 链接节点 | 161 |
| 内部路径 / 页内锚点 | 43 / 18 |
| 外链出现次数 / 唯一外链 | 100 / 83 |
| 外链联系协议 | 0 |

代码语言分布为：Python 175、text 60、Bash 51、未标注 26、Mermaid 25、YAML 8、JSON 4、txt 2、SQL 1。逐页明细固化在 `knowledge-system/audit-baseline.json`；任何变化都必须先解释内容差异，再显式更新基线。

## G1：文档身份契约

四个字段承担不同职责，后续不得再互相推导：

| 字段 | 职责 | 稳定性规则 |
|---|---|---|
| `docId` | 文档的稳定语义身份 | 标题、路由、顺序改变时也不改 |
| `displayNumber` | 读者看到的章节或附录编号 | 只表达出版编号，不表达文件名或阅读顺序 |
| `route` | 当前公开 URL | 变更必须提供兼容路由；G1 全部保留 |
| `learningOrder` | 推荐学习路径 | 可独立调整，不改变章节身份 |

迁移期保留 `chapter` 与 `order`，门禁强制它们分别镜像 `displayNumber` 与 `learningOrder`；所有消费端完成迁移前不会删除 legacy 字段。

### 26 个文档的唯一身份

| 学习序 | 显示编号 | docId | 保留路由 |
|---:|:---:|---|---|
| 0 | 00 | KS-INTRO | `/knowledge/00-introduction` |
| 1 | 01 | KS-FRAMEWORK-DIKW | `/knowledge/01-framework` |
| 2 | 02 | KS-DECISION-MATRIX | `/knowledge/02-decision-matrix` |
| 3 | 21 | KS-DATA-COLLECTION | `/knowledge/21-data-collection` |
| 4 | 03 | KS-SCENE-SOPS | `/knowledge/03-scene-sops` |
| 5 | 04 | KS-ARCHITECTURE | `/knowledge/04-architecture` |
| 6 | 05 | KS-SECURITY-COMPLIANCE | `/knowledge/05-security-compliance` |
| 7 | 06 | KS-GRAPHRAG | `/knowledge/05-graphrag` |
| 8 | 07 | KS-AGENT-MCP | `/knowledge/06-agent-call` |
| 9 | B | KS-TOOLS-APPENDIX | `/knowledge/08-tools-appendix` |
| 10 | 08 | KS-LOD-THEORY | `/knowledge/07-advanced-theory` |
| 11 | 09 | KS-REASONING | `/knowledge/09-reasoning-models` |
| 12 | 10 | KS-COST-MODEL | `/knowledge/10-cost-model` |
| 13 | 11 | KS-SKILL-DISTILLATION | `/knowledge/09-skill-distillation-deep-dive` |
| 14 | 12 | KS-E2E-PIPELINE | `/knowledge/10-e2e-pipeline` |
| 15 | 13 | KS-KB-EVOLUTION | `/knowledge/11-kb-evolution` |
| 16 | 23 | KS-FT-VS-RAG | `/knowledge/23-finetuning-vs-rag` |
| 17 | 14 | KS-EVALUATION | `/knowledge/12-evaluation` |
| 18 | 15 | KS-PROMPTS | `/knowledge/15-codex-prompts` |
| 19 | 16 | KS-VOC-CASE | `/knowledge/16-voc-case-study` |
| 20 | 17 | KS-FAILURE-CASES | `/knowledge/17-failure-cases` |
| 21 | A | KS-VALIDATION-FRAMEWORK | `/knowledge/appendix-validation` |
| 22 | 18 | KS-TECH-SELECTION-I | `/knowledge/18-tech-selection-2026` |
| 23 | 19 | KS-TECH-SELECTION-II | `/knowledge/19-tech-selection-vol2` |
| 24 | 20 | KS-OPS-RUNBOOK | `/knowledge/20-ops-runbook` |
| 25 | 22 | KS-AGENT-DESIGN | `/knowledge/22-agent-design` |

这张表刻意展示了“学习序不等于显示编号”：例如第 21 章数据采集是第 4 个学习入口，第 23 章 FT vs RAG 是第 17 个入口。文件名也不再承担出版编号；例如 GraphRAG 继续保留 `/05-graphrag` 路由，但显示为第 6 章。

## 语义链接整改

| 来源 | 原问题 | 修复 |
|---|---|---|
| 导论 | “第 5 章安全合规”错误指向 GraphRAG | 指向 `/knowledge/05-security-compliance` |
| 导论 | “第 10 章成本模型”错误指向 E2E Pipeline | 指向 `/knowledge/10-cost-model` |
| VOC 案例 | 链接标签写“第 7 章架构选型”，目标实际为第 8 章 | 标签改为第 8 章 |
| Agent 设计 | 链接标签写“第 6 章 Agent + MCP”，目标实际为第 7 章 | 标签改为第 7 章 |

`docs:semantic-links` 解析链接文本中的中文、阿拉伯数字及附录编号，再与目标页面 `displayNumber` 比较；它与普通存在性链接检查相互独立。

## 概念注册表与使用图边界

首版注册了 Knowledge System、DIKW、LoD、RAG、GraphRAG、MCP、Agent、Skill Distillation、Evidence Maturity、VTRCE、Evaluation Gate、Knowledge Evolution、Fine-tuning vs RAG。

G2.3 后注册表能保证：概念 ID 与 usage ID 唯一、术语/别名不跨概念冲突、canonical document 存在、13 个首次定义与 13 个跨章语义样本可定位、26 条前置边无环、8 对不可混同和 31 对相关导航保持双向一致。7 个发生在定义文档之前的学习序线索均已回链定义，未回链数量为 0。

该图仍采用 `reviewed-semantic-sample` 边界。词面扫描观察到 97 个概念/文档线索，其中 71 个尚未迁移；因此它不能证明全文每次使用都符合定义，也不能证明学习者真正理解了概念。

## 内容成熟度未被本轮抬高

| 成熟度/验证状态 | 数量 | 审计解释 |
|---|---:|---|
| 原理 | 2 | 只有问题和边界，不构成工程闭环 |
| 方案 | 22 | 有结构或参考实现，但证据不足 |
| 可运行 | 2 | 仅成本 fixture 与 mock Pipeline 有 smoke evidence |
| 可验收 | 0 | 三章已有固定集、负例和本地回归，但缺业务授权、批准阈值、责任接受与最终回执 |
| pending | 24 | 92.3% 页面仍明确显示待复核 |

G0/G1 只提高了测量与身份治理能力，没有把“页面结构正确”误写成“内容事实已验证”。

## 离下一阶段落地的距离

| 缺口 | 当前事实 | 距离 | G2 验收定义 |
|---|---|---|---|
| Claim 级证据 | 3/26 页面已有 12 条 claim 与四角色责任链，其余仍主要按整页管理 | 大 | 每个易漂移断言有稳定 claimId、类型、来源、asOf、适用边界与状态 |
| 可运行实验 | 2/26 页面有整页 smoke evidence；另有安全与评估断言级 L2 fixture；352 个代码块中多数为示意 | 大 | 高价值路径抽成可重复 Lab，输出 JSON 回执并回链页面 |
| 可验收体系 | 3/26 有机器契约，3/3 本地可复放，0/3 accepted | 大 | 固定集、负例、阈值、回归差异、责任接受和最终回执同时满足 |
| 外部事实治理 | 83 个唯一外链；24 页 pending | 大 | 一手来源、owner、复核日期、失效日期与内容摘要结构化 |
| 概念使用图 | 13 个定义、13 个跨章样本、26 条前置边、8 对不可混同；71 个词面线索未迁移 | 中 | 逐项判定未迁移线索，并以学习任务验证前置关系 |
| 学习路径有效性 | 先修关系是审计假设 | 中 | 用任务完成率、前后测或错误类型验证路径，而非只看阅读顺序 |
| 危险操作证明 | Runbook 有静态保护步骤 | 大 | 一次性环境完成备份、dry-run、执行、恢复和观察窗回执 |

## 建议的 G2 执行批次

1. **G2.1 Claim Schema 与试点（已完成）**：安全合规、成本模型、质量评估三章已定义 12 条关键断言与稳定回链。
2. **G2.2 责任链与首批 Lab（已完成）**：三章已建立四角色责任链；成本、安全控制与最小评估路径具备 L2 fixture，真实责任接受和生产证据继续阻断。
3. **G2.3 概念使用图（已完成首批语义样本）**：13 个概念具备 `definedIn`、`usedIn`、`prerequisiteOf`、`conflictsWith`，首次定义、较早提及回链与跨章用法进入门禁。
4. **G2.4 验收契约（已完成三章试点）**：机器注册表与 `docs:acceptance` 已把固定集、阈值、负例、回归差异、责任接受和最终回执绑定到成熟度升级。
5. **G2.5 学习与检索验证**：为 10–15 个核心问题建立黄金查询集，检查首页搜索结果、推荐路径和零结果；再用任务成功率修正 `learningOrder`。

下一批应进入 G2.5 学习与检索验证：建立版本化黄金查询，检查搜索排名、推荐路径与零结果，再以任务成功率验证 `learningOrder`。RAG、Agent、GraphRAG、MCP 的高扇出词面线索和 G2.4 的组织审批阻断仍需并行推进。

## 本轮新门禁回执

- `docs:metrics`：baseline v4 对账通过，26 页 / 265 H2 / 352 代码块 / 167 链接。
- `docs:identity`：26/26 文档注册，路由保留，身份与先修关系通过。
- `docs:concepts`：13 个概念、22 个别名、13 个首次定义、13 个跨章使用、26 条无环前置边、8 对不可混同、31 对导航；7 个较早线索已回链、0 个未回链。
- `docs:acceptance`：3 个契约、12 个固定用例含 8 个负例；3/3 本地可复放、0/3 accepted；四类审批 blockers 均被重新计算。
- `docs:audit`：265 H2、443 H3、0 error、0 warning。
- `docs:semantic-links`：49 个知识链接解析；20 个带章节标签的链接一致。
- `docs:build` + `docs:headings`：完整构建通过，源/HTML 标题 26/26 对账。
- `docs:preview-isolation`：静态预览绑定 127.0.0.1；首页/概念页/404/405 通过；非回环 IPv4 地址拒绝连接。
- `docs:lighthouse`：两个关键页面 Accessibility 100。
- `test:content`：23/23；新增无负例、伪批准、伪 accepted、页面越级和候选退化门禁。
- `test:site`：Chromium 11/11；新增验收工作台、跨页 hash、390px disclosure 与 axe 门禁。

## 未执行事项

没有部署、推送、合并、发布、真实数据导入、供应商生产调用、数据库写入或生产操作；没有修改或清理 `.omo/run-continuation` 和 `example/` 的既有用户状态。

## G2.1 Claim-level Evidence 试点

G2.1 没有批量迁移 26 章，只选择安全合规、成本模型与质量评估三个高风险页面。G2.1 完成时登记了 12 条断言、5 个来源与 4 个本地证据；每页通过 `claimRefs`、稳定正文锚点与可见 `ClaimLedger` 形成双向回链。

| 证据等级 | 数量 | 当前允许解释 |
|---|---:|---|
| L0 未验证 | 3 | 只有限制和下一动作，不得升级成熟度 |
| L1 一手公开 / 只读观察 | 6 | 证明公开来源或当前仓库事实，不证明实施完成 |
| L2 Fixture / Dry-run | 3 | 证明固定输入与本地测试，不证明生产表现 |
| L3 生产只读 | 0 | 本轮没有生产观察 |
| L4 授权在线 | 0 | 本轮没有在线执行 |

新增 `docs:claims` 检查 claim 身份、页面引用、锚点邻接和可见账本；新增 `docs:evidence` 检查来源、本地路径、状态到等级映射以及 anti-promotion。G2.1 快照中的 12 条断言 owner 均为空；该缺口已在 G2.2 转化为角色映射与具名接受两层状态。

详细矩阵、允许/禁止解释与当前视觉审计见 `g2-1-claim-pilot-audit.md`。页面级成熟度没有变化：0 个 acceptance，24 个 pending 的总账仍成立。

## G2.2 Ownership 与 L2 Evidence

`claims.yml` 已升级到 schema v2.0，新增 12 个文档级 owner roles，并要求每条 claim 同时引用内容维护、证据复核、测试维护、最终批准四个互相独立的角色。当前 0 个映射缺口、12 个具名 assignee 待认领、0 个角色已接受；`authorized-live` 状态还会额外要求四角色全部 accepted，防止角色占位被解释为授权。

三条原 L0 断言已由新证据提升到 L2：安全演练数据边界、安全期限示例边界、最小评估回归合同。当前 12 条断言的证据分布为 L1=6、L2=6、L0/L3/L4=0；8 个 evidence records 中没有生产观察或授权在线回执。

专项设计、门禁、允许与禁止解释见 `g2-2-ownership-evidence-audit.md`。该增量不改变 26 页成熟度总账，也不构成具名责任接受、法律意见、真实安全演练、真实模型评估或生产验收。

## G2.3 Concept Usage Graph

`concepts.yml` 已升级到 schema v2，且与正文稳定锚点、附录 A 的 `ConceptMap` 和内容测试使用同一数据源。当前 13/13 概念各有首次定义与跨章用法；`canonicalDocument` 与 `definedIn` 分离，允许专题页晚于首次解释而不破坏学习路径。

词面覆盖仍是最主要边界：97 个概念/文档线索中，26 个落在当前定义/使用文档，71 个尚未逐项审查。RAG 与 Agent 各覆盖 22 个文档，是后续迁移的最高优先级。当前 7 个发生在更早学习序的线索均显式回链定义，0 个无回链。

该增量没有改变页面成熟度、claim 证据等级或 owner 接受状态。完整矩阵、失败关闭规则、视觉回执与下一批阻断见 `g2-3-concept-usage-graph-audit.md`。

## G2.4 Machine-checkable Acceptance Contract

`acceptance.yml` 以 `repository-content` 为唯一验收范围，覆盖安全、成本、评估三章。每个契约都固定数据集身份与 SHA-256、基线回执与 SHA-256、passRate/externalCalls/sideEffects 三类阈值、四角色责任链和最终回执状态；任何契约即使最终 accepted，也必须保持 `productionReady: false`。

三套集合合计 12 个合成用例、8 个负例。当前候选全部复放通过，三项基线差异均为 0.0 pp，外部调用和副作用均为 0；这只支持 L2 本地可复放。因为数据集未获业务授权、9 条阈值仍为 illustrative、12 个角色 0 accepted、最终回执 0/3，三个契约都计算为 `approval-blocked`。

`docs:acceptance` 会校验摘要、用例类别、基线身份、候选差异、阈值结果、owner 职能、审批证据和页面 frontmatter；页面或注册表提前声称 accepted 会失败关闭。完整允许/禁止解释、浏览器证据和下一批见 `g2-4-acceptance-contract-audit.md`。该增量没有提升任何页面成熟度或生产状态。
