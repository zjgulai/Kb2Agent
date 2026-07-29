---
name: knowledge-ops-runbook
description: 知识库工程生产运维Runbook，覆盖腐烂告警/向量库迁移/Embedding升级/MCP上线回滚/成本熔断五大SOP，每项均包含可直接执行的检测脚本和决策树。供运维/工程师在生产事故中快速定位和处置。
---

# 第二十章：生产运维 Runbook

> **本章用途**：从「学会了」到「敢上生产」的最后一关。第1-19章覆盖构建知识，本章覆盖**运维知识**——出了问题怎么诊断、怎么修、怎么不再犯。每个 SOP 都可直接复制执行。
>
> **使用方式**：按场景跳转。出事时先看本章，不要凭感觉操作。

---

## 本章导航

| 场景 | SOP | 紧急度 |
|------|-----|-------|
| 检索质量下降 / 用户反馈答非所问 | §20.1 知识库腐烂诊断 | 🔴 P1 |
| 向量库从 Chroma/Weaviate 迁移到 Qdrant | §20.2 向量库零停机迁移 | 🟡 P2 |
| Embedding 模型版本升级 | §20.3 Embedding 升级 SOP | 🟡 P2 |
| MCP Server 上线 / 回滚 | §20.4 MCP 发布 Checklist | 🟠 P1.5 |
| Token 费用突增 / 成本告警 | §20.5 成本熔断与限流 | 🔴 P1 |

---

## 20.1 知识库腐烂诊断 SOP

### 腐烂的三种表现

```
症状A: 检索结果相关性分数持续下降（week-over-week）
症状B: 用户反馈「答非所问」比例上升
症状C: 相同问题，上周答对，这周答错
```

### 自动健康度检测脚本

```python
# pip install qdrant-client sentence-transformers ragas datasets
# 保存为 scripts/kb_health_check.py
# 用法：python scripts/kb_health_check.py --collection knowledge --threshold 0.65

import argparse
import json
from datetime import datetime, timedelta
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

def check_collection_health(
    collection: str,
    qdrant_url: str = "http://localhost:6333",
    embed_model: str = "BAAI/bge-m3",
    sample_queries: list[str] | None = None,
    threshold: float = 0.65,
) -> dict:
    """知识库健康度自动检测，返回诊断报告"""
    
    client = QdrantClient(url=qdrant_url)
    encoder = SentenceTransformer(embed_model)
    
    report = {
        "collection": collection,
        "checked_at": datetime.now().isoformat(),
        "issues": [],
        "metrics": {},
    }
    
    # ── 检查1：集合基本状态 ──────────────────────────────────
    try:
        info = client.get_collection(collection)
        total = info.points_count
        report["metrics"]["total_points"] = total
        
        if total == 0:
            report["issues"].append({
                "severity": "CRITICAL",
                "code": "EMPTY_COLLECTION",
                "message": f"集合 {collection} 为空，知识库未入库",
            })
            return report
        
        # 检查向量维度一致性
        vec_config = info.config.params.vectors
        if hasattr(vec_config, "size"):
            report["metrics"]["vector_dim"] = vec_config.size
    except Exception as e:
        report["issues"].append({
            "severity": "CRITICAL",
            "code": "COLLECTION_UNREACHABLE",
            "message": str(e),
        })
        return report
    
    # ── 检查2：知识新鲜度（最近7天是否有更新）──────────────────
    cutoff = datetime.now() - timedelta(days=7)
    try:
        recent = client.scroll(
            collection_name=collection,
            scroll_filter={
                "must": [{
                    "key": "updated_at",
                    "range": {"gte": cutoff.timestamp()},
                }]
            },
            limit=1,
            with_payload=False,
            with_vectors=False,
        )
        recent_count = len(recent[0])
        report["metrics"]["updated_last_7d"] = recent_count
        
        if recent_count == 0:
            report["issues"].append({
                "severity": "WARNING",
                "code": "STALE_KNOWLEDGE",
                "message": "7天内无任何知识更新，建议检查入库 Pipeline 是否正常运行",
            })
    except Exception:
        pass  # payload字段不存在则跳过
    
    # ── 检查3：检索质量抽样（用黄金问题集）────────────────────
    if sample_queries:
        low_score_count = 0
        scores = []
        for query in sample_queries[:20]:  # 最多取20条避免超时
            q_emb = encoder.encode([query], normalize_embeddings=True)[0]
            hits = client.search(
                collection_name=collection,
                query_vector=q_emb.tolist(),
                limit=1,
                score_threshold=0.0,
            )
            if hits:
                score = hits[0].score
                scores.append(score)
                if score < threshold:
                    low_score_count += 1
        
        if scores:
            avg_score = sum(scores) / len(scores)
            report["metrics"]["avg_top1_score"] = round(avg_score, 4)
            report["metrics"]["low_score_ratio"] = round(low_score_count / len(scores), 4)
            
            if avg_score < threshold:
                report["issues"].append({
                    "severity": "ERROR",
                    "code": "LOW_RETRIEVAL_QUALITY",
                    "message": f"平均召回分 {avg_score:.3f} < 阈值 {threshold}，"
                               f"疑似Embedding漂移或知识腐烂",
                    "hint": "执行 §20.3 Embedding 升级 SOP",
                })
    
    # ── 汇总结论 ────────────────────────────────────────────
    critical = [i for i in report["issues"] if i["severity"] == "CRITICAL"]
    errors   = [i for i in report["issues"] if i["severity"] == "ERROR"]
    warnings = [i for i in report["issues"] if i["severity"] == "WARNING"]
    
    if critical:
        report["status"] = "CRITICAL"
    elif errors:
        report["status"] = "DEGRADED"
    elif warnings:
        report["status"] = "WARNING"
    else:
        report["status"] = "HEALTHY"
    
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default="knowledge")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--threshold", type=float, default=0.65)
    parser.add_argument("--queries-file", help="黄金问题集 JSON 文件路径")
    args = parser.parse_args()
    
    queries = None
    if args.queries_file:
        with open(args.queries_file) as f:
            queries = json.load(f)
    
    report = check_collection_health(
        collection=args.collection,
        qdrant_url=args.qdrant_url,
        sample_queries=queries,
        threshold=args.threshold,
    )
    
    print(json.dumps(report, ensure_ascii=False, indent=2))
    
    # CI退出码：健康=0，警告=1，降级=2，严重=3
    exit_codes = {"HEALTHY": 0, "WARNING": 1, "DEGRADED": 2, "CRITICAL": 3}
    exit(exit_codes.get(report["status"], 3))
```

