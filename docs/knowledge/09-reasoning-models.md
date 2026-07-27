---
name: reasoning-models
description: 推理模型时代知识库重构文档，涵盖浅提取、深提取与推理查询的决策框架。当需要根据数据变化频率、查询频率和安全约束设计知识库存储策略时使用。
---

# 第九章：推理模型时代的知识库重构

> DeepSeek-R1、o3、Gemini 2.5 Thinking 把一个旧假设打穿了：知识库不一定要在入库前把信息“榨干”，很多分析可以推迟到查询时再做。

:::tip 核心命题
推理模型可以在查询时做深度推理，这让“预先深度结构化提取”的必要性降低了 80%。但它不是银弹——正确的策略是根据数据变化频率和查询频率来选择。
:::

## 9.1 两种范式对比：重预处理 vs 重查询

```mermaid
flowchart LR
    A1[原始多模态数据]:::entry --> A2[深度结构化提取<br/>实体/字段/关系全量抽取]:::fail
    A2 --> A3[结构化知识库<br/>metadata 完备]:::storage
    A3 --> A4[传统模型轻查询<br/>快但推理浅]:::success

    B1[原始多模态数据]:::entry --> B2[浅提取<br/>清洗 + 分块]:::success
    B2 --> B3[干净文本知识库<br/>少量 metadata]:::storage
    B3 --> B4[推理模型重查询<br/>慢但分析深]:::external

    classDef entry fill:#e3f2fd,stroke:#1e88e5,stroke-width:1px;
    classDef success fill:#c8e6c9,stroke:#43a047,stroke-width:1px;
    classDef fail fill:#ffcdd2,stroke:#e53935,stroke-width:1px;
    classDef external fill:#e1bee7,stroke:#8e24aa,stroke-width:1px;
    classDef storage fill:#e0f2f1,stroke:#00897b,stroke-width:1px;
```

| 对比维度 | 传统范式（2024） | 推理范式（2026） |
| --- | --- | --- |
| 预处理成本 | 高：先做字段、关系、标签、摘要 | 低：只做清洗、切块、去噪 |
| 查询成本 | 低：普通模型即可回答 | 高：要调用推理模型做重分析 |
| 数据新鲜度维护 | 差：源数据一变就要重抽字段 | 好：重跑分块即可更新 |
| 准确性 | 在固定字段过滤上更稳 | 在开放式分析、多跳推理上更强 |
| 适用场景 | 月更数据、高频查询、精确过滤 | 日更数据、低频分析、探索式问题 |

一句话理解：传统范式是“把钱花在入库前”，推理范式是“把钱花在查询时”。

## 9.2 决策框架：何时用哪种范式

```mermaid
flowchart LR
    A[开始选择]:::entry --> B{是否安全敏感数据?}:::entry
    B -->|是| C[本地推理模型<br/>Ollama DeepSeek-R1]:::success
    B -->|否| D{是否需要精确结构化字段过滤?}:::entry
    D -->|是| E[深提取<br/>字段必须写入 metadata]:::storage
    D -->|否| F{是否需要跨文档多跳推理?}:::entry
    F -->|是| G[推理模型 + 轻量图谱]:::external
    F -->|否| H{高变化频率 且 低查询频率?}:::entry
    H -->|是| I[浅提取 + 推理模型]:::success
    H -->|否| J{低变化频率 且 高查询频率?}:::entry
    J -->|是| K[深提取 + 传统模型]:::storage
    J -->|否| L[默认先上浅提取<br/>再按热点问题补结构化层]:::success

    classDef entry fill:#e3f2fd,stroke:#1e88e5,stroke-width:1px;
    classDef success fill:#c8e6c9,stroke:#43a047,stroke-width:1px;
    classDef external fill:#e1bee7,stroke:#8e24aa,stroke-width:1px;
    classDef storage fill:#e0f2f1,stroke:#00897b,stroke-width:1px;
```

可以把它翻译成 5 条硬规则：

1. **数据每天更新、查询每周几次**：选“浅提取 + 推理模型”。因为你不想每天重跑昂贵结构化抽取。
2. **数据月更、查询每天几百次**：选“深提取 + 传统模型”。一次重提取，换来大量便宜查询。
3. **必须按字段过滤**：比如 `price_band=20-30`、`seller_country=CN`，那就必须深提取，因为字段必须提前存在于 metadata。
4. **核心问题是跨文档多跳推理**：例如“谁在低价段缺位，且渠道评价又最好”，优先“推理模型 + 轻量图谱”，图谱负责连边，推理模型负责判断。
5. **涉及内部敏感数据**：优先本地模型，典型就是 Ollama 跑 `deepseek-r1:14b` 或 `qwen3-qwq`。

## 9.3 推理模型选型表

