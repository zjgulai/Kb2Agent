# 第八章：架构选型深度指南与进阶分层理论

> 本章回答两个核心问题：**何时不该用 RAG？** 以及 **选了 RAG，该选哪种架构？**

---

## 8.0 四维架构选型决策矩阵

在深入技术细节之前，先用四个维度定位你的场景：

| 维度 | 轻量 → 重量 | 决定因素 |
|------|-----------|---------|
| **数据量** | <1万 → <100万 → >1000万条 | 向量库规模选型 |
| **查询复杂度** | 简单问答 → 精确过滤 → 关系推理 → 多跳分析 | RAG vs GraphRAG vs Agentic |
| **实时性要求** | 月更 → 日更 → 小时更 → 实时 | 批处理 vs 流处理架构 |
| **预算约束** | <¥5万/年 → <¥50万/年 → >¥50万/年 | 全本地 vs 混合 vs 商业方案 |

**快速选型路径**：

```
数据量 < 1万 + 查询简单 + 无实时要求  →  ChromaDB + 本地 Qwen  (轻量方案)
精确字段过滤需求强                     →  深度结构化提取 + Qdrant
关系推理（"连带品类"/"上下游"）       →  轻量图谱（Kùzu/NetworkX）
全库主题综合（"这批报告共同主题是？"）→  GraphRAG / LightRAG
复杂多步自主决策                       →  Agentic RAG (LangGraph)
```

---

## 8.1 何时**不**该用 RAG

:::warning 关键决策：先问"需不需要 RAG"，再问"用什么 RAG"
:::

**不该用 RAG 的五种场景**：

### 场景 1：规则稳定 → 规则引擎或 Fine-tuning 更好

```python
# ❌ 错误做法：把评分规则塞进 RAG
# 每次查询都"重新理解"规则，引入不确定性
results = kb.search("选品评分标准是什么")

# ✅ 正确做法：规则引擎直接计算
def opportunity_score(demand: float, competition: float,
                      profit: float, operation: float) -> float:
    return demand * 0.40 + competition * 0.30 + profit * 0.25 + operation * 0.05
```

### 场景 2：实时数据 → 直接 API 调用，不入库

| 数据类型 | 更新频率 | 正确做法 | 错误做法 |
|---------|---------|---------|---------|
| 竞品价格 | 分钟级 | 查询时调 Keepa/Amazon API | 入知识库 → 入库即腐烂 |
| BSR 排名 | 小时级 | 实时 API | 入库 → 过时 |
| 汇率 | 实时 | 金融 API | 任何形式的入库 |

### 场景 3：精确计算 → NL2SQL 直连数据库

```sql
-- 用户问："本月太阳能充电器销售额是多少？"
-- ❌ RAG 会"猜"出 $245K（可能错）
-- ✅ NL2SQL 返回精确值
SELECT SUM(revenue) FROM sales_orders
WHERE category='solar_charger' AND month='2026-07'
```

### 场景 4：单文档短文本 + 低频查询 → 长上下文直接加载

```python
# ❌ 过度工程化：给一份10页的报告建 RAG
chunks = split_document(report)          # 切块
embeddings = embed(chunks)               # 向量化
kb.add(chunks, embeddings)               # 入库
result = kb.search(query)               # 检索

# ✅ 直接加载（Gemini 1.5 Pro 支持 2M tokens）
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    messages=[{"role": "user", "content": f"报告全文：{report}\n\n问题：{query}"}]
)
```

**判断准则**：文档 < 100 页 且 查询频率 < 50 次/月 → 优先试长上下文基线

### 场景 5：纯数值计算 → Python 函数直接处理

```python
# ❌ 不要用 LLM 计算统计量
result = llm.ask("计算这些销售数据的中位数和标准差")  # 可能出错

# ✅ pandas 直接计算
stats = df.groupby(['category', 'market'])['revenue'].agg(['median', 'std'])
```

---

## 8.2 五层知识蒸馏阶梯 (LoD)

> 本章基于对 2025-2026 年顶会论文（ACL、NeurIPS、ICLR）及 GitHub 高星项目（A-RAG, Corpus2Skill, Anything2Skill, xMemory 等）的深度解构，围绕**第一性原理**，为你提供从理论到落地的极致压榨指南。

### 7.1 第一性原理推演：Agent 到底需要什么？