### 腐烂根因决策树

```
检索质量下降
├── avg_top1_score < 0.5 → 极度腐烂
│   ├── 近期有 Embedding 模型升级？→ 是 → §20.3 全量重新向量化
│   └── 否 → 检查原始文档是否被删改 → 重新入库
│
├── 0.5 ≤ avg_top1_score < 阈值 → 轻度腐烂
│   ├── updated_last_7d = 0 → Pipeline 挂了，检查 cron/scheduler
│   └── 有更新但质量下降 → 检查新入库文档的分块策略是否变更
│
└── 分数正常但用户反馈差 → 不是召回问题，是生成问题
    ├── 检查 Reranker 是否正常工作
    └── 检查 LLM Prompt 是否变更
```

### 定时巡检配置（cron）

```bash
# crontab -e 添加：每天 02:00 执行健康检查，异常时发钉钉告警
0 2 * * * cd /app && python scripts/kb_health_check.py \
  --collection knowledge \
  --queries-file golden_queries.json \
  2>&1 | tee /var/log/kb_health.log \
  | grep -E '"status": "(DEGRADED|CRITICAL)"' \
  && curl -s -X POST "https://oapi.dingtalk.com/robot/send?access_token=TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"msgtype":"text","text":{"content":"⚠️ 知识库健康检查异常，请查看日志"}}'
```

---

## 20.2 向量库零停机迁移 SOP

**场景**：从 ChromaDB / Weaviate / 本地 Faiss 迁移到 Qdrant（不停服）

### 迁移原则

```
1. 新库先写（双写）→ 2. 数据迁移 → 3. 流量切换 → 4. 旧库只读 → 5. 旧库下线
不要直接停旧库再导入，会有服务中断窗口
```

### 完整迁移脚本

