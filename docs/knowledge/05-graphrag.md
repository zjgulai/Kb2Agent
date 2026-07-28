---
name: knowledge-graphrag-construction
description: GraphRAG知识图谱构建文档，详解实体抽取、关系建模、社区摘要与LightRAG集成方案。当需要构建图谱增强检索时使用。
---

# 第六章：GraphRAG 知识图谱构建

> **前四章解决了数据接入与结构化提取**，本章解决「如何构建可被复杂查询的知识库」——GraphRAG 是普通向量库的升级选项，不是替代。

:::tip 本章学习路径
1. 先理解 **为什么需要图谱**（6.1）
2. 选择适合你场景的 **图谱工具**（6.2 对比表）
3. 按需实现 **LightRAG**（轻量首选）或 **Graphiti**（时态场景）
4. 最后封装为 **MCP Server**（6.7，让 Agent 直接调用）
:::

```mermaid
flowchart LR
    subgraph Input["知识来源"]
        D1["文档/PDF"]
        D2["网页数据"]
        D3["内部数据库"]
    end

    subgraph Graph["图谱层"]
        E["实体抽取\nLLM提取三元组"]
        G["图数据库\nNeo4j / Kùzu"]
        C["社区摘要\n主题聚合"]
    end

    subgraph Query["查询层"]
        Q1["局部查询\n实体邻居检索"]
        Q2["全局查询\n跨文档主题综合"]
        Q3["混合查询\nmix模式"]
    end

    subgraph MCP["MCP Layer 2026"]
        M["GraphRAG MCP Server\ngraphrag_search(query, mode)"]
    end

    Input --> E --> G --> C
    G --> Q1
    C --> Q2
    Q1 & Q2 --> Q3
    Q3 --> M

    classDef input fill:#e3f2fd,stroke:#1d4ed8,color:#1e3a8a;
    classDef graph fill:#e0f2f1,stroke:#0f766e,color:#134e4a;
    classDef query fill:#f3e5f5,stroke:#9333ea,color:#581c87;
    classDef mcp fill:#fff3e0,stroke:#ea580c,color:#9a3412;
    class D1,D2,D3 input;
    class E,G,C graph;
    class Q1,Q2,Q3 query;
    class M mcp;
```

---

## 6.1 为什么需要 GraphRAG？向量库的根本局限

向量 RAG 是一台**查找机**：找到与查询语义相似的文本块。它能回答"退款政策是什么？"，但无法回答：

- "哪些供应商同时出现在合规风险报告和财务报告中？"（多跳推理）
- "这季度所有客户投诉的主要主题是什么？"（跨文档综合）
- "哪个系统模块在三个不同文档中都被标记为高风险？"（聚合计算）

这三类问题的共同特征：**答案不在任何单一文本块中，而分散在多个文档的实体关系里**。GraphRAG 正是为此而生。

**核心区别**：

| 维度 | 向量 RAG | GraphRAG |
|------|----------|----------|
| 检索单元 | 文本块（chunk） | 实体 + 关系 + 社区摘要 |
| 检索操作 | 余弦相似度 | 图遍历 + 社区聚合 |
| 多跳推理 | (X) 无法原生支持 | (OK) 原生支持（沿边遍历）|
| 全局综合 | (X) 无法跨全库综合 | (OK) 社区摘要支持 |
| 索引成本 | 低（仅向量化）| 高（LLM 抽取实体关系）|
| 更新复杂度 | 低（增量更新）| 高（全量或增量重索引）|
| 适合查询 | 事实查找、精确检索 | 主题综合、关系推理 |

**决策原则（2026 主流共识）**：
- 你的查询 70%+ 是事实查找 → 继续用向量 RAG，不要加图
- 有明确的多跳/综合查询需求 → 先试 LightRAG（LightRAG成本约为 GraphRAG 的 1/100）
- 需要全库主题综合（"所有文档的主要模式是什么"）→ 考虑 Microsoft GraphRAG
- 知识会持续变化/Agent 需要时态记忆 → Graphiti（专为 Agent 记忆设计）

---

## 6.2 三大 GraphRAG 框架横向对比