| 模型 | 推理能力 | 本地部署 | 适用数据级别 | Ollama命令 | 月度成本对比 |
| --- | --- | --- | --- | --- | --- |
| DeepSeek-R1:14b | 强，适合中等复杂分析 | 是 | **内部数据 / 公开数据** | `ollama pull deepseek-r1:14b` | 增量 API 成本接近 0，主要是本地算力 |
| DeepSeek-R1:70b | 很强，适合高价值决策 | 是 | **内部核心数据 / 公开数据** | `ollama pull deepseek-r1:70b` | 增量 API 成本接近 0，但硬件门槛最高 |
| o3-mini（API） | 很强，稳定性高 | 否 | **仅公开数据** | 不适用 | 约为本地 14b 的 2-4 倍查询成本 |
| Gemini 2.5 Flash Thinking（API） | 强，长上下文友好 | 否 | **仅公开数据** | 不适用 | 约为本地 14b 的 1.5-3 倍查询成本 |
| Qwen3-QwQ | 强，中文和本地化友好 | 是 | **内部数据 / 公开数据** | `ollama pull qwen3-qwq` | 与本地 R1:14b 同量级，部署更灵活 |

:::warning 选型红线
**本地部署 = 内部数据安全。API = 仅公开数据。** 如果你的语料包含利润率、供应商、用户隐私、投放计划，就不要把原文送到外部 API。
:::

## 9.4 实战代码：浅提取 Pipeline

下面的脚本故意只做两件事：**清洗**和**分块**。不抽品牌、不抽价格区间、不生成复杂 schema。传统深提取常见是 **30 秒/文档**，这个浅提取版本目标是 **约 2 秒/文档**。

```python
"""light_ingest.py

运行前安装：
pip install chromadb sentence-transformers

作用：
1. 从 raw_docs/ 读取 txt 或 md 文件
2. 只做清洗 + 分块
3. 写入 ChromaDB
4. metadata 只保留 source/date/category
"""

from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer


RAW_DIR = Path("raw_docs")
DB_DIR = Path("chroma_light")
COLLECTION_NAME = "market_docs"


@dataclass
class ChunkRecord:
    text: str
    metadata: dict


def clean_text(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_into_chunks(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunk = text[start:end].strip()
        if len(chunk) > 80:
            chunks.append(chunk)
        start = max(end - overlap, end)
    return chunks


def shallow_extract(file_path: Path, category: str) -> list[ChunkRecord]:
    raw_text = file_path.read_text(encoding="utf-8")
    cleaned = clean_text(raw_text)
    chunks = split_into_chunks(cleaned)
    today = datetime.now().strftime("%Y-%m-%d")
    return [
        ChunkRecord(
            text=chunk,
            metadata={
                "source": str(file_path),
                "date": today,
                "category": category,
            },
        )
        for chunk in chunks
    ]


def build_ids(source: str, count: int) -> list[str]:
    prefix = hashlib.md5(source.encode("utf-8")).hexdigest()[:12]
    return [f"{prefix}-{idx}" for idx in range(count)]


def main() -> None:
    client = chromadb.PersistentClient(path=str(DB_DIR))
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    encoder = SentenceTransformer("BAAI/bge-m3")

    all_docs: list[str] = []
    all_ids: list[str] = []
    all_meta: list[dict] = []

    started_at = time.perf_counter()
    for file_path in RAW_DIR.glob("*.*"):
        category = file_path.stem.split("_")[0]
        records = shallow_extract(file_path, category=category)
        ids = build_ids(str(file_path), len(records))

        all_docs.extend(record.text for record in records)
        all_meta.extend(record.metadata for record in records)
        all_ids.extend(ids)

    embeddings = encoder.encode(all_docs, normalize_embeddings=True).tolist()
    collection.upsert(ids=all_ids, documents=all_docs, metadatas=all_meta, embeddings=embeddings)

    cost_seconds = time.perf_counter() - started_at
    print(f"完成浅提取，共写入 {len(all_docs)} 个 chunk，耗时 {cost_seconds:.2f}s")
    print("对比经验值：传统深提取约 30s/文档；浅提取约 2s/文档")


if __name__ == "__main__":
    main()
```

这个脚本的核心不是“更聪明”，而是“更克制”：把推理留到查询阶段，把入库阶段压到最低成本。

## 9.5 实战代码：推理模型查询

这个版本使用本地 Ollama 运行 `DeepSeek-R1:14b`。流程是：先检索 **Top-10 原始文本块**，再让推理模型围绕“竞争格局 / 价格空白 / 机会评分”做深分析，并输出可审计的 `reasoning_chain`。