```python
# pip install qdrant-client chromadb tqdm
# 保存为 scripts/migrate_to_qdrant.py

import argparse
from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, PayloadSchemaType
)

# ── Step 1：初始化目标 Qdrant 集合 ──────────────────────────
def init_qdrant_collection(
    client: QdrantClient,
    collection: str,
    vector_dim: int,
    recreate: bool = False,
):
    existing = [c.name for c in client.get_collections().collections]
    if collection in existing:
        if recreate:
            client.delete_collection(collection)
        else:
            print(f"集合 {collection} 已存在，跳过创建（追加模式）")
            return
    
    client.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(size=vector_dim, distance=Distance.COSINE),
        on_disk_payload=True,  # payload 存磁盘，减少内存占用
    )
    # 创建 payload 索引以支持过滤检索
    client.create_payload_index(
        collection_name=collection,
        field_name="source",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print(f"✅ Qdrant 集合 {collection} 创建完成，向量维度={vector_dim}")


# ── Step 2：从 Chroma 读取并写入 Qdrant ─────────────────────
def migrate_from_chroma(
    chroma_path: str,
    chroma_collection: str,
    qdrant_url: str,
    qdrant_collection: str,
    batch_size: int = 256,
):
    import chromadb
    import uuid
    
    # 连接源库
    chroma = chromadb.PersistentClient(path=chroma_path)
    src = chroma.get_collection(chroma_collection)
    total = src.count()
    print(f"源库 {chroma_collection}：{total} 条记录")
    
    # 连接目标库
    qdrant = QdrantClient(url=qdrant_url)
    
    # 探测向量维度
    sample = src.get(limit=1, include=["embeddings"])
    vector_dim = len(sample["embeddings"][0])
    init_qdrant_collection(qdrant, qdrant_collection, vector_dim)
    
    # 批量迁移
    migrated = 0
    offset = 0
    with tqdm(total=total, desc="迁移进度") as pbar:
        while offset < total:
            batch = src.get(
                limit=batch_size,
                offset=offset,
                include=["embeddings", "documents", "metadatas"],
            )
            if not batch["ids"]:
                break
            
            points = []
            for i, chroma_id in enumerate(batch["ids"]):
                # 尽量保留原始 ID，否则生成 UUID
                try:
                    point_id = int(chroma_id)
                except (ValueError, TypeError):
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chroma_id))
                
                payload = batch["metadatas"][i] or {}
                payload["text"] = batch["documents"][i] or ""
                payload["_chroma_id"] = chroma_id  # 保留原始 ID 用于排查
                
                points.append(PointStruct(
                    id=point_id,
                    vector=batch["embeddings"][i],
                    payload=payload,
                ))
            
            qdrant.upsert(collection_name=qdrant_collection, points=points)
            migrated += len(points)
            offset += batch_size
            pbar.update(len(points))
    
    print(f"\n✅ 迁移完成：{migrated}/{total} 条")
    
    # 验证
    qdrant_count = qdrant.get_collection(qdrant_collection).points_count
    if qdrant_count != total:
        print(f"⚠️  数量不一致：源={total}，目标={qdrant_count}，请检查日志")
    else:
        print(f"✅ 数量验证通过：{qdrant_count} 条")
    
    return migrated


# ── Step 3：迁移后检索对比验证 ──────────────────────────────
def verify_migration(
    test_vectors: list[list[float]],
    chroma_path: str,
    chroma_collection: str,
    qdrant_url: str,
    qdrant_collection: str,
    top_k: int = 5,
) -> float:
    """用同一批查询向量对比两库Top-K结果的重叠率，验证迁移质量"""
    import chromadb
    
    chroma = chromadb.PersistentClient(path=chroma_path)
    src = chroma.get_collection(chroma_collection)
    qdrant = QdrantClient(url=qdrant_url)
    
    overlap_rates = []
    for vec in test_vectors[:50]:
        chroma_res = src.query(query_embeddings=[vec], n_results=top_k)
        chroma_ids = set(chroma_res["ids"][0])
        
        qdrant_res = qdrant.search(
            collection_name=qdrant_collection,
            query_vector=vec,
            limit=top_k,
        )
        qdrant_ids = set(str(r.payload.get("_chroma_id", r.id)) for r in qdrant_res)
        
        overlap = len(chroma_ids & qdrant_ids) / top_k
        overlap_rates.append(overlap)
    
    avg_overlap = sum(overlap_rates) / len(overlap_rates)
    print(f"Top-{top_k} 重叠率：{avg_overlap:.1%}（>90% 视为迁移成功）")
    return avg_overlap


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--chroma-path", required=True)
    parser.add_argument("--chroma-collection", default="knowledge")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--qdrant-collection", default="knowledge")
    parser.add_argument("--batch-size", type=int, default=256)
    args = parser.parse_args()
    
    migrate_from_chroma(
        chroma_path=args.chroma_path,
        chroma_collection=args.chroma_collection,
        qdrant_url=args.qdrant_url,
        qdrant_collection=args.qdrant_collection,
        batch_size=args.batch_size,
    )
```