| | Microsoft GraphRAG | LightRAG（HKUDS）| Graphiti（Zep）|
|---|---|---|---|
| **主要用途** | 大语料文档分析与综合 | 文档问答，兼顾成本和增量更新 | Agent 记忆（时态知识图谱）|
| **索引成本（500页）** | $50-200，约45分钟 | ~$0.50，约3分钟 | 按交互量（实时更新）|
| **全局查询质量** | 优秀（社区层级摘要）| 有限（无层级社区检测）| 不适合此场景 |
| **多跳推理** | 强 | 中等 | 强（Agent上下文内）|
| **时态感知** | (X) 无 | (X) 无 | (OK) 核心特性（双时态）|
| **增量更新** | 复杂（需重索引）| (OK) 简单（增量更新）| (OK) 原生实时更新 |
| **GitHub Stars** | ~14K★ | ~22K★（增速最快）| — |
| **生产推荐** | 静态语料 + 需要全局查询 | 动态语料 / 成本敏感 | 长运行 Agent + 知识需随时间演化 |

**2026 核心结论**（来自 Paperclipped, dreaming.press, casys.ai 实测）：
- LightRAG 在大多数场景以 1/100 成本实现 GraphRAG 70-90% 效果
- 同一 50,000 文档语料：GraphRAG $180 + 14小时 vs LightRAG $22 + 2小时
- LightRAG 已超越 Microsoft GraphRAG 成为 GitHub 最多 star 的图 RAG 项目

---

## 6.3 GraphRAG 索引流水线（五阶段）

无论用哪个框架，GraphRAG 的核心索引逻辑相同：

```
Stage 1: 文本切块（Chunking）
  · 将文档切分为 TextUnit（分析单元）
  · 保留 chunk 边界不跨实体
  · 存储：chunk_id + source_doc_id + content

Stage 2: 实体与关系抽取（Entity & Relation Extraction）
  · LLM 从每个 chunk 提取：
    - 实体（Entity）：人/组织/产品/概念等
    - 关系（Relationship）：(entity_A, relation_type, entity_B)
    - 关键声明（Key Claims）
  · [!] 最耗费 Token 的阶段（占总索引成本 58%）
  · LightRAG：同时提取高级关键词（主题标签）和低级关键词（具体实体）

Stage 3: 社区检测（Community Detection）
  · Microsoft GraphRAG：Leiden 算法分层聚类，为每个社区生成 LLM 摘要
  · LightRAG：跳过重量级社区检测，使用轻量图结构
  · Graphiti：跳过批量社区，实时维护时态边

Stage 4: 双存储写入（Dual Storage）
  ┌──────────────────┬────────────────────────────┐
  │  图数据库         │  向量数据库                  │
  │  (Neo4j/Memgraph)│  (Qdrant/Milvus/pgvector)  │
  │  存：实体+关系    │  存：chunk + 实体 + 关系的   │
  │  节点边属性       │  向量嵌入                    │
  └──────────────────┴────────────────────────────┘
  [!] 关键：两侧必须共享相同 ID（避免 ID 漂移导致孤儿节点）

Stage 5: 查询路由（Query Routing）
  · local 模式：精确实体邻居遍历（精确事实查找）
  · global 模式：社区摘要聚合（全局主题综合）
  · hybrid/mix 模式：两者合并（推荐默认）
  · naive 模式：退化为纯向量 RAG（基准对比用）
```

---

## 6.4 LightRAG：推荐起点的完整 SOP

**安装与初始化**：

```bash
pip install lightrag-hku

# 环境变量
export OPENAI_API_KEY="..."    # 或配置本地 LLM
export LIGHTRAG_DIR="./lightrag_storage"
```

**四种角色 LLM 配置**（LightRAG v1.5+ 要求）：

```python
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embedding

rag = LightRAG(
    working_dir="./lightrag_storage",
    
    # EXTRACT 角色：实体关系抽取（高频调用，用快速便宜模型）
    # 强烈推荐关闭 thinking 模式，否则慢且贵
    llm_model_func=gpt_4o_mini_complete,   # 或 Claude Haiku / DeepSeek-V4-lite
    
    # 本地部署：Qwen3-30B-A3B-Instruct 是最低要求
    
    # EMBEDDING：选低维快速模型
    embedding_func=openai_embedding,       # 或本地 BAAI/bge-m3
    
    # Rerank（可选，推荐本地部署）：
    # rerank_model="BAAI/bge-reranker-v2-m3"
)
```

**核心建议**（官方文档警告）：
- Embedding 模型**一旦开始索引就不能更换**（更换需重新 embed 所有内容）
- 默认存储仅适合开发调试；生产必须配置 PostgreSQL / MongoDB / Neo4j
- **强烈推荐启用 MinerU 解析引擎**（默认 pipeline 效果不是最优）

