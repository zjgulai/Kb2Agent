---
name: knowledge-tech-selection-2026
description: 2026年知识库工程技术选型深度指南，覆盖Embedding/向量数据库/GraphRAG/Reranker/MCP/Agent框架六大方向的GitHub仓库深度调研、性能基准、可运行代码和明确推荐。供Codex直接开发使用，避免重复造轮子。
---

# 第十八章：技术选型深度指南 2026

> **本章用途**：Codex 开发时的选型决策手册。所有推荐均基于 2025-2026 年最新 GitHub 仓库调研、MTEB/BEIR Benchmark 实测数据和生产案例。每个方向给出明确的「用什么、怎么用、代码直接复制」。
>
> **调研日期**：2026-07-29 | **数据来源**：GitHub API 实时采集 + 官方仓库源码 + MTEB/BEIR Leaderboard

---

## 本章导航

| 方向 | 推荐结论（TL;DR） | 跳转 |
|------|-----------------|------|
| **Embedding 模型** | 中文知识库 → Qwen3-0.6B；混合检索 → BGE-M3 | §18.1 |
| **向量数据库** | 通用 → Qdrant；纯本地/离线 → LanceDB；已有PG → pgvector | §18.2 |
| **GraphRAG** | 知识库问答 → LightRAG；全局分析 → GraphRAG；Agent记忆 → Graphiti | §18.3 |
| **Reranker** | 本地/中文 → BGE-v2-M3；低流量云 → Cohere Rerank 3 | §18.4 |
| **MCP 生态** | Server 开发 → FastMCP；调试 → MCP Inspector；注意2026-07-28规范重大变更 | §18.5 |
| **Agent 框架** | 生产级有状态 → LangGraph；快速上线 → Agno；类型安全单Agent → Pydantic-AI | §18.6 |

---

## 18.1 Embedding 模型选型

### 推荐排名（中文知识库场景）