### 流量切换步骤（应用侧）

```python
# 在应用代码中使用环境变量控制，零重启切换
import os

VECTOR_BACKEND = os.getenv("VECTOR_BACKEND", "chroma")  # chroma | qdrant

def get_vector_client():
    if VECTOR_BACKEND == "qdrant":
        from qdrant_client import QdrantClient
        return QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
    else:
        import chromadb
        return chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma"))
```

```bash
# 迁移后的流量切换命令（不重启服务）
# 1. 启动双写（新库同步写入）
export VECTOR_BACKEND=dual_write

# 2. 数据迁移完成后，切换读取到 Qdrant
export VECTOR_BACKEND=qdrant

# 3. 观察 24h 无异常后，停止旧库写入
export VECTOR_BACKEND=qdrant_only
```

---

## 20.3 Embedding 模型升级 SOP

**场景**：从旧 Embedding（如 text2vec-base）升级到新模型（如 Qwen3-0.6B / BGE-M3）

:::danger 核心风险
新旧 Embedding 的向量空间**不兼容**。不能只更新 Embedding 模型，必须**全量重新向量化整个库**。部分更新会导致新旧向量混在一起，检索结果严重失真。
:::

### 升级决策树

```
是否需要升级 Embedding？
├── 当前模型 C-MTEB 分比目标低 5+ 分 → 值得升级
├── 上下文窗口不够（当前 512 tokens，需要 8K）→ 必须升级
├── 中文场景换成 Qwen3-0.6B → 值得（66.33 vs ~55）
└── 仅微小改进 → 升级成本（重算向量）可能不值得

升级方式？
├── 数据量 < 10万条 → 离线全量重算，迁移到新集合，切换
└── 数据量 > 10万条 → 蓝绿部署（并行运行新旧集合，灰度切流）
```

### 全量重新向量化脚本

```python
# pip install qdrant-client sentence-transformers tqdm
# 保存为 scripts/reembed.py
# 用法：python scripts/reembed.py --old-collection knowledge --new-collection knowledge_v2

import os
import argparse
from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

def reembed_collection(
    old_collection: str,
    new_collection: str,
    new_model_name: str,
    qdrant_url: str = "http://localhost:6333",
    batch_size: int = 128,
    text_field: str = "text",
):
    client = QdrantClient(url=qdrant_url, timeout=60)
    encoder = SentenceTransformer(new_model_name)
    
    # 探测新模型维度
    sample_dim = len(encoder.encode(["test"])[0])
    print(f"新模型 {new_model_name}，向量维度：{sample_dim}")
    
    # 创建新集合
    existing = [c.name for c in client.get_collections().collections]
    if new_collection in existing:
        client.delete_collection(new_collection)
    client.create_collection(
        collection_name=new_collection,
        vectors_config=VectorParams(size=sample_dim, distance=Distance.COSINE),
        on_disk_payload=True,
    )
    
    # 滚动读取旧集合，重新向量化写入新集合
    total = client.get_collection(old_collection).points_count
    offset = None
    processed = 0
    
    with tqdm(total=total, desc="重新向量化") as pbar:
        while True:
            records, next_offset = client.scroll(
                collection_name=old_collection,
                limit=batch_size,
                offset=offset,
                with_payload=True,
                with_vectors=False,  # 不需要旧向量
            )
            if not records:
                break
            
            # 提取文本
            texts = [r.payload.get(text_field, "") for r in records]
            
            # 新模型重新编码
            is_query = False  # 文档不用 prompt_name
            new_vectors = encoder.encode(
                texts,
                normalize_embeddings=True,
                batch_size=32,
                show_progress_bar=False,
            )
            
            # 写入新集合
            points = [
                PointStruct(
                    id=r.id,
                    vector=vec.tolist(),
                    payload=r.payload,  # payload 原样保留
                )
                for r, vec in zip(records, new_vectors)
            ]
            client.upsert(collection_name=new_collection, points=points)
            
            processed += len(records)
            pbar.update(len(records))
            
            if next_offset is None:
                break
            offset = next_offset
    
    print(f"\n✅ 重新向量化完成：{processed} 条 → {new_collection}")
    return processed


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--old-collection", required=True)
    parser.add_argument("--new-collection", required=True)
    parser.add_argument("--model", default="BAAI/bge-m3")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--batch-size", type=int, default=128)
    args = parser.parse_args()
    
    reembed_collection(
        old_collection=args.old_collection,
        new_collection=args.new_collection,
        new_model_name=args.model,
        qdrant_url=args.qdrant_url,
        batch_size=args.batch_size,
    )
```