传统的 RAG 认为 Agent 需要的是“知识片段”（Chunks）；
但在真实生产环境中，Agent 需要的是**“能力重用（Capability Reuse）”**和**“自主的信息漏斗（Information Funnel）”**。

这揭示了两种完全不同的技术路由：
1. **声明式外包（Declarative Grounding）**：模型不知道库里有什么，只能瞎问，库塞给他什么他就读什么（经典 Vector RAG）。
2. **程序式导航（Procedural Navigation）**：模型获得了一张**全景地图**，它主动决定该下钻到哪一层，该读取哪些完整原件（Agentic RAG / Skill 目录树）。

### 7.2 知识蒸馏与 Agent 调用的 DIKW 深度阶梯 (Level of Distillation)

通过对工业界（Microsoft, HuggingFace）和开源极客社区（如 `zjgulai` 收藏的知识图谱生态）的深度解构，我们发现所谓的“蒸馏”不仅是格式转换，而是从**“数据(Data)”向“智慧(Wisdom)”**的跨越。

切忌将低阶产物硬塞给需要高阶推理的 Agent。以下是 2026 年最新基准的 **5 级蒸馏阶梯 (LoD)**：

| 蒸馏阶梯 | DIKW 映射 | 核心动作 | 代表级开源仓库 | Agent 评估与应用实效 |
| :--- | :--- | :--- | :--- | :--- |
| **LoD 0 (Flat)** | 数据 (Data) | **切块 + 向量化** | `LangChain`, `LlamaIndex` | **单跳事实检索 60%，多跳 <10%**。<br/>Agent 像在垃圾堆里抽盲盒，极易“Lost in the Middle”。 |
| **LoD 1 (Enriched)**| 信息 (Info) | **元数据 + 实体附着** | `UnWeaver` (arXiv:2603) | **零图谱成本，超越早期 GraphRAG**。<br/>用 LLM 抽实体绑在 Chunk 尾部，用轻量过滤代替昂贵的图遍历。 |
| **LoD 2 (Hierarchical)**| 知识 (Knowledge)| **分层目录树构建** | `Corpus2Skill` (HF, 2026) | **WixQA F1: 46.0% (超 Dense 27%)**。<br/>让 Agent **放弃被动检索，主动 Navigate(导航)** `INDEX.md` 目录树。 |
| **LoD 3 (Relational)** | 知识网络 | **图谱与社区摘要** | `GraphRAG`, `LightRAG` | **全库主题综合（Sensemaking）霸主**。<br/>解决“这些报告共同的主题是什么”等全局泛化问题，但单跳事实查询成本极高。 |
| **LoD 4 (Procedural)** | 智慧 (Wisdom) | **方法论与行为契约** | `cangjie-skill`, `colleague-skill`, `ex-skill` | **qsv 成功率 98.85%**。<br/>最高阶蒸馏。将书籍、长视频、前任对话(`ex-skill`)甚至自己(`yourself-skill`) 提炼为带触发条件、禁忌和决策流的 `SKILL.md`。 |

> **深度洞察：LoD 4 (Skill 蒸馏) 为什么是终局？**
> 从 `colleague-skill` (同事经验) 到 `yourself-skill` (自我永生)，再到 `anti-distill` (防止被公司资本家吸干经验的防蒸馏工具)。开源社区的走向证明：**最高价值的知识不是“事实”，而是“判断启发式 (Heuristics)”与“SOP 肌肉记忆”**。这也是为什么提供 `SKILL.md` 能让 Agent 的执行成功率发生断层式领先。

### 7.3 技术路由选型指南 (Input → Routing → Selection → Techniques)

结合各大开源框架的共同点和差异点，我们梳理出最高效的落地实践路由。

#### 1. 当 Input 是「企业操作手册、API文档、CLI日志」时
*   **第一性原理**：这类文件天然具有极强的“怎么做（Procedural）”属性，不适合被打碎成 Vector。
*   **Routing (技术路由)**：执行 **Level 4 (Procedural)** 蒸馏。
*   **Selection (选型)**：`Anything2Skill` 或 `cangjie-skill` 架构。
*   **Techniques (落地技巧)**：提取内容后，强制转换为**契约化结构**。每一个 Skill 必须包含：`invocation_conditions` (触发条件), `contraindications` (禁忌/绝对不能做的), `action_moves` (执行流)。
*   **评估**：RAG 仅能达到 76% 成功率，结合 SkillBank 可达 94%+。