```python
"""reasoning_query.py

运行前安装：
pip install chromadb sentence-transformers ollama

并先拉模型：
ollama pull deepseek-r1:14b
"""

from __future__ import annotations

import json
from typing import Any

import chromadb
import ollama
from sentence_transformers import SentenceTransformer


DB_DIR = "chroma_light"
COLLECTION_NAME = "market_docs"
TOP_K = 10


def search_context(query: str, top_k: int = TOP_K) -> list[dict[str, Any]]:
    client = chromadb.PersistentClient(path=DB_DIR)
    collection = client.get_collection(COLLECTION_NAME)
    encoder = SentenceTransformer("BAAI/bge-m3")
    query_vector = encoder.encode([query], normalize_embeddings=True).tolist()

    result = collection.query(query_embeddings=query_vector, n_results=top_k)
    docs = result["documents"][0]
    metas = result["metadatas"][0]
    distances = result.get("distances", [[None] * len(docs)])[0]

    return [
        {
            "rank": idx + 1,
            "text": doc,
            "metadata": meta,
            "distance": distances[idx],
        }
        for idx, (doc, meta) in enumerate(zip(docs, metas))
    ]


def run_reasoning(query: str) -> dict[str, Any]:
    context_items = search_context(query)
    context_text = "\n\n".join(
        [
            f"[Chunk {item['rank']}] source={item['metadata']['source']} category={item['metadata']['category']}\n{item['text']}"
            for item in context_items
        ]
    )

    prompt = f"""
你是资深市场分析师。请只基于给定上下文回答，不要编造外部事实。

任务：分析“便携太阳能充电器 US 市场”的竞争格局、价格空白和机会评分。
用户问题：{query}

请输出严格 JSON，对象字段如下：
{{
  "competition_landscape": [{{"player": "", "positioning": "", "evidence": ""}}],
  "price_gap": {{"gap_range": "", "why_it_exists": "", "evidence": ""}},
  "opportunity_score": {{"score": 0, "demand": 0, "competition": 0, "margin": 0, "execution": 0}},
  "reasoning_chain": ["步骤1...", "步骤2...", "步骤3..."],
  "recommended_action": ["动作1", "动作2", "动作3"]
}}

上下文如下：
{context_text}
""".strip()

    response = ollama.chat(
        model="deepseek-r1:14b",
        messages=[{"role": "user", "content": prompt}],
        format="json",
    )

    payload = json.loads(response["message"]["content"])
    payload["model"] = "deepseek-r1:14b"
    payload["retrieved_chunks"] = context_items
    return payload


if __name__ == "__main__":
    result = run_reasoning("便携太阳能充电器US市场分析")
    print(json.dumps(result, ensure_ascii=False, indent=2))
```

这里最重要的变化是：**知识库不再试图预先回答“市场机会在哪”，它只负责把原始证据找回来；真正的判断，由推理模型在查询时完成。**

## 9.6 成本对比实验：什么时候推理范式更经济

以查询 **“便携太阳能充电器 US 市场分析”** 为例，假设月初要处理一批同类市场资料：

- 传统深提取预处理成本：**X = $60/月**
- 传统单次查询成本：**Y = $0.02/次**
- 推理范式预处理成本：**X/10 = $6/月**
- 推理范式单次查询成本：**Y×3 = $0.06/次**

| 项目 | 传统深提取 | 推理范式 | 解释 |
| --- | --- | --- | --- |
| 预处理成本 | X = $60 | X/10 = $6 | 浅提取不做结构化抽取，成本直接缩到十分之一 |
| 单次查询成本 | Y = $0.02 | Y×3 = $0.06 | 推理模型更贵，但只在查询时花钱 |
| 月度总成本公式 | `$60 + 0.02Q` | `$6 + 0.06Q` | Q = 月查询量 |
| 经济性阈值 | `Q = 1350` | `Q = 1350` | 低于 1350 次/月，推理范式更省 |

所以结论并不玄学：

- **月查询量 < 1350 次**：推理范式更经济。
- **月查询量 > 1350 次**：传统深提取开始反超。
- **如果数据更新频繁**，即使查询量略高，也要重新评估，因为传统范式还要承担频繁重提取的维护成本。

:::warning 反直觉洞察
推理模型不会消灭知识库，而是改变知识库的存储策略：从“存结构化知识”转向“存干净的原始信息 + 少量关键 metadata”。
:::

## 9.7 本章小结：3 个问题帮你选择范式

:::tip 决策清单
1. **数据更新有多快？** 如果是天级更新，先默认浅提取，不要为旧 schema 反复重抽。
2. **查询有多频繁？** 如果是高频固定问法，优先把答案前移到深提取阶段；如果是低频探索式问题，优先把判断留给推理模型。
3. **你到底要过滤，还是要判断？** 要过滤，就做字段化；要判断，就存原始证据给推理模型。
:::