**文档入库**：

```python
# 单文档
with open("knowledge.md", "r") as f:
    rag.insert(f.read())

# 批量（推荐异步）
import asyncio
from lightrag.utils import EmbeddingFunc

async def batch_insert(docs: list[str]):
    tasks = [rag.ainsert(doc) for doc in docs]
    await asyncio.gather(*tasks)
```

**五种查询模式**：

```python
# local：精确实体匹配（谁/什么）
result = rag.query("张三负责哪些项目？", param=QueryParam(mode="local"))

# global：跨文档主题综合（什么模式/趋势）
result = rag.query("过去一年的主要风险主题是什么？", param=QueryParam(mode="global"))

# hybrid：两者合并
result = rag.query("谁在风险项目中扮演了关键角色？", param=QueryParam(mode="hybrid"))

# mix（默认推荐）：综合效果最好
result = rag.query("...", param=QueryParam(mode="mix"))

# naive：退化为纯向量 RAG（仅用于对比基准）
result = rag.query("...", param=QueryParam(mode="naive"))
```

---

## 6.5 Microsoft GraphRAG：全局综合场景 SOP

**适用场景**：静态大型语料，需要"这整个语料库的主要主题/模式/风险是什么"类全局查询。

```bash
pip install graphrag

# 初始化项目
graphrag init --root ./graphrag_project

# [!] 每次小版本升级都要重新 init：
# graphrag init --root ./graphrag_project --force
```

**配置文件关键项**（settings.yaml）：

```yaml
llm:
  model: gpt-4o-mini          # 建议用 mini 控制成本
  max_tokens: 4000

embeddings:
  llm:
    model: text-embedding-3-small

chunks:
  size: 1200
  overlap: 100

entity_extraction:
  max_gleanings: 1            # 减少重复抽取，控制成本
```

**提示词调优（必做）**：

```bash
# 自动生成针对你的数据的定制提示词（强烈建议）
graphrag prompt-tune --root ./graphrag_project --config settings.yaml

# 索引（[!] 耗时耗钱，先用小样本测试）
graphrag index --root ./graphrag_project
```

**查询**：

```python
from graphrag.query.api import local_search, global_search

# 局部查询：实体邻居
result = await local_search(
    query="张三参与了哪些决策？",
    config=config,
    community_level=2,
)

# 全局查询：社区摘要聚合（最贵，但最强的全局综合能力）
result = await global_search(
    query="这个语料库中最重要的主题模式是什么？",
    config=config,
    community_level=2,
)

# DRIFT 搜索（2024年底新增，比 global 省 40-60% token）
result = await drift_search(query="...", config=config)
```

---

## 6.6 Neo4j Graphiti：Agent 时态记忆 SOP

**适用场景**：Agent 需要记忆随时间变化的知识（"3号之前我们认为X，但现在知道是Y"）。

```bash
pip install graphiti-core
# 需要 Neo4j 实例（本地 Docker 或 Neo4j AuraDB）
```

```python
from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType

# 初始化（连接 Neo4j）
graphiti = Graphiti(
    neo4j_uri="bolt://localhost:7687",
    neo4j_user="neo4j",
    neo4j_password="password"
)

# 添加事件（实时更新，无需批量重索引）
await graphiti.add_episode(
    name="用户反馈",
    episode_body="用户A反映产品B的性能在2026-07-24后明显下降",
    source=EpisodeType.text,
    reference_time=datetime.now()
)

# 时态查询（"当时我们知道什么？"）
results = await graphiti.search(
    "产品B的性能问题",
    center_node_uuid=None
)

# 点时间查询（指定时间点的知识状态）
historical = await graphiti.search(
    "产品B",
    reference_time=datetime(2026, 7, 20)  # 查询7月20日时的知识状态
)
```

---

## 6.7 知识库架构选型决策树