#### 2. 当 Input 是「几万份碎片化的客服工单/FAQ」时
*   **第一性原理**：知识分布极度长尾，单篇价值低，但宏观上存在“目录分类”的聚合可能。
*   **Routing (技术路由)**：执行 **Level 2 (Hierarchical)** 蒸馏。
*   **Selection (选型)**：`Corpus2Skill` 架构（"Don't Retrieve, Navigate" 范式）。
*   **Techniques (落地技巧)**：
    *   **线下编译 (Compile Time)**：使用 K-Means 进行分层聚类 (Branching ratio p=10)，自底向上生成包含主题、关键词的 `INDEX.md`。
    *   **线上伺服 (Serve Time)**：禁用传统 Vector RAG！给 Agent 配置 `code_execution` (浏览目录) 和 `get_document(id)` (读取原文) 工具。让 Agent 像人在电脑里找文件一样逐层下钻。
    *   **成本技巧**：利用 Anthropic Prompt Caching，将全量系统提示和顶层目录缓存，单次 Query 成本可从 $0.17 降至 $0.089 (-48%)。

#### 3. 当 Agent 需要解决「高度复杂的跨文档多跳推理」时
*   **第一性原理**：在没有明确预设路径时，Agent 需要动态探索，但如果一次性喂太多无用 Chunk，会导致“Lost in the Middle”。
*   **Routing (技术路由)**：**Agentic RAG (A-RAG 范式)**。
*   **Selection (选型)**：`A-RAG` (Agentic Retrieval-Augmented Generation) 架构。
*   **Techniques (落地技巧)**：
    *   为 Agent 提供三个分层工具，由 Agent 遵循 ReAct 循环自主决定调用：
        1.  `keyword_search`: 最粗粒度、速度最快。
        2.  `semantic_search`: 句子级别语义搜索。
        3.  `chunk_read`: 读完整段落上下文。
    *   **状态追踪**：维护一个 `Context Tracker`，如果 Agent 重复读取同一个 Chunk，返回 `"This chunk has been read before"`，强制其探索新路径。

#### 4. 当 Agent 处于「长时间对话/任务连续执行」时 (Agent Memory)
*   **第一性原理**：对话记忆高度相关且大量重复。固定的 Top-k 检索会拉取满屏的冗余废话，挤占新知识。
*   **Routing (技术路由)**：执行 **Level 5 (Temporal)**，解耦并聚合。
*   **Selection (选型)**：`TencentDB-Agent-Memory` 或 `xMemory`。
*   **Techniques (落地技巧)**：
    *   **符号化卸载 (Symbolic Offloading)**：把极其冗长的工具执行日志提取为轻量级的 Mermaid 流程图（Symbolic Graph）放在短时记忆中，把冗长的原始 JSON 写入文件系统通过 `node_id` 关联。
    *   **L0 -> L3 金字塔**：L0(原对话) -> L1(事实原子) -> L2(场景快照) -> L3(用户偏好/人设)。Agent 平时只读取 L3，遇到具体问题才通过索引下钻到 L1。这种方式被证明能使 Context Token 下降 61%，Persona 召回率提升至 76%。


### 7.5 实战案例深度对决：“女娲-仓颉-达尔文”生态与认知克隆

在 `zjgulai` 的知识图谱高星列表中，隐藏着一条极具工业启发的“认知克隆”路线。这条路线完全抛弃了传统的 Chunk 检索，而是将人类经验提炼为 `Agent Skill` (Level 4/5)，并且形成了闭环的生态系统。

> **核心哲学 (第一性原理)**：知识不是静态的数据快照，而是**可执行的判断启发式 (Decision Heuristics)** 和 **行为函数 (Behavioral Functions)**。

我们对以下核心 SOTA 仓库进行第一性原理审计：

| 仓库名称 | 核心生态定位 | 蒸馏的深度与形态 | 对 Agent 调用的有效性评估 (ROI) |
| :--- | :--- | :--- | :--- |
| **`cangjie-skill` (仓颉)**<br/>`book2skill` | **造书**：从文本/视频/播客提炼方法论 | **结构化动作流**：不提取故事，只提取 `RIA-TV++`（引用/重写/案例/触发/边界）。 | **高**。将几万字杂音浓缩为纯动作指令，解决大语料下 Agent 迷失问题。配合 `test-prompts.json` 强校验。 |
| **`nuwa-skill` (女娲)**<br/>`ex-skill` | **造人**：公众人物/前任的思维与表达克隆 | **双轨认知克隆**：分离 `能力轨道 (工作方法)` 与 `行为轨道 (表达DNA/语气)`。 | **极高**。让通用大模型发生“人格坍缩”，高度聚焦特定场景的决策模式，拒绝废话。 |
| **`darwin-skill` (达尔文)** | **进化**：Skill 的自我博弈与迭代 | **动态生命周期**：9维度加权打分 + 棘轮机制 (Ratchet) = 仅保留带来正向收益的代码。 | **革命性**。引入了类似微软 `SkillOpt` 的 validation-gated 验证拦截，解决人工维护 Skill 库的疲劳。 |