### 升级后 A/B 验证

```python
# 用同一组黄金问题，对比新旧集合的召回质量
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

def ab_compare(
    queries: list[str],
    old_collection: str,
    new_collection: str,
    old_model: str,
    new_model: str,
    qdrant_url: str = "http://localhost:6333",
    top_k: int = 5,
):
    client = QdrantClient(url=qdrant_url)
    enc_old = SentenceTransformer(old_model)
    enc_new = SentenceTransformer(new_model)
    
    print(f"{'Query':<40} {'旧模型 Top1分':<16} {'新模型 Top1分':<16} {'改善'}")
    print("-" * 85)
    
    improvements = []
    for q in queries:
        old_vec = enc_old.encode([q], normalize_embeddings=True)[0]
        new_vec = enc_new.encode([q], prompt_name="query", normalize_embeddings=True)[0]
        
        old_hits = client.search(old_collection, old_vec.tolist(), limit=top_k)
        new_hits = client.search(new_collection, new_vec.tolist(), limit=top_k)
        
        old_score = old_hits[0].score if old_hits else 0
        new_score = new_hits[0].score if new_hits else 0
        delta = new_score - old_score
        improvements.append(delta)
        
        sign = "✅" if delta > 0.02 else ("⚠️" if delta < -0.02 else "➖")
        print(f"{q[:38]:<40} {old_score:.4f}          {new_score:.4f}          {sign} {delta:+.4f}")
    
    avg_delta = sum(improvements) / len(improvements)
    print(f"\n平均改善：{avg_delta:+.4f}")
    if avg_delta > 0.01:
        print("✅ 新模型更优，建议切换")
    elif avg_delta < -0.01:
        print("❌ 新模型更差，继续使用旧模型")
    else:
        print("➖ 差异不显著，综合考虑成本再决策")
    
    return avg_delta
```

### 应用侧切换（环境变量控制，零重启）

```bash
# 1. 完成重新向量化并验证通过后
# 2. 更新环境变量，触发应用热重载
export EMBED_MODEL="BAAI/bge-m3"          # 新模型
export QDRANT_COLLECTION="knowledge_v2"   # 新集合

# 3. 若使用 systemd
systemctl reload myapp  # 触发配置重载，不停进程

# 4. 观察 1h 无问题后，删除旧集合释放存储
python -c "
from qdrant_client import QdrantClient
QdrantClient('http://localhost:6333').delete_collection('knowledge_v1')
print('旧集合已删除')
"
```

---

## 20.4 MCP Server 上线 / 回滚 Checklist

### 上线前检查清单