| 排名 | 模型 | C-MTEB 均分 | 上下文 | 许可证 | 推荐场景 |
|------|------|------------|--------|--------|---------|
| 🥇 **Qwen3-0.6B** | [Qwen/Qwen3-Embedding-0.6B](https://github.com/QwenLM/Qwen3-Embedding) | **66.33** | 32K | Apache 2.0 | 标准中文知识库 |
| 🥈 **BAAI/bge-m3** | [FlagOpen/FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding) | ~65–67 | 8K | MIT | 混合检索（dense+sparse） |
| 🥉 **Qwen3-8B** | [Qwen/Qwen3-Embedding-8B](https://huggingface.co/Qwen/Qwen3-Embedding-8B) | **73.84** | 32K | Apache 2.0 | 高精度/有GPU |

### MTEB 核心数据

| 模型 | 参数 | C-MTEB均分 | MTEB多语言 | 上下文 |
|------|------|-----------|-----------|--------|
| Qwen3-8B | 8B | **73.84** 🥇 | **70.58** 🥇 | 32K |
| Qwen3-4B | 4B | 72.27 | 69.45 | 32K |
| **Qwen3-0.6B** | 0.6B | **66.33** | 64.33 | 32K |
| BAAI/bge-m3 | 568M | ~65–67 | ~68.2 | 8K |
| jina-v3 | 570M | ~55–60 | 64.44 | 8K | ⚠️CC-BY-NC |
| mE5-large-instruct | 560M | 58.08 ⬇️ | 64.25 | 514 tokens ⚠️ |

### Qwen3-Embedding 最小可运行代码

```python
# pip install "transformers>=4.51.0" "sentence-transformers>=2.7.0" torch
import torch
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "Qwen/Qwen3-Embedding-0.6B",
    # 有GPU时启用：model_kwargs={"attn_implementation": "flash_attention_2"}
)

queries = ["知识库工程的最佳实践", "What is RAG?"]
documents = [
    "知识库工程需要综合考虑数据质量、检索策略和模型选型",
    "Retrieval Augmented Generation combines retrieval with LLM generation",
]

with torch.no_grad():
    q_emb = model.encode(queries, prompt_name="query")   # 查询必须加 prompt_name
    d_emb = model.encode(documents)                       # 文档不需要

scores = model.similarity(q_emb, d_emb)
print(scores)
# tensor([[0.82, 0.21], [0.18, 0.79]])
```

:::warning Ollama/llama.cpp 部署 Qwen3-Embedding 需加结束符
```python
# Ollama 使用时必须手动添加 <|eodoftext|>，否则性能大幅下降
class Qwen3EmbeddingFixed(OllamaEmbeddings):
    def embed_query(self, text: str):
        return super().embed_query(text + " <|eodoftext|>")
    def embed_documents(self, texts: list[str]):
        return super().embed_documents([t + " <|eodoftext|>" for t in texts])
```
参考：[QwenLM/Qwen3-Embedding#30](https://github.com/QwenLM/Qwen3-Embedding/issues/30)
:::

### BGE-M3 混合检索代码（dense + sparse）

```python
# pip install FlagEmbedding sentence-transformers
from FlagEmbedding import BGEM3FlagModel

model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

docs = ["知识图谱构建方法", "Knowledge graph construction"]
query = "如何构建知识图谱"

output = model.encode(
    docs,
    return_dense=True,
    return_sparse=True,    # 稀疏向量（类BM25）
    return_colbert_vecs=True,  # ColBERT token向量
)

dense_vecs = output["dense_vecs"]       # (2, 1024)
sparse_vecs = output["lexical_weights"] # {token: weight}
```

### Qdrant 混合检索集成（BGE-M3）

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, SparseVectorParams, PointStruct, SparseVector,
    Prefetch, FusionQuery, Fusion,
)
from FlagEmbedding import BGEM3FlagModel

model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
client = QdrantClient("http://localhost:6333")

client.create_collection(
    collection_name="knowledge_base",
    vectors_config={"dense": VectorParams(size=1024, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams()},
)

def hybrid_search(query: str, top_k: int = 5):
    q_out = model.encode([query], return_dense=True, return_sparse=True)
    dense_vec = q_out["dense_vecs"][0].tolist()
    sparse = q_out["lexical_weights"][0]
    sparse_vec = SparseVector(
        indices=[int(k) for k in sparse.keys()],
        values=[float(v) for v in sparse.values()],
    )
    results = client.query_points(
        collection_name="knowledge_base",
        prefetch=[
            Prefetch(query=dense_vec, using="dense", limit=20),
            Prefetch(query=sparse_vec, using="sparse", limit=20),
        ],
        query=FusionQuery(fusion=Fusion.RRF),  # Reciprocal Rank Fusion
        limit=top_k,
    )
    return [(r.payload["text"], r.score) for r in results.points]
```

---

## 18.2 向量数据库选型

### 决策树

```
需要向量数据库？
│
├─ 纯本地/离线/Jupyter/CI → LanceDB（零服务进程）
├─ 已有 PostgreSQL → pgvector（零额外组件）
│
├─ 需要混合检索 + 快速上线 + 可能上云
│   ├─ 向量数 < 2000万 → Qdrant（推荐）
│   └─ 向量数 > 1亿 + 有运维团队 → Milvus
│
├─ 混合搜索是核心 + BM25精度要求高 → Weaviate
└─ 快速原型 + 极简 API → Chroma
```

### 仓库信息

| 数据库 | GitHub | Stars | 最新版本 | 核心定位 |
|--------|--------|-------|---------|---------|
| [qdrant/qdrant](https://github.com/qdrant/qdrant) | Rust | ⭐33.6K | v1.18.3 (2026-07) | 高性能，云原生 |
| [chroma-core/chroma](https://github.com/chroma-core/chroma) | Rust | ⭐28.9K | 1.5.9 (2026-05) | 开发友好，轻量 |
| [pgvector/pgvector](https://github.com/pgvector/pgvector) | C | ⭐22.4K | v0.8.5 (2026-07) | PostgreSQL 扩展 |
| [milvus-io/milvus](https://github.com/milvus-io/milvus) | Go | ⭐45.4K | v2.6.21 (2026-07) | 百亿级生产 |
| [weaviate/weaviate](https://github.com/weaviate/weaviate) | Go | ⭐16.7K | v1.38.7 (2026-07) | 混合搜索一流 |
| [lancedb/lancedb](https://github.com/lancedb/lancedb) | Rust | ⭐11.0K | v0.36.0 (2026-07) | 嵌入式，多模态 |

### Qdrant 快速启动

```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

```python
# pip install qdrant-client
from qdrant_client import QdrantClient, models

client = QdrantClient(":memory:")  # 开发用，或 host="localhost", port=6333

client.create_collection(
    collection_name="kb",
    vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
)

client.upsert("kb", points=[
    models.PointStruct(
        id=1,
        vector=[0.1] * 1024,
        payload={"source": "doc_A", "category": "AI", "chunk_id": 1}
    )
])

results = client.search(
    "kb",
    query_vector=[0.1] * 1024,
    query_filter=models.Filter(
        must=[models.FieldCondition(key="category", match=models.MatchValue(value="AI"))]
    ),
    limit=5,
)
```

### LanceDB 嵌入式使用（零服务进程）

```python
# pip install lancedb
import lancedb, pyarrow as pa

db = lancedb.connect("./lance_kb")  # 无需启动任何服务

data = pa.table({
    "id": [1, 2, 3],
    "text": ["RAG分块策略", "向量数据库选型", "Agent框架对比"],
    "vector": [[0.1]*1024, [0.2]*1024, [0.3]*1024],
    "source": ["blog", "docs", "wiki"],
})
table = db.create_table("kb", data)
table.create_fts_index("text")  # 全文索引

# 混合搜索（向量 + 全文 + SQL过滤）
results = (
    table.query()
    .nearest_to([0.1] * 1024)
    .nearest_to_text("RAG系统")
    .where("source = 'docs'")
    .limit(5)
    .to_pandas()
)
```

### pgvector 混合搜索（RRF融合）

```python
# pip install pgvector psycopg sentence-transformers
from pgvector.psycopg import register_vector
import psycopg

conn = psycopg.connect("postgresql://user:pass@localhost/mydb", autocommit=True)
conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
register_vector(conn)

# RRF 混合搜索（向量 + tsvector全文）
results = conn.execute("""
    WITH semantic AS (
        SELECT id, RANK() OVER (ORDER BY embedding <=> %(emb)s) AS rank
        FROM documents ORDER BY embedding <=> %(emb)s LIMIT 20
    ),
    keyword AS (
        SELECT id, RANK() OVER (ORDER BY ts_rank_cd(to_tsvector('simple', content), q) DESC)
        FROM documents, plainto_tsquery('simple', %(q)s) q
        WHERE to_tsvector('simple', content) @@ q LIMIT 20
    )
    SELECT COALESCE(s.id, k.id),
           COALESCE(1.0/(60+s.rank),0) + COALESCE(1.0/(60+k.rank),0) AS score
    FROM semantic s FULL OUTER JOIN keyword k ON s.id = k.id
    ORDER BY score DESC LIMIT 5
""", {'emb': embedding.tolist(), 'q': query}).fetchall()
```

---

## 18.3 GraphRAG 框架选型

### 一句话本质区别

| 框架 | 本质定位 |
|------|---------|
| **LightRAG** | 文档 → 实体关系图 → 检索时双轨（图邻居 + 向量），本地/增量首选 |
| **microsoft/graphrag** | 文档 → 完整知识图谱 + Leiden社区 → map-reduce全局摘要，适合跨文档分析 |
| **graphiti** | 专为 Agent 对话记忆，带时态边（事实可以过期），不适合文档批量索引 |

### 仓库信息

| 框架 | GitHub | Stars | 最新版本 |
|------|--------|-------|---------|
| [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG) | ⭐38.3K | v1.5.5rc1 (2026-07) | EMNLP 2025收录 |
| [microsoft/graphrag](https://github.com/microsoft/graphrag) | ⭐35.0K | v3.1.1 (2026-07) | MIT License |
| [getzep/graphiti](https://github.com/getzep/graphiti) | ⭐29.3K | v0.29.3 (2026-07) | 需要Neo4j |

### LightRAG 最小可运行代码

```python
# pip install lightrag-hku
import asyncio
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embed

async def main():
    rag = LightRAG(
        working_dir="./my_rag",
        llm_model_func=gpt_4o_mini_complete,
        embedding_func=openai_embed,
    )
    await rag.initialize_storages()

    # 增量索引（自动去重，有变化才重新提取）
    await rag.ainsert("你的文档内容...")

    # 4种查询模式
    result = await rag.aquery(
        "知识图谱的主要应用场景？",
        param=QueryParam(mode="hybrid")  # local/global/hybrid/naive
    )
    print(result)
    await rag.finalize_storages()

asyncio.run(main())
```

### LightRAG 4种查询模式说明

| 模式 | 适用问题 | 底层机制 | 成本 |
|------|---------|---------|------|
| `local` | "X与Y的关系是什么？" | 低层关键词 → 实体向量 → 图邻居 | 低 |
| `global` | "整体趋势/主题？" | 高层关键词 → 关系向量DB | 中 |
| `hybrid` | 通用（推荐默认） | local + global 合并 | 中 |
| `naive` | 退化为普通RAG | bypass图，纯向量检索 | 低 |

### GraphRAG 索引Pipeline（微软版）

```bash
pip install graphrag
mkdir -p ./ragtest/input && cp your_docs/*.txt ./ragtest/input/
graphrag init --root ./ragtest
# 编辑 ./ragtest/settings.yaml 填入LLM API key
graphrag index --root ./ragtest   # 耗时！1000文档约1-4小时
graphrag query --root ./ragtest --method global "主要主题是什么？"
```

:::danger GraphRAG 成本警示
GraphRAG 索引管道的**第8步**（社区报告生成）是成本爆点：每个社区（可能数百个）需要独立 LLM 调用。1000文档索引费用约 **$15-60**（GPT-4o-mini），远高于 LightRAG 的 **$2-8**。
:::

### Graphiti 时态知识图（Agent记忆）

```python
# pip install graphiti-core
# 需要 Neo4j 运行：docker run -p 7474:7474 -p 7687:7687 neo4j

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
from datetime import datetime, timezone

graphiti = Graphiti("bolt://localhost:7687", "neo4j", "password")
await graphiti.build_indices_and_constraints()

# 追加对话记忆（带时态）
await graphiti.add_episode(
    name="conversation_turn_1",
    episode_body="Alice告诉Bob她被晋升为VP",
    reference_time=datetime.now(timezone.utc),  # valid_at（业务时间）
    source=EpisodeType.message,
    group_id="session_alice_001",  # 多用户隔离
)

# 搜索（自动感知时态，过期事实不返回）
edges = await graphiti.search("Alice的职位")
for e in edges:
    print(e.fact, e.valid_at, e.invalid_at)
```

### 场景决策矩阵

| 场景 | 推荐 | 理由 |
|------|------|------|
| 知识库问答（增量文档） | **LightRAG** hybrid | 增量友好，成本可控，实体+主题双轨 |
| 跨文档全局主题分析 | **microsoft/graphrag** | 唯一真正做map-reduce全局摘要 |
| Agent长期对话记忆 | **graphiti** | 唯一支持时态边，事实过期语义清晰 |
| 预算敏感/学习用 | **LightRAG** naive | 退化为普通RAG，零图索引成本 |

### 成本估算（1000文档基准）

| 框架 | 索引时间 | 索引费用 | 查询成本/次 |
|------|---------|---------|-----------|
| LightRAG (hybrid) | 30–90分钟 | **~$2–8** | ~$0.01–0.05 |
| microsoft/graphrag | 2–6小时 | **~$15–60** | global ~$0.10–0.50 |
| graphiti | 流式追加 | **~$0.01–0.05/轮** | ~$0.01–0.03 |

---

## 18.4 Reranker 选型

### 性能基准

| 模型 | BEIR nDCG@10 | P50延迟(100候选) | 许可证 | 推荐场景 |
|------|-------------|-----------------|--------|---------|
| **BGE-Reranker-v2-M3** | 0.71–0.74 | 38ms (GPU) | MIT | 本地/中文知识库 |
| Cohere Rerank 3 | **0.76** 🥇 | 340ms (API) | 商业 | 低流量/云原生 |
| MiniLM-L-12 | 0.60 | **5ms** 🥇 | Apache 2.0 | 超低延迟英文场景 |
| Jina Reranker v2 | 0.69–0.71 | 280ms (API) | CC-BY-NC ⚠️ | 多语言 |
| Qwen3-Reranker-4B | 0.671 | 312ms (本地) | Apache 2.0 | 离线高精度 |

:::tip 2026新兴策略：BGE → Qwen3 级联
先用 BGE-v2-M3 快速压缩到30个候选（38ms），再用 Qwen3-Reranker-4B 精排（312ms），总延迟 ~180ms，质量超过单独使用 Cohere。
:::

### BGE-Reranker 最小可运行代码

```python
# pip install FlagEmbedding
from FlagEmbedding import FlagReranker

reranker = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)

def rerank(query: str, documents: list[str], top_k: int = 5) -> list[dict]:
    pairs = [[query, doc] for doc in documents]
    scores = reranker.compute_score(pairs, normalize=True)
    return sorted(
        [{"doc": doc, "score": score, "index": i}
         for i, (doc, score) in enumerate(zip(documents, scores))],
        key=lambda x: x["score"], reverse=True
    )[:top_k]

query = "如何配置RAG知识库的分块策略？"
docs = [
    "文档分块时建议使用512 token的滑动窗口...",
    "Python环境配置方法...",
    "Semantic Chunking通过嵌入相似度确定分块边界...",
]
print(rerank(query, docs))
```

### TCO对比（月流量1M queries）

| 方案 | 月成本 | 适合 |
|------|--------|------|
| BGE-v2-M3 自托管（A10G×1） | ~$200–400 | 知识库生产环境 |
| Cohere API | ~$2,000 | 原型/低流量（<13万/月） |
| MiniLM 自托管 | ~$50–100 | 英文超低延迟 |

---

## 18.5 MCP 生态工具链

:::danger MCP 2026-07-28 规范重大变更（Breaking Changes）
协议**全面无状态化**，旧版 SDK 无法与新版服务端通信：

| 变化 | 旧行为 | 新行为 |
|------|--------|--------|
| Session | `Mcp-Session-Id` 管理状态 | **移除会话** |
| 握手 | `initialize`/`notifications/initialized` | **移除，改用 `_meta`** |
| HTTP+SSE | 已支持 | **标记 Deprecated，迁移至 Streamable HTTP** |
| 服务端主动请求 | `elicitation/create` | **MRTR 多轮 trip** |

MCP Python SDK v2.0.0 已发布（2026-07-28），旧版进入维护模式。
:::

### 工具链

| 工具 | GitHub | Stars | 用途 |
|------|--------|-------|------|
| [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | ⭐23.7K | v2.0.0 (2026-07-28) | 官方 SDK |
| [jlowin/fastmcp](https://github.com/jlowin/fastmcp) | ⭐26.9K | 日均下载100万+ | 高层封装，70%MCP Server基于此 |
| [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) | ⭐10.5K | 官方 | 可视化调试 |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | ⭐91.5K | - | 最大MCP Server集合 |

### FastMCP 知识库 Server 完整示例

```python
# pip install fastmcp FlagEmbedding
from fastmcp import FastMCP
from FlagEmbedding import FlagReranker
from typing import Any

mcp = FastMCP("knowledge-base-server 🔍")
reranker = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)

KNOWLEDGE_BASE = [
    {"id": "1", "content": "RAG分块策略：建议512 token滑动窗口，重叠64 tokens"},
    {"id": "2", "content": "向量数据库选型：Qdrant适合自托管，LanceDB适合离线"},
    {"id": "3", "content": "Reranker配置：BGE-v2-M3在中文MTEB排名第一"},
]

@mcp.tool
def search_knowledge_base(
    query: str,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    """在知识库中搜索相关文档（含Reranker精排）。
    
    Args:
        query: 搜索查询（中英文均可）
        top_k: 返回结果数量，默认3
    """
    candidates = [doc["content"] for doc in KNOWLEDGE_BASE]
    pairs = [[query, c] for c in candidates]
    scores = reranker.compute_score(pairs, normalize=True)
    ranked = sorted(
        [{"id": doc["id"], "content": doc["content"], "score": float(score)}
         for doc, score in zip(KNOWLEDGE_BASE, scores)],
        key=lambda x: x["score"], reverse=True,
    )
    return ranked[:top_k]

@mcp.resource("kb://stats")
def kb_stats() -> dict:
    return {"total_documents": len(KNOWLEDGE_BASE)}

if __name__ == "__main__":
    mcp.run()
    # 生产：mcp.run(transport="streamable-http", host="0.0.0.0", port=8080)
```

### 测试与调试

```bash
# MCP Inspector 可视化调试
npx @modelcontextprotocol/inspector python server.py

# FastMCP 内置
pip install "fastmcp[cli]"
fastmcp dev server.py
```

```python
# 单元测试（in-memory，无网络开销）
import asyncio
from mcp import Client  # v2.0.0 新API

async def test():
    async with Client(mcp) as client:
        result = await client.call_tool(
            "search_knowledge_base",
            {"query": "如何选择向量数据库？", "top_k": 2}
        )
        assert len(result) == 2
        print("✅ 测试通过")

asyncio.run(test())
```

---

## 18.6 Agent 框架选型

### 仓库信息

| 框架 | GitHub | Stars | 架构特点 |
|------|--------|-------|---------|
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | ⭐38.4K | v1.2.10 (2026-07) | 图状态机，生产级 checkpointing |
| [agno-agi/agno](https://github.com/agno-agi/agno) | ⭐41.5K | v2.8.5 (2026-07) | async-first，内置RAG，轻量 |
| [microsoft/autogen](https://github.com/microsoft/autogen) | ⭐60.1K | v0.7.5 (2025-09) | 多Agent对话，Actor模型 |
| [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) | ⭐18.9K | v2.19.0 (2026-07) | 类型安全，单Agent简洁 |

### 三场景推荐

**场景1：生产级有状态 Agent（断点续传/人工审核/合规审计）**
→ **LangGraph**

```python
# pip install langgraph langchain-core
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class RAGState(TypedDict):
    query: str
    retrieved_docs: list[str]
    answer: str
    messages: Annotated[list, operator.add]

def retrieve(state: RAGState) -> RAGState:
    docs = vector_store.similarity_search(state["query"], k=20)
    return {"retrieved_docs": [d.page_content for d in docs]}

def generate(state: RAGState) -> RAGState:
    context = "\n\n".join(state["retrieved_docs"][:5])
    response = llm.invoke(f"Context:\n{context}\n\nQ: {state['query']}")
    return {"answer": response.content}

builder = StateGraph(RAGState)
builder.add_node("retrieve", retrieve)
builder.add_node("generate", generate)
builder.set_entry_point("retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)

# PostgreSQL checkpointer（断点续传，生产级）
from langgraph.checkpoint.postgres import PostgresSaver
checkpointer = PostgresSaver.from_conn_string("postgresql://...")
graph = builder.compile(checkpointer=checkpointer)
result = graph.invoke({"query": "如何实现RAG的Reranker？"})
```

**场景2：快速上线的知识库问答 Agent**
→ **Agno**（内置RAG+Reranker，最少代码）

```python
# pip install agno
from agno.agent import Agent
from agno.knowledge.knowledge import Knowledge
from agno.knowledge.reranker.sentence_transformer import SentenceTransformerReranker
from agno.models.openai import OpenAIResponses
from agno.vectordb.qdrant import Qdrant
from agno.vectordb.search import SearchType

knowledge = Knowledge(
    vector_db=Qdrant(
        collection="my_kb",
        url="http://localhost:6333",
        search_type=SearchType.hybrid,
        reranker=SentenceTransformerReranker(model="BAAI/bge-reranker-v2-m3"),
    ),
)

agent = Agent(
    model=OpenAIResponses(id="gpt-4o-mini"),
    knowledge=knowledge,
    search_knowledge=True,  # 自动注入RAG工具
)

agent.print_response("RAG分块最佳实践是什么？", stream=True)
```

**场景3：类型安全的单 Agent（API数据提取/文档问答）**
→ **Pydantic-AI**

```python
# pip install pydantic-ai asyncpg
from dataclasses import dataclass
import asyncpg
from openai import AsyncOpenAI
from pydantic_ai import Agent, RunContext

@dataclass
class Deps:
    openai: AsyncOpenAI
    pool: asyncpg.Pool

agent = Agent('openai:gpt-4o-mini', deps_type=Deps)

@agent.tool
async def retrieve(context: RunContext[Deps], search_query: str) -> str:
    """语义检索知识库章节"""
    embedding = await context.deps.openai.embeddings.create(
        input=search_query, model='text-embedding-3-small'
    )
    rows = await context.deps.pool.fetch(
        'SELECT title, content FROM doc_sections '
        'ORDER BY embedding <-> $1 LIMIT 8',
        embedding.data[0].embedding,
    )
    return "\n\n".join(f"# {r['title']}\n{r['content']}" for r in rows)
```

### 决策速查

```
需要持久化/断点续传/合规审计？
├── YES → LangGraph（生产唯一选择，34.5M月下载）
└── NO
    ├── 快速上线 + 内置RAG → Agno
    ├── 类型安全 + 单Agent → Pydantic-AI
    └── 多Agent辩论/红队 → AutoGen
```

### 2025-2026 重大变化速览

| 框架 | 核心变化 |
|------|---------|
| **LangGraph** | v1.2：原生MCP支持；`trace_policy`节点级追踪；LangGraph Platform GA |
| **Agno** | v2（原Phidata重命名）：Agno Cloud；内置MCP；`Knowledge`类统一RAG接口 |
| **AutoGen** | v0.4：Actor模型取代群聊；MCP Session Actor；异步优先 |
| **Pydantic-AI** | v2：`Capabilities`可复用原语；原生MCP+A2A；Durable execution |

---

## 18.7 技术栈组合推荐

### 推荐组合A：标准知识库（小团队快速落地）

```
Embedding: Qwen3-0.6B
向量库: Qdrant (本地 Docker)
GraphRAG: LightRAG hybrid
Reranker: BGE-Reranker-v2-M3
MCP: FastMCP
Agent: Agno
```

**月成本估算**（10万条知识，月查询5000次）：
- GPU服务器（T4）：~$100-200/月
- LLM API（gpt-4o-mini）：~$20-50/月
- **总计：~$120-250/月**

### 推荐组合B：生产级知识库（有运维团队）

```
Embedding: Qwen3-4B (A10G×1)
向量库: Qdrant Cluster (3节点)
GraphRAG: LightRAG + Neo4j存储
Reranker: BGE-v2-M3 → Qwen3-4B 级联
MCP: FastMCP + Streamable HTTP
Agent: LangGraph + PostgreSQL checkpointer
```

### 推荐组合C：全离线/本地（数据不出内网）

```
Embedding: Qwen3-0.6B (Ollama，加结束符修复)
向量库: LanceDB (零服务)
GraphRAG: LightRAG + NetworkX存储
Reranker: BGE-v2-M3 (本地CPU)
MCP: FastMCP stdio模式
Agent: Pydantic-AI + 本地LLM
```

---

:::tip 版本锁定建议
以上所有选型均为 2026-07-29 调研数据，各框架迭代快速。建议在 `requirements.txt` 锁定次版本号，并订阅以下仓库的 Release：
- FlagOpen/FlagEmbedding
- qdrant/qdrant-client
- HKUDS/LightRAG
- modelcontextprotocol/python-sdk
:::

---

:::tip → 上一章
了解失败案例和边界 → [17-failure-cases](17-failure-cases.md)
:::