#### 取其精华、去其糟粕的整合选型 (Integrative Selection)

如果你要在生产环境中落地这套体系，请务必带着批判性思维：

1.  **去其糟粕（不要做的事）**：
    *   **❌ 拒绝迷信大纲提取**：很多工具把书“蒸馏”成一个目录大纲，Agent 看了大纲依然不知道具体怎么执行。**知识卡片/大纲 是给人看的，不是给 Agent 用的。**
    *   **❌ 拒绝纯语气模仿（Cosplay）**：像 `ex-skill`（克隆前任）本质是情绪价值的玩具，如果把 `nuwa-skill` 仅用于让 Agent 说话像乔布斯，毫无业务价值。

2.  **取其精华（必须做的事）**：
    *   **✅ 强制双轨提炼 (Dual-Track Distillation)**：
        效仿 `nuwa-skill`，将业务专家经验蒸馏时，必须切分为 **“决策原则 (Capability)”** 与 **“安全边界 (Contraindications)”**。不要把他们混在一整段文字里。
    *   **✅ 三重验证机制 (Triple Validation)**：
        效仿 `cangjie-skill`：所有从原始语料（无论是专家开会还是业务文档）提炼出的结论，必须满足“有2处独立佐证 + 具备预测力 + 非废话常识”，否则直接在蒸馏期淘汰（淘汰率可达 50%）。这极大降低了注入 Knowledge Base 的“有毒数据”。
    *   **✅ 引入达尔文棘轮 (The Darwinian Ratchet)**：
        把每个生成的 `SKILL.md` 当作一段 Python 代码来看待。每次更新 Skill，必须跑一次 `test-prompts.json` 回归测试。只有当 9 维度综合得分（`val_bpb`）提升时，才允许覆盖入库。

#### 落地实践：认知克隆的终局工程链路

综上，从信息源到 Agent 可理解知识库的**最强形态链路**如下：

1.  **输入源剥离**：使用 `Unlimited-OCR` (文本) 或端到端音频模型将专家访谈/核心代码库还原为干净的源数据。
2.  **仓颉式剥离**：不采用 LangChain 切块，直接跑 5 个并发 Agent（框架提取、原则提取、反例提取、术语对齐、操作提炼）。
3.  **女娲式封装**：将上面提取的碎片，组装成带有严格 `System Prompt` 外壳的 `SKILL.md`。例如：“遇到此类超时问题，首先检查 X，绝不能做 Y”。
4.  **达尔文式防腐**：在 CI/CD 中挂载 `darwin-skill` 脚本，每次有人修改知识库，自动生成 10 个极端问题去问 Agent，如果 Agent 按着新的 Skill 执行反而报错（如格式越界、遗漏安全检查），直接阻断该次提交 (`revert`)。


### 7.4 核心误区：GraphRAG (Level 3) 与 VectorRAG (Level 0) 的终极辩论

2026年多个独立评估（如 `UnWeaver` 论文）得出了一个冷酷的结论：**GraphRAG 并没有全面干掉 VectorRAG。**

*   **什么时候 GraphRAG 惨败？** 简单的单文档事实检索（如“退款政策是什么？”）。由于图谱强行拉入多条边，制造了巨量噪音，GraphRAG 的准确率反而**低于**普通向量检索，且成本是其 10 倍以上。
*   **什么时候 GraphRAG 完胜？** “全局聚合”（Aggregation）与“全量主体提炼”（例如：“这些报告中共同的主题是什么？”）。

**落地方案结论（混合架构是唯一解）**：
构建**意图分类器 (Intent Router)** 或引入 **UnWeaver (实体增强 Embedding)**（在不建图的情况下，用 LLM 抽取实体后强制附着在 Embedding 的尾部）。只有在聚合、归纳意图极为明显时，才使用 GraphRAG。
