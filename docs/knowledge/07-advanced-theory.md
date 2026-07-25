# 第七部分：Agentic 检索与蒸馏的进阶分层理论 (2026 基准)

> 本章基于对 2025-2026 年顶会论文（ACL、NeurIPS、ICLR）及 GitHub 高星项目（A-RAG, Corpus2Skill, Anything2Skill, xMemory 等）的深度解构，围绕**第一性原理**，为你提供从理论到落地的极致压榨指南。

### 7.1 第一性原理推演：Agent 到底需要什么？

传统的 RAG 认为 Agent 需要的是“知识片段”（Chunks）；
但在真实生产环境中，Agent 需要的是**“能力重用（Capability Reuse）”**和**“自主的信息漏斗（Information Funnel）”**。

这揭示了两种完全不同的技术路由：
1. **声明式外包（Declarative Grounding）**：模型不知道库里有什么，只能瞎问，库塞给他什么他就读什么（经典 Vector RAG）。
2. **程序式导航（Procedural Navigation）**：模型获得了一张**全景地图**，它主动决定该下钻到哪一层，该读取哪些完整原件（Agentic RAG / Skill 目录树）。

### 7.2 知识蒸馏的五个 Level 分层（Level of Distillation, LoD）

根据各大开源仓库的差异，我们可以将蒸馏程度严格划分为 5 个等级。**切忌将低等级的输出喂给高等级的架构。**

| 蒸馏等级 | 形态 | 代表库/论文 | 核心方法论 | RAG/Agent 评估得分参考 |
|---|---|---|---|---|
| **Level 0 (Flat)** | 纯文本切块 (Chunks) | 传统 LangChain/LlamaIndex | 仅做滑动窗口切片，依赖 Embedding 余弦相似度。 | 单跳问答 60%，多跳问答 **<10%** |
| **Level 1 (Enriched)** | 块 + 实体/元数据增强 | `UnWeaver` (arXiv:2603) | 不建图，仅用 LLM 从 Chunk 提取实体，并拼接进 Embedding 中。成本极低。 | 复杂问答 F1 提升，击败早期 GraphRAG |
| **Level 2 (Hierarchical)** | 层次化目录树 | `Corpus2Skill` (HF, 2026) | 聚类并生成逐层摘要 (`INDEX.md` + `SKILL.md`)。Agent 像读文件系统一样**主动导航**，最后用 `get_document` 调取原文。 | WixQA 胜出：F1 46.0% (相比 Dense 高出 27%) |
| **Level 3 (Relational)** | 实体图谱 + 社区摘要 | `GraphRAG` / `LightRAG` | 提取 (实体, 关系, 实体) 三元组，计算社区聚集。 | 全局综合聚合能力最强，但多跳推理时偶发幻觉 |
| **Level 4 (Procedural)** | 可执行契约 (Skill Contract) | `Anything2Skill` | 从文本/日志提炼出含调用条件、工作流、禁忌、置信度的 `SKILL.md`，放入 SkillBank。 | qsv 成功率 **98.85%**，GitHub-CLI 成功率 **94.10%** |
| **Level 5 (Temporal)** | 时态记忆网络 | `Graphiti` / `xMemory` | (双轨) 能力保留 + 记忆状态的双时态追踪；使用 L0->L3 分层衰减压缩。 | 长上下文对话问答大幅提升 |

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

### 7.4 核心误区：GraphRAG (Level 3) 与 VectorRAG (Level 0) 的终极辩论

2026年多个独立评估（如 `UnWeaver` 论文）得出了一个冷酷的结论：**GraphRAG 并没有全面干掉 VectorRAG。**

*   **什么时候 GraphRAG 惨败？** 简单的单文档事实检索（如“退款政策是什么？”）。由于图谱强行拉入多条边，制造了巨量噪音，GraphRAG 的准确率反而**低于**普通向量检索，且成本是其 10 倍以上。
*   **什么时候 GraphRAG 完胜？** “全局聚合”（Aggregation）与“全量主体提炼”（例如：“这些报告中共同的主题是什么？”）。

**落地方案结论（混合架构是唯一解）**：
构建**意图分类器 (Intent Router)** 或引入 **UnWeaver (实体增强 Embedding)**（在不建图的情况下，用 LLM 抽取实体后强制附着在 Embedding 的尾部）。只有在聚合、归纳意图极为明显时，才使用 GraphRAG。
