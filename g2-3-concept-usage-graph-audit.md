# MKD Guide G2.3 概念使用图审计

审计日期：2026-08-01<br>
审计范围：13 个核心概念、26 个定义/使用节点、概念工作台与自动门禁<br>
判定：`allowed-with-label`

允许把当前结果描述为“13 个核心概念已经建立可定位、可导航、可阻断错误关系的首批语义图”；不允许描述为“全文概念图已经穷尽”或“学习路径已被真实用户验证”。

## 本轮完成

- `knowledge-system/concepts.yml` 从 schema v1 升级为 v2；新增 `definedIn`、`usedIn`、`prerequisiteOf`、`conflictsWith` 与关系语义声明。
- 13/13 概念各有一个正文内首次定义锚点和一个跨文档语义使用样本；定位同时校验文档 ID、稳定锚点、邻近文本与学习顺序。
- 前置图包含 26 条有向边，并以环检测失败关闭；“不可混同”包含 8 对对称关系；普通相关导航包含 31 对对称关系。
- 术语/别名仍为 13 个 canonical concepts、22 个 aliases；术语或别名不得被两个概念共同拥有。
- 发现并修正 DIKW 的“三层”漂移：正文现在明确区分 Data、Information、Knowledge、Wisdom 四层，并说明 DIKW 不是 LoD 工程加工步骤。
- 对 7 个发生在定义文档之前的词面提及增加直达首次定义的回链；当前未解决的“无定义先用”学习序缺口为 0。
- 附录 A 新增数据驱动 `ConceptMap`：展示首次定义、专题页、跨章使用、学习后续、不可混同与相关导航；移动端为单列 disclosure，不压缩成宽图或不可读表格。
- 概念卡使用既有 Phosphor `PhCaretDown` 图标；状态色保持中性墨蓝，不借用“已验证”鼠尾草绿，避免把结构关系误读为证据成熟度。

## 13 个概念的首批语义节点

| 概念 | 首次定义 | 跨章使用样本 | 前置后续 | 不可混同 |
|---|---|---|---:|---:|
| Knowledge System | 00 导论 | 13 知识库演进 | 4 | 1 |
| DIKW | 01 认知框架 | 08 LoD 理论 | 2 | 1 |
| LoD | 01 认知框架 | 08 LoD 理论 | 4 | 1 |
| RAG | 02 决策矩阵 | 06 GraphRAG | 4 | 4 |
| GraphRAG | 02 决策矩阵 | 06 GraphRAG | 2 | 1 |
| MCP | 02 决策矩阵 | 07 Agent + MCP | 1 | 1 |
| Agent | 00 导论 | 01 认知框架 | 3 | 1 |
| Skill Distillation | 01 认知框架 | 11 Skill 蒸馏 | 1 | 1 |
| Evidence Maturity | 00 导论 | 14 质量评估 | 3 | 1 |
| VTRCE | 14 质量评估 | 附录 A | 1 | 2 |
| Evaluation Gate | 14 质量评估 | 附录 A | 1 | 1 |
| Knowledge Evolution | 13 知识库演进 | 附录 A | 0 | 0 |
| Fine-tuning vs RAG | 23 FT vs RAG | 附录 A | 0 | 1 |

`canonicalDocument` 与 `definedIn` 被刻意分开：前者是专题维护入口，后者是学习序中的首次解释。例如 Agent 的专题页是第 22 章，但首次定义位于导论；GraphRAG 的专题页是第 6 章，首次边界定义位于第 2 章决策矩阵。

## 词面覆盖与证据边界

只读扫描观察到 97 个“概念 × 文档”词面线索：26 个位于当前登记的定义/使用文档，71 个位于尚未迁移的其他文档。当前 `coverageMode` 固定为 `reviewed-semantic-sample`，因此：

- 13 个 `usedIn` 是人工选择的跨章语义样本，不代表 71 个其余线索已被解释或校正。
- 7 个较早学习序线索已经回链首次定义，0 个未回链线索；这解决的是“读者能否回到定义”，不证明该页所有用法都符合定义。
- RAG 与 Agent 各出现在 22 个文档，是下一轮迁移优先级最高的高扇出概念；当前各只登记 2 个文档节点。
- DIKW、Evaluation Gate 与 Fine-tuning vs RAG 的词面文档已经全部落在当前两个登记节点中；这仍不等于学习效果已验证。

## 失败关闭规则

`docs:concepts` 当前会阻断：

1. 重复 concept/usage ID、锚点或跨概念别名；
2. 不存在的文档、概念或关系目标；
3. 锚点缺失、重复、邻近定位文本缺失；
4. 跨章使用出现在首次定义之前；
5. 更早学习序的词面提及没有回链首次定义；
6. `prerequisiteOf` 自环或任意有向环；
7. `conflictsWith` 或 `related` 缺少反向关系；
8. canonical 专题页不包含术语或任何别名。

内容测试还显式构造前置环、非对称冲突和定义前使用三个负例，确认门禁会失败关闭。

## 界面与浏览器证据

- 桌面截图：`artifacts/g2-3-design-audit/concept-workbench-desktop.png`
- 移动截图：`artifacts/g2-3-design-audit/concept-workbench-mobile.png`
- 展开态截图：`artifacts/g2-3-design-audit/concept-workbench-rag-expanded.png`
- 1440px：两列高密度卡片，定义和关系默认折叠；页面右侧 H2 目录可直接进入“概念使用图”。
- 390px：单列卡片；summary 触控区域至少 44px；页面无横向溢出。
- 浏览器测试验证 13 张卡、RAG 首次定义、跨章跳转、稳定 hash、移动触控与运行时错误；axe 在附录概念工作台无 critical/serious 问题。

首次完整 QA 在构建阶段发现错误导入 `CaretDown`；当前依赖实际导出为 `PhCaretDown`。修正真实导出后，构建、标题对账、性能、Lighthouse 与 Chromium 测试重新通过；没有通过放宽门禁掩盖失败。

收尾还发现 VitePress 1.6.4 内建 preview 实际忽略 host 并监听所有接口。最终本地预览已切换为显式 127.0.0.1 静态服务器，Lighthouse 共用该服务器；隔离门禁验证非回环地址不可达。

## 未解决阻断与下一批

1. **71 个词面线索未迁移**：下一轮应先处理 RAG、Agent、GraphRAG、MCP 四个高扇出概念，对每一处判定“符合定义 / 需要改写 / 只是代码或示例 / 应删除”。
2. **关系仍是作者模型**：26 条前置边没有学习者任务完成率、前后测或错误类型证据；不得解释为已验证教学路径。
3. **概念冲突不是事实冲突库**：8 对关系只表达“不可混同”，没有覆盖内容声明之间的互斥、版本或时间冲突。
4. **页面成熟度未升级**：概念结构通过不改变 2 runnable、22 solution、2 principle、0 acceptance 与 24 pending 的总账。
5. **下一批 G2.4**：建立机器可检查的 acceptance contract，把固定评估集、阈值、负例、回归差异、责任接受与最终回执连接到成熟度升级；没有这些证据时继续失败关闭。

## 范围声明

本轮没有部署、推送、合并、生产调用、真实数据导入或远程写入；没有修改或清理 `.omo/run-continuation` 与 `example/` 的既有用户状态。