```bash
#!/bin/bash
# scripts/mcp_precheck.sh
# 用法：bash scripts/mcp_precheck.sh

set -e
PASS=0; FAIL=0

check() {
    local name="$1"; local cmd="$2"
    if eval "$cmd" &>/dev/null; then
        echo "✅ $name"
        ((PASS++))
    else
        echo "❌ $name"
        ((FAIL++))
    fi
}

echo "=== MCP Server 上线前检查 ==="

# 基础依赖
check "Python >= 3.10"       "python3 -c 'import sys; assert sys.version_info >= (3,10)'"
check "fastmcp 已安装"        "python3 -c 'import fastmcp'"
check "qdrant-client 已安装"  "python3 -c 'import qdrant_client'"

# 服务连通性
check "Qdrant 可达"          "curl -sf http://localhost:6333/healthz"
check "知识库集合存在"        "python3 -c \"
from qdrant_client import QdrantClient
cols = [c.name for c in QdrantClient('http://localhost:6333').get_collections().collections]
assert 'knowledge' in cols, f'集合不存在: {cols}'
\""

# MCP Server 本体
check "MCP Server 语法正确"  "python3 -m py_compile src/mcp_server.py"
check "MCP Server 可启动"    "timeout 3 python3 src/mcp_server.py --dry-run 2>/dev/null || true"

# 配置文件
check "环境变量 QDRANT_URL 已设置"   "[ -n '$QDRANT_URL' ]"
check "环境变量 EMBED_MODEL 已设置"  "[ -n '$EMBED_MODEL' ]"

echo ""
echo "结果：✅ $PASS 通过  ❌ $FAIL 失败"
[ $FAIL -eq 0 ] && echo "✅ 可以上线" || { echo "❌ 请修复失败项再上线"; exit 1; }
```

### MCP Server 健康探针

```python
# 在 FastMCP Server 中添加 health 工具（供监控系统探测）
import fastmcp
from qdrant_client import QdrantClient
import os

mcp = fastmcp.FastMCP("knowledge-mcp")

@mcp.tool()
def health_check() -> dict:
    """MCP Server 健康探针，返回服务状态"""
    status = {"mcp": "ok", "issues": []}
    
    # 检查向量库连通性
    try:
        client = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
        collection = os.getenv("QDRANT_COLLECTION", "knowledge")
        info = client.get_collection(collection)
        status["qdrant"] = "ok"
        status["points_count"] = info.points_count
    except Exception as e:
        status["qdrant"] = "error"
        status["issues"].append(f"Qdrant: {e}")
    
    # 检查 Embedding 模型是否加载
    try:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("EMBED_MODEL", "BAAI/bge-m3")
        # 仅检查缓存是否存在，不重新加载
        import os as _os
        cache_dir = _os.path.expanduser(f"~/.cache/huggingface/hub/models--{model_name.replace('/', '--')}")
        if _os.path.exists(cache_dir):
            status["embed_model"] = "cached"
        else:
            status["embed_model"] = "not_cached"
            status["issues"].append(f"模型 {model_name} 未缓存，首次查询会下载")
    except Exception as e:
        status["embed_model"] = "error"
        status["issues"].append(str(e))
    
    status["healthy"] = len(status["issues"]) == 0
    return status
```

### 回滚 SOP

```bash
# 场景：MCP Server 上线后出现异常，需要回滚

# 1. 立即切换流量回旧版本（如果用 systemd）
systemctl stop mcp-server-v2
systemctl start mcp-server-v1

# 2. 如果用 Docker
docker stop mcp-server && docker start mcp-server-prev

# 3. 如果用环境变量路由
export MCP_VERSION=v1
systemctl reload nginx  # 重新路由

# 4. 记录回滚原因（必须）
cat >> /var/log/mcp_rollback.log << EOF
$(date -Iseconds) 回滚 v2→v1
原因: [填写具体原因]
触发人: $(whoami)
EOF

# 5. 回滚后验证
curl http://localhost:8080/mcp/health | python3 -m json.tool
```

---

## 20.5 成本熔断与限流 SOP

### 费用突增的三大原因

```
原因A：Token 用量突增
  → 某个 prompt 模板变更，context 注入了大量无关内容
  → 用户请求量真实增长（好事，但需扩容）
  → 递归调用 bug（Agent 进入死循环）

原因B：模型切换
  → 代码里 model="gpt-4" 被错误地提交（本该用 gpt-4o-mini）
  → A/B 实验忘记关闭高成本分支

原因C：重复入库
  → 入库 Pipeline 重复运行，同一文档被多次 Embedding
```

### 成本监控脚本