```
你的知识库是什么类型？
│
├── 静态语料（文档不经常变化）
│   │
│   ├── 需要全局主题综合（"整个库的主要模式是什么"）
│   │   └── Microsoft GraphRAG
│   │       ├── 成本不敏感 → 完整 GraphRAG pipeline
│   │       └── 成本敏感 → LazyGraphRAG（索引成本等于向量RAG）
│   │
│   └── 主要是多跳问答（不需要全局综合）
│       └── LightRAG（70-90%效果，1/100成本）
│
├── 动态语料（文档持续增加/更新）
│   └── LightRAG（原生增量更新，无需全量重索引）
│
├── Agent 记忆（知识随 Agent 运行时变化）
│   └── Graphiti（Neo4j，双时态，实时更新）
│
├── 不确定是否需要 GraphRAG？（防伪多跳陷阱）
│   └── 先用「向量 RAG + 元数据过滤（Metadata Filtering）」
│       → 问："列出 Q3 的高危投诉" 
│       → 应对：利用 {"quarter": "Q3", "risk": "high"} 过滤，然后向量检索。不需要加图。
│       → 只有当查询涉及"跨实体隐藏关系网"（如"哪些供应商被高危投诉影响，且与核心产品B有依赖"）时，才上马 LightRAG/GraphRAG
│
└── 两者都需要？（大多数生产系统）
    └── 混合路由：
        简单事实查找 → 向量 RAG（快，便宜）
        多跳/综合查询 → GraphRAG
        路由逻辑：小分类器 or LLM 意图判断
```

---

## 6.8 生产部署：存储后端选择

LightRAG 需要四类存储，生产环境推荐：

| 存储类型 | 用途 | 推荐方案 |
|----------|------|----------|
| KV_STORAGE | LLM 响应缓存 + 文本块 | PostgreSQL / MongoDB |
| VECTOR_STORAGE | 实体+关系+chunk 的向量 | PostgreSQL(pgvector) / Qdrant / Milvus |
| GRAPH_STORAGE | 知识图谱 | Neo4j / Memgraph |
| DOC_STATUS_STORAGE | 文档处理状态 | PostgreSQL / MongoDB |

**单一后端方案**（简化运维）：PostgreSQL（同时支持向量和KV）

**专业后端方案**（性能最优）：
- 向量：Qdrant（高性能，支持多向量）
- 图：Neo4j（成熟生态，支持 Cypher 查询）
- 混合桥接：`QdrantNeo4jRetriever`（Qdrant 官方提供）

**关键约束**：
- 向量维度上限：Neo4j 原生向量索引最大 4096 维；超过则必须用独立向量库
- Embedding 模型选定后不能随意更换（更换需完全重新嵌入）

**[!] 架构生命周期生命线：三态存储的 ACID 一致性与级联删除 (Cascade Invalidation)**
在 `向量库 + 图谱 + Skill文件` 并存的系统中，最致命的架构腐缩是**孤儿知识**。当源文档被更新或作废时：
1. **统一知识寻址协议 (URT)**：所有入库的 Chunk(向量)、Edge(图谱)、Entry(Skill) 必须强绑定同一个 `source_document_hash`。
2. **事件驱动垃圾回收 (GC)**：引入 Webhook 层。当监听到源文件变更，触发级联删除：
   - 物理删除 Neo4j 中关联的衍生边
   - 软删除 (Tombstone) Qdrant 中的向量块
   - 强制将相关的 `SKILL.md` 标记为 `[Outdated - Needs Recompile]`，阻止 Agent 继续执行过期流程。

---

## 6.7 MCP 封装：让任意 Agent 直接查询图谱

将 GraphRAG 封装为 MCP Server 后，Claude Desktop、Cursor、Codex App 无需写适配代码即可调用。

```python
# graphrag_mcp_server.py
from mcp.server.fastmcp import FastMCP
from lightrag import LightRAG, QueryParam

mcp = FastMCP("graphrag_kb")
rag = LightRAG(working_dir="./lightrag_data")

@mcp.tool()
def graphrag_search(query: str, mode: str = "mix") -> str:
    """
    在知识图谱中搜索。
    mode: local（实体邻居）| global（跨文档主题）| mix（推荐，综合最优）
    """
    return rag.query(query, param=QueryParam(mode=mode))

@mcp.tool()
def get_entity_relations(entity: str) -> str:
    """获取指定实体的直接关系网络（一跳邻居）。"""
    result = rag.query(
        f"列出与'{entity}'直接相关的所有实体和它们之间的关系",
        param=QueryParam(mode="local")
    )
    return result

if __name__ == "__main__":
    mcp.run()
```

**配置示例**（Claude Desktop）：
```json
{
  "mcpServers": {
    "graphrag_kb": {
      "command": "python",
      "args": ["/path/to/graphrag_mcp_server.py"]
    }
  }
}
```

:::tip 向下一章
图谱构建完成后，下一步是让 Agent 高效调用——包括 MCP 协议、RAG 模式选择、Skill 导航等，详见 [第七章：Agent 调用 + MCP 协议](06-agent-call.md)。
:::