```python
# pip install openai anthropic litellm
# 保存为 scripts/cost_monitor.py

import os
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class CostAlert:
    level: str     # WARNING / CRITICAL
    message: str
    current_cost: float
    threshold: float

# 每百万token的成本（2026-07 价格，美元）
MODEL_COST_PER_1M = {
    # OpenAI
    "gpt-4o":               {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":          {"input": 0.15,  "output": 0.60},
    "text-embedding-3-small": {"input": 0.02,  "output": 0},
    # Anthropic
    "claude-opus-4":        {"input": 15.00, "output": 75.00},
    "claude-sonnet-4":      {"input": 3.00,  "output": 15.00},
    "claude-haiku-3-5":     {"input": 0.80,  "output": 4.00},
    # 本地部署 ≈ $0（仅算电费/GPU折旧，此处不计）
}

def estimate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """估算单次调用成本（美元）"""
    costs = MODEL_COST_PER_1M.get(model, {"input": 1.0, "output": 3.0})
    return (input_tokens * costs["input"] + output_tokens * costs["output"]) / 1_000_000


class CostGuard:
    """成本熔断器：超过阈值自动拒绝请求"""
    
    def __init__(
        self,
        daily_limit_usd: float = 10.0,
        hourly_limit_usd: float = 2.0,
        storage_path: str = "/tmp/cost_guard.json",
    ):
        self.daily_limit = daily_limit_usd
        self.hourly_limit = hourly_limit_usd
        self.storage_path = storage_path
        self._load()
    
    def _load(self):
        import json
        try:
            with open(self.storage_path) as f:
                self._data = json.load(f)
        except FileNotFoundError:
            self._data = {"records": []}
    
    def _save(self):
        import json
        with open(self.storage_path, "w") as f:
            json.dump(self._data, f)
    
    def record(self, model: str, input_tokens: int, output_tokens: int):
        """记录一次 LLM 调用"""
        cost = estimate_cost(model, input_tokens, output_tokens)
        self._data["records"].append({
            "ts": datetime.now().isoformat(),
            "model": model,
            "cost": cost,
        })
        # 只保留最近 48h 记录
        cutoff = (datetime.now() - timedelta(hours=48)).isoformat()
        self._data["records"] = [
            r for r in self._data["records"] if r["ts"] > cutoff
        ]
        self._save()
        return cost
    
    def check(self) -> list[CostAlert]:
        """检查是否触发熔断阈值"""
        alerts = []
        now = datetime.now()
        
        day_cutoff  = (now - timedelta(hours=24)).isoformat()
        hour_cutoff = (now - timedelta(hours=1)).isoformat()
        
        day_cost  = sum(r["cost"] for r in self._data["records"] if r["ts"] > day_cutoff)
        hour_cost = sum(r["cost"] for r in self._data["records"] if r["ts"] > hour_cutoff)
        
        if day_cost > self.daily_limit:
            alerts.append(CostAlert(
                level="CRITICAL",
                message=f"24h 费用 ${day_cost:.2f} 超过日限额 ${self.daily_limit:.2f}，请求已熔断",
                current_cost=day_cost,
                threshold=self.daily_limit,
            ))
        elif day_cost > self.daily_limit * 0.8:
            alerts.append(CostAlert(
                level="WARNING",
                message=f"24h 费用 ${day_cost:.2f} 已达日限额 80%",
                current_cost=day_cost,
                threshold=self.daily_limit,
            ))
        
        if hour_cost > self.hourly_limit:
            alerts.append(CostAlert(
                level="CRITICAL",
                message=f"1h 费用 ${hour_cost:.2f} 超过小时限额 ${self.hourly_limit:.2f}，疑似循环调用",
                current_cost=hour_cost,
                threshold=self.hourly_limit,
            ))
        
        return alerts
    
    def allow(self) -> bool:
        """判断当前是否允许继续调用（用于 middleware 拦截）"""
        alerts = self.check()
        return not any(a.level == "CRITICAL" for a in alerts)


# 使用示例（在 LLM 调用 wrapper 中）
guard = CostGuard(daily_limit_usd=10.0, hourly_limit_usd=2.0)

def safe_llm_call(model: str, messages: list, **kwargs):
    """带成本熔断的 LLM 调用"""
    if not guard.allow():
        alerts = guard.check()
        raise RuntimeError(f"成本熔断：{alerts[0].message}")
    
    from openai import OpenAI
    client = OpenAI()
    response = client.chat.completions.create(
        model=model, messages=messages, **kwargs
    )
    
    # 记录消耗
    usage = response.usage
    cost = guard.record(model, usage.prompt_tokens, usage.completion_tokens)
    
    # 检查是否触发告警（但不阻断当前请求）
    for alert in guard.check():
        if alert.level == "WARNING":
            import logging
            logging.warning(f"[CostGuard] {alert.message}")
    
    return response
```

### 费用突增快速排查

```bash
# 1. 查看过去 1h 的模型调用分布
python3 - << 'EOF'
import json
from collections import Counter
from datetime import datetime, timedelta

with open("/tmp/cost_guard.json") as f:
    data = json.load(f)

cutoff = (datetime.now() - timedelta(hours=1)).isoformat()
recent = [r for r in data["records"] if r["ts"] > cutoff]

model_costs = Counter()
for r in recent:
    model_costs[r["model"]] += r["cost"]

print("过去1h各模型费用：")
for model, cost in model_costs.most_common():
    print(f"  {model}: ${cost:.4f}")
print(f"合计: ${sum(model_costs.values()):.4f}")
EOF

# 2. 检查是否有 Agent 死循环（同一个 session 调用超过 N 次）
# 通过 LangFuse / Opik 追踪系统查看 trace 深度

# 3. 检查入库 Pipeline 是否重复运行
python3 -c "
from qdrant_client import QdrantClient
c = QdrantClient('http://localhost:6333')
info = c.get_collection('knowledge')
print(f'当前向量数：{info.points_count}')
# 与昨日备份对比，突增超过 20% 则疑似重复入库
"
```

---

## 20.6 快速参考卡

### 常见故障速查

| 症状 | 最可能原因 | 第一步处置 |
|------|-----------|-----------|
| 检索返回空结果 | 集合不存在 / Embedding 维度不匹配 | `kb_health_check.py --collection xxx` |
| 检索分数全 < 0.3 | 查询用了 prompt_name，文档没用（或反之） | 检查 `encode()` 调用是否对称 |
| 同一问题结果每次不同 | Top-K 采样导致 / `ef` 参数过低 | 固定 `limit` 并提高 `hnsw_ef` |
| 费用突增 5x | Agent 递归 / 模型误配置 | `cost_guard.check()` + 查 trace |
| MCP 工具调用超时 | Embedding 模型首次加载 | 加预热接口或启动时加载模型 |
| 迁移后召回质量差 | 新旧向量混用 | 确认全量重新向量化完成 |
| 知识库 7 天无更新 | cron 任务失败 | `crontab -l` + 查 `/var/log/` |

### 运维命令速查

```bash
# Qdrant 状态
curl -s http://localhost:6333/healthz
curl -s http://localhost:6333/collections | python3 -m json.tool

# 查看集合统计
python3 -c "
from qdrant_client import QdrantClient
c = QdrantClient('http://localhost:6333')
for col in c.get_collections().collections:
    info = c.get_collection(col.name)
    print(f'{col.name}: {info.points_count} 条，状态={info.status}')
"

# 备份集合快照（Qdrant 原生）
curl -X POST "http://localhost:6333/collections/knowledge/snapshots"

# 恢复快照
curl -X POST "http://localhost:6333/collections/knowledge/snapshots/recover" \
  -H "Content-Type: application/json" \
  -d '{"location": "file:///path/to/snapshot.snapshot"}'

# 强制全量健康检查
python3 scripts/kb_health_check.py \
  --collection knowledge \
  --queries-file golden_queries.json \
  --threshold 0.65
```

---

:::tip → 相关章节
- 知识库腐烂机制理论 → [11-kb-evolution](11-kb-evolution.md)
- 评估框架与黄金问题集构建 → [12-evaluation](12-evaluation.md)
- 技术选型（Qdrant/vLLM/SGLang）→ [18-tech-selection-2026](18-tech-selection-2026.md)
- 失败案例与根因分析 → [17-failure-cases](17-failure-cases.md)
:::
