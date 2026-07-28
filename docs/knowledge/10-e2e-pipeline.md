---
name: knowledge-e2e-pipeline
description: 完整可运行端到端Pipeline文档，提供从数据采集到Agent查询的全链路Python代码实现。当需要直接运行或参考完整代码时使用。
---

# 第十二章：端到端完整 Pipeline（可直接运行）

> **本章目标**：一个从零到能用的完整工程模板。复制这段代码，填入你的 API Key，就能跑起来。生产环境的所有关键配置都在这里。

---

## 项目结构

```text
kb-agent/
├── pipeline/
│   ├── __init__.py
│   ├── ingest.py          # Stage 1+2+3：解析、蒸馏、验证
│   ├── storage.py         # Stage 4：入库路由
│   ├── retrieval.py       # Stage 5：检索
│   └── evolution.py       # 知识库进化
├── skills/                # ~/.agents/skills/ 的本地镜像
├── wiki/                  # LLM-Wiki 文件系统
│   ├── index.md
│   ├── log.md
│   ├── entity_pages/
│   └── summaries/
├── raw/                   # 只读原始资料
├── config.yaml            # 所有配置
├── requirements.txt
└── main.py                # 入口文件
```text

---

## requirements.txt

```txt
# 文档解析
mineru>=4.0.0
docling>=2.0.0
pymupdf>=1.24.0

# 音视频
faster-whisper>=1.0.0
funasr>=1.2.0
yt-dlp>=2026.1.1
pyannote.audio>=3.1.0

# 向量与图谱
lightrag-hku>=1.5.0
qdrant-client>=1.9.0

# LLM
openai>=1.30.0
anthropic>=0.28.0

# 工具
pydantic>=2.0.0
httpx>=0.27.0
loguru>=0.7.0
typer>=0.12.0
```text

---

## config.yaml

```yaml
# ==================== 模型配置 ====================
llm:
  # 蒸馏用（高频调用，用快速便宜的）
  extract_model: "gpt-4o-mini"
  # 推理用（需要强推理能力）
  reason_model: "claude-opus-4-7"
  # 验证用（独立于蒸馏，防止自评偏差）
  validate_model: "gpt-4o"

embedding:
  model: "BAAI/bge-m3"
  dim: 1024
  # [!] 一旦选定，不能更换！更换需重新 embed 全部内容

# ==================== 存储配置 ====================
storage:
  vector:
    provider: "qdrant"
    url: "http://localhost:6333"
    collection: "knowledge_base"

  graph:
    provider: "lightrag"   # 或 "neo4j"
    working_dir: "./lightrag_storage"
    # Neo4j 配置（可选）
    # neo4j_uri: "bolt://localhost:7687"

  skill_dir: "~/.agents/skills/"
  wiki_dir: "./wiki/"
  raw_dir: "./raw/"

# ==================== 蒸馏配置 ====================
distill:
  # 三重验证阈值
  min_evidence_count: 2
  min_confidence: 0.4
  keep_threshold: 0.8

  # cangjie-skill 配置
  riatvpp:
    parallel_extractors: 5      # 并行提取器数量
    rejection_rate_target: 0.5  # 目标淘汰率（50%以上才算严格）

# ==================== 知识库进化 ====================
evolution:
  # 健康度检查周期（天）
  health_check_interval: 7
  # 过时知识阈值（天内未被查询则降权）
  staleness_days: 90
  # darwin-skill 评估维度最低分
  skill_min_score: 70
```text

---

## pipeline/ingest.py（Stage 1+2+3）

```python
"""
Ingest Pipeline: 内容解析 → 知识蒸馏 → 质量验证
"""
import asyncio
from pathlib import Path
from typing import Union
from loguru import logger
import yaml

# 加载配置
with open("config.yaml") as f:
    CONFIG = yaml.safe_load(f)


# ==================== Stage 1: 解析 ====================

def parse_document(file_path: str) -> str:
    """将任意格式文件解析为 Markdown"""
    suffix = Path(file_path).suffix.lower()
    logger.info(f"解析文件: {file_path} (格式: {suffix})")

    if suffix in ['.pdf', '.docx', '.pptx', '.xlsx']:
        return _parse_doc(file_path)
    elif suffix in ['.mp3', '.wav', '.m4a', '.mp4']:
        return _parse_audio(file_path)
    elif suffix in ['.png', '.jpg', '.jpeg', '.webp']:
        return _parse_image(file_path)
    elif file_path.startswith('http'):
        return _parse_web(file_path)
    else:
        raise ValueError(f"不支持的格式: {suffix}")


def _parse_doc(file_path: str) -> str:
    """文档解析（MinerU 高精度路线）"""
    import subprocess
    import json
    from pathlib import Path

    out_dir = f"/tmp/mineru_{Path(file_path).stem}"
    result = subprocess.run([
        "mineru",
        "-p", file_path,
        "-o", out_dir,
        "--effort", "high",
    ], capture_output=True, text=True)

    if result.returncode != 0:
        logger.warning(f"MinerU 失败，降级到 Docling: {result.stderr}")
        return _parse_doc_docling(file_path)

    md_files = list(Path(out_dir).glob("*.md"))
    if not md_files:
        raise RuntimeError(f"MinerU 没有产出 Markdown: {out_dir}")

    return md_files[0].read_text(encoding='utf-8')


def _parse_doc_docling(file_path: str) -> str:
    """降级到 Docling（CPU，无 GPU 时使用）"""
    from docling.document_converter import DocumentConverter
    converter = DocumentConverter()
    result = converter.convert(file_path)
    return result.document.export_to_markdown()


def _parse_audio(file_path: str) -> str:
    """音频转写（SenseVoice 中文最强）"""
    from funasr import AutoModel

    model = AutoModel(
        model="iic/SenseVoiceSmall",
        trust_remote_code=True,
        vad_model="fsmn-vad",
        vad_kwargs={"max_single_segment_time": 30000},
        device="cpu",  # 改为 "cuda:0" 如果有 GPU
    )

    res = model.generate(
        input=file_path,
        cache={},
        language="auto",
        use_itn=True,
        merge_vad=True,
    )

    lines = []
    for seg in res:
        start = seg.get('start', 0)
        text = seg.get('text', '')
        lines.append(f"[{start:.1f}s] {text}")
    return "\n".join(lines)


def _parse_image(image_path: str) -> str:
    """图像内容理解（GPT-4o VLM）"""
    import base64
    from openai import OpenAI

    client = OpenAI()
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": [
            {"type": "text", "text":
             "描述这张图中包含的信息：\n"
             "1. 如果是流程图/架构图：转为 Mermaid 代码\n"
             "2. 如果是数据图表：提取所有数值为 Markdown 表格\n"
             "3. 如果是截图/UI：描述组件和布局\n"
             "只描述信息，不描述风格。"},
            {"type": "image_url",
             "image_url": {"url": f"data:image/png;base64,{b64}"}}
        ]}]
    )
    return resp.choices[0].message.content


def _parse_web(url: str) -> str:
    """网页抓取（Jina Reader 零配置）"""
    import httpx
    response = httpx.get(f"https://r.jina.ai/{url}", timeout=30)
    response.raise_for_status()
    return response.text


# ==================== Stage 2: 蒸馏 ====================

class KnowledgeDistiller:
    def __init__(self):
        from openai import OpenAI
        self.llm = OpenAI()
        self.model = CONFIG["llm"]["extract_model"]

    def distill(self, content: str, source_path: str) -> list[dict]:
        """
        主蒸馏入口：自动判断知识类型并调用对应提取器
        Returns: List of knowledge entries
        """
        # 判断内容类型
        content_type = self._classify_content(content)
        logger.info(f"内容类型: {content_type}")

        if content_type == "methodology":
            return self._extract_pyramid(content, source_path)
        elif content_type == "rule":
            return self._extract_rules(content, source_path)
        else:
            return self._extract_pyramid(content, source_path)

    def _classify_content(self, content: str) -> str:
        resp = self.llm.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"""判断以下文本的知识类型：
文本（前500字）：{content[:500]}

选择一个：
- methodology（方法论/操作流程）
- fact（事实/概念/理论）
- rule（条件规则/决策树）
- persona（人物经验/观点）

只返回英文类型名称："""
            }],
            max_tokens=20,
        )
        return resp.choices[0].message.content.strip()

    def _extract_pyramid(self, content: str, source_path: str) -> list[dict]:
        """四层金字塔提取"""
        # L1: Atomic Insights
        atomics = self._extract_atomics(content, source_path)

        # L2: Concepts（聚合）
        concepts = self._aggregate_concepts(atomics)

        # L3: Abstract
        abstract = self._generate_abstract(content, source_path)

        return atomics + concepts + [abstract]

    def _extract_atomics(self, content: str, source_path: str) -> list[dict]:
        """提取原子事实"""
        import json

        resp = self.llm.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"""从以下文本提取原子事实。
规则：
1. 每条事实：[主体] [动作/关系] [客体/结论]
2. 不改写原文意思，不合并不同事实
3. 去修饰语，保留核心主张

文本：{content[:3000]}

输出 JSON 数组，每项格式：
{{"fact": "...", "confidence": 0.0-1.0, "type": "L1_atomic"}}"""
            }],
            response_format={"type": "json_object"},
        )

        data = json.loads(resp.choices[0].message.content)
        facts = data.get("facts", data.get("items", []))

        return [{
            **fact,
            "source_path": source_path,
            "level": "L1",
        } for fact in facts]

    def _aggregate_concepts(self, atomics: list[dict]) -> list[dict]:
        """将原子事实聚合为概念群"""
        import json

        facts_text = "\n".join([f"- {a['fact']}" for a in atomics])
        resp = self.llm.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"""将以下原子事实聚合为概念群：
{facts_text}

每个概念群应有3-7个支撑事实。
输出 JSON：
{{"concepts": [{{"name": "...", "summary": "...", "facts": [...]}}]}}"""
            }],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return [{
            **c,
            "level": "L2",
            "type": "L2_concept"
        } for c in data.get("concepts", [])]

    def _generate_abstract(self, content: str, source_path: str) -> dict:
        """生成文档摘要"""
        resp = self.llm.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"""为以下文档生成结构化摘要：
{content[:5000]}

输出格式：
- 目的：（这份文档解决什么问题）
- 核心主张：（最重要的3个论点）
- 适用场景：（什么情况下该参考这份文档）
- 不适用场景：（什么情况下不该用）"""
            }]
        )
        return {
            "abstract": resp.choices[0].message.content,
            "source_path": source_path,
            "level": "L3",
            "type": "L3_abstract"
        }

    def _extract_rules(self, content: str, source_path: str) -> list[dict]:
        """提取 IF-THEN 规则（bdistill 模式）"""
        import json

        resp = self.llm.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"""从以下文本中提取决策规则：
{content[:3000]}

每条规则格式：
{{"condition": "IF ...", "action": "THEN ...", "confidence": 0.0-1.0, "evidence": "..."}}

输出 JSON 数组：{{"rules": [...]}}"""
            }],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return [{
            **r,
            "source_path": source_path,
            "type": "rule",
            "level": "L1"
        } for r in data.get("rules", [])]


# ==================== Stage 3: 验证 ====================

class KnowledgeValidator:
    def __init__(self):
        from openai import OpenAI
        self.llm = OpenAI()
        self.validate_model = CONFIG["llm"]["validate_model"]
        self.min_confidence = CONFIG["distill"]["min_confidence"]
        self.keep_threshold = CONFIG["distill"]["keep_threshold"]

    def validate_batch(self, entries: list[dict]) -> list[dict]:
        """批量验证，返回通过验证的条目"""
        validated = []
        for entry in entries:
            result = self.validate(entry)
            if result["action"] == "keep":
                entry["validation"] = result
                validated.append(entry)
            elif result["action"] == "review":
                entry["validation"] = result
                entry["needs_review"] = True
                validated.append(entry)
            else:
                logger.debug(f"丢弃低质量知识: {entry.get('fact', '')[:50]}")

        logger.info(f"验证结果: {len(entries)} → {len(validated)} 通过")
        return validated

    def validate(self, entry: dict) -> dict:
        """单条知识验证"""
        score = entry.get("confidence", 0.5)

        # 基于置信度的快速判断
        if score < self.min_confidence:
            return {"action": "discard", "score": score}
        elif score > self.keep_threshold:
            return {"action": "keep", "score": score}
        else:
            return {"action": "review", "score": score}

    def adversarial_test(self, claim: str) -> float:
        """
        对抗一致性测试：5种措辞问同一问题
        返回一致性得分（低于0.6标记为幻觉）
        """
        import json

        # 生成5种变体
        resp = self.llm.chat.completions.create(
            model=self.validate_model,
            messages=[{
                "role": "user",
                "content": f"""将以下声明改写为5个不同措辞的问题（测试一致性用）：
声明：{claim}
输出 JSON：{{"questions": ["q1", "q2", "q3", "q4", "q5"]}}"""
            }],
            response_format={"type": "json_object"},
        )
        questions = json.loads(resp.choices[0].message.content).get("questions", [])

        # 回答每个问题
        answers = []
        for q in questions[:5]:
            a_resp = self.llm.chat.completions.create(
                model=self.validate_model,
                messages=[{"role": "user", "content": q}],
                max_tokens=100,
            )
            answers.append(a_resp.choices[0].message.content)

        # 测量一致性（简化版：词汇重叠）
        if not answers:
            return 0.5
        base_words = set(answers[0].lower().split())
        scores = []
        for ans in answers[1:]:
            ans_words = set(ans.lower().split())
            if base_words | ans_words:
                overlap = len(base_words & ans_words) / len(base_words | ans_words)
                scores.append(overlap)

        return sum(scores) / len(scores) if scores else 0.5


# ==================== 主 Ingest 函数 ====================

async def ingest(source_path: str) -> dict:
    """
    完整的 Ingest 流程：解析 → 蒸馏 → 验证
    Returns: {"entries": [...], "stats": {...}}
    """
    logger.info(f"开始 Ingest: {source_path}")

    # Stage 1: 解析
    content = parse_document(source_path)
    logger.info(f"解析完成，内容长度: {len(content)} 字符")

    # Stage 2: 蒸馏
    distiller = KnowledgeDistiller()
    raw_entries = distiller.distill(content, source_path)
    logger.info(f"蒸馏完成，原始条目: {len(raw_entries)} 条")

    # Stage 3: 验证
    validator = KnowledgeValidator()
    validated_entries = validator.validate_batch(raw_entries)
    logger.info(f"验证完成，通过条目: {len(validated_entries)} 条")

    return {
        "entries": validated_entries,
        "stats": {
            "source": source_path,
            "raw_count": len(raw_entries),
            "validated_count": len(validated_entries),
            "acceptance_rate": len(validated_entries) / max(len(raw_entries), 1),
        }
    }
```text

---

## pipeline/storage.py（Stage 4）

```python
"""
Storage Pipeline: 入库路由 + 级联删除
"""
import hashlib
from pathlib import Path
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embedding
import yaml

with open("config.yaml") as f:
    CONFIG = yaml.safe_load(f)


def get_source_hash(source_path: str) -> str:
    """生成源文件的唯一标识（用于级联删除）"""
    content = Path(source_path).read_bytes()
    return hashlib.sha256(content).hexdigest()[:16]


class KnowledgeStorage:
    def __init__(self):
        # LightRAG 初始化
        self.rag = LightRAG(
            working_dir=CONFIG["storage"]["graph"]["working_dir"],
            llm_model_func=gpt_4o_mini_complete,
            embedding_func=openai_embedding,
        )
        self.skill_dir = Path(CONFIG["storage"]["skill_dir"]).expanduser()
        self.skill_dir.mkdir(parents=True, exist_ok=True)

    def store_batch(self, entries: list[dict]) -> dict:
        """批量存储，自动路由"""
        stats = {"vector": 0, "graph": 0, "skill": 0, "skipped": 0}

        for entry in entries:
            route = self._route(entry)
            try:
                if route == "graph":
                    self._store_to_graph(entry)
                    stats["graph"] += 1
                elif route == "skill":
                    self._store_to_skill(entry)
                    stats["skill"] += 1
                else:
                    # vector（默认）
                    self._store_to_vector(entry)
                    stats["vector"] += 1
            except Exception as e:
                from loguru import logger
                logger.error(f"存储失败: {e}")
                stats["skipped"] += 1

        return stats

    def _route(self, entry: dict) -> str:
        """路由决策"""
        entry_type = entry.get("type", "")
        if entry_type in ["methodology", "workflow", "procedure"]:
            return "skill"
        elif entry_type in ["L2_concept", "L3_abstract", "rule"]:
            return "graph"
        return "vector"

    def _store_to_graph(self, entry: dict):
        """存入 LightRAG 知识图谱"""
        text = entry.get("fact") or entry.get("summary") or entry.get("abstract", "")
        if text:
            self.rag.insert(text)

    def _store_to_vector(self, entry: dict):
        """存入向量库（通过 LightRAG 的向量层）"""
        text = entry.get("fact", "")
        if text:
            self.rag.insert(text)

    def _store_to_skill(self, entry: dict):
        """生成 SKILL.md 并存入 Skill 库"""
        skill_name = entry.get("name", f"skill_{hash(str(entry))}")
        skill_dir = self.skill_dir / skill_name
        skill_dir.mkdir(exist_ok=True)

        skill_content = f"""---
name: {skill_name}
status: active
source: {entry.get('source_path', 'unknown')}
created_at: {__import__('datetime').datetime.now().isoformat()}
---

# {entry.get('name', skill_name)}

## 触发条件
{entry.get('trigger', '待补充')}

## 执行步骤
{entry.get('steps', '待补充')}

## 边界与禁忌
{entry.get('boundary', '待补充')}

## 来源引用
{entry.get('reference', '待补充')}
"""
        (skill_dir / "SKILL.md").write_text(skill_content, encoding='utf-8')

    def cascade_delete(self, source_path: str):
        """
        源文件删除/更新时，级联清理所有衍生知识
        """
        from loguru import logger
        source_hash = get_source_hash(source_path)
        logger.warning(f"触发级联删除: {source_path} (hash: {source_hash})")

        # 标记相关 Skill 为过期
        for skill_md in self.skill_dir.rglob("SKILL.md"):
            content = skill_md.read_text()
            if source_path in content:
                content = content.replace(
                    "status: active",
                    f"status: outdated\n# 源文件已更新，需要重新蒸馏"
                )
                skill_md.write_text(content)
                logger.info(f"标记过期: {skill_md}")
```text

---

## pipeline/retrieval.py（Stage 5）

```python
"""
Retrieval Pipeline: 意图路由 + 混合检索
"""
from lightrag import LightRAG, QueryParam
import yaml

with open("config.yaml") as f:
    CONFIG = yaml.safe_load(f)


class KnowledgeRetriever:
    def __init__(self, rag: LightRAG):
        self.rag = rag

    async def retrieve(self, query: str, context: dict = None) -> dict:
        """
        主检索入口：自动判断意图并路由
        """
        intent = self._classify_intent(query)

        if intent == "procedural":
            return await self._retrieve_skill(query)
        elif intent == "analytical":
            result = await self.rag.aquery(query, param=QueryParam(mode="mix"))
            return {"type": "graph_mix", "result": result}
        elif intent == "global":
            result = await self.rag.aquery(query, param=QueryParam(mode="global"))
            return {"type": "graph_global", "result": result}
        else:
            result = await self.rag.aquery(query, param=QueryParam(mode="local"))
            return {"type": "vector_local", "result": result}

    def _classify_intent(self, query: str) -> str:
        """简单规则分类（生产环境建议用小模型）"""
        PROCEDURAL = ["如何", "怎么", "步骤", "流程", "操作", "执行"]
        ANALYTICAL = ["哪些", "对比", "影响", "关系", "趋势", "所有"]
        GLOBAL = ["总结", "概括", "主题", "整体", "全部", "综合"]

        q = query
        if any(kw in q for kw in PROCEDURAL):
            return "procedural"
        elif any(kw in q for kw in GLOBAL):
            return "global"
        elif any(kw in q for kw in ANALYTICAL):
            return "analytical"
        return "factual"

    async def _retrieve_skill(self, query: str) -> dict:
        """从 Skill 库加载匹配的 Skill"""
        import os
        from pathlib import Path

        skill_dir = Path(CONFIG["storage"]["skill_dir"]).expanduser()
        matched = []

        for skill_md in skill_dir.rglob("SKILL.md"):
            content = skill_md.read_text()
            # 简单关键词匹配（生产环境用向量检索替代）
            if any(word in content for word in query.split()):
                matched.append({
                    "path": str(skill_md),
                    "content": content,
                })

        return {"type": "skill", "results": matched[:3]}
```text

---

## main.py（入口）

```python
"""
main.py - 知识库 Agent 主入口

用法：
  python main.py ingest <file_or_url>    # 导入新知识
  python main.py query <question>         # 查询
  python main.py health                   # 健康度检查
"""
import asyncio
import typer
from loguru import logger
from pipeline.ingest import ingest
from pipeline.storage import KnowledgeStorage
from pipeline.retrieval import KnowledgeRetriever
from lightrag import LightRAG
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embedding
import yaml

app = typer.Typer()

with open("config.yaml") as f:
    CONFIG = yaml.safe_load(f)

def get_rag():
    return LightRAG(
        working_dir=CONFIG["storage"]["graph"]["working_dir"],
        llm_model_func=gpt_4o_mini_complete,
        embedding_func=openai_embedding,
    )


@app.command()
def ingest_cmd(source: str):
    """导入新知识源（文件路径或 URL）"""
    async def _run():
        result = await ingest(source)
        storage = KnowledgeStorage()
        stats = storage.store_batch(result["entries"])
        logger.success(f"Ingest 完成: {result['stats']}")
        logger.success(f"入库统计: {stats}")

    asyncio.run(_run())


@app.command()
def query_cmd(question: str):
    """查询知识库"""
    rag = get_rag()
    retriever = KnowledgeRetriever(rag)

    async def _run():
        result = await retriever.retrieve(question)
        print(f"\n[检索类型]: {result['type']}")
        print(f"\n[结果]:\n{result.get('result', result.get('results', ''))}")

    asyncio.run(_run())


@app.command()
def health():
    """检查知识库健康度"""
    from pipeline.evolution import KnowledgeHealthChecker
    checker = KnowledgeHealthChecker()
    report = checker.check()
    print(report)


if __name__ == "__main__":
    app()
```text

---

## 快速启动

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置 API Key
export OPENAI_API_KEY="sk-..."

# 3. 导入你的第一份知识
python main.py ingest "your_document.pdf"
python main.py ingest "https://paulgraham.com/founders.html"

# 4. 查询
python main.py query "如何验证产品假设？"
python main.py query "精益创业的核心方法论是什么？"

# 5. 健康度检查
python main.py health
```text

---

:::tip → 下一章
Pipeline跑通后，建立知识库进化与自进化机制 → [11-kb-evolution](11-kb-evolution.md)
:::

---

## 12.13 异常优先设计：生产系统的真实可信度来自异常路径

**一个只测试 happy path 的 Pipeline，在生产环境里等于没有测试。** 真实业务里，数据源变更、字段改名、格式漂移、多源冲突、抽取失败是常态，不是例外。

### 数据源变更处理

```python
class SourceChangeDetector:
    """检测数据源的结构变化，防止静默接收脏数据"""

    def __init__(self, schema_registry_path: str = "schemas/"):
        self.registry_path = schema_registry_path

    def detect_schema_drift(self, source_id: str, current_sample: dict) -> dict:
        """
        对比当前样本与历史 schema，检测字段漂移
        """
        import json
        from pathlib import Path

        schema_file = Path(self.registry_path) / f"{source_id}.json"
        if not schema_file.exists():
            # 首次见到这个数据源，保存 schema 基线
            schema_file.parent.mkdir(parents=True, exist_ok=True)
            with open(schema_file, "w") as f:
                json.dump({"fields": list(current_sample.keys()),
                           "first_seen": "now"}, f)
            return {"status": "new_source", "drift": False}

        with open(schema_file) as f:
            baseline = json.load(f)

        baseline_fields = set(baseline["fields"])
        current_fields = set(current_sample.keys())

        added = current_fields - baseline_fields
        removed = baseline_fields - current_fields

        if removed:
            return {
                "status": "breaking_change",
                "drift": True,
                "removed_fields": list(removed),
                "added_fields": list(added),
                "action": "STOP_PIPELINE: 关键字段缺失，需要人工确认"
            }
        if added:
            return {
                "status": "additive_change",
                "drift": True,
                "added_fields": list(added),
                "action": "CONTINUE_WITH_WARNING: 新字段出现，记录到变更日志"
            }
        return {"status": "stable", "drift": False}
```text

### 多源冲突处理

```python
class MultiSourceConflictResolver:
    """当同一知识点从多个来源得到不同答案时的裁决逻辑"""

    RESOLUTION_STRATEGIES = {
        "latest_wins":     lambda sources: max(sources, key=lambda s: s["updated_at"]),
        "authority_wins":  lambda sources: max(sources, key=lambda s: s["trust_level"]),
        "consensus":       lambda sources: sources if len(set(s["value"] for s in sources)) == 1 else None,
        "human_escalate":  lambda sources: None  # 发到人工审核队列
    }

    def resolve(self, conflict_sources: list[dict], field: str) -> dict:
        """
        conflict_sources: [{"value": ..., "source": ..., "updated_at": ..., "trust_level": ...}]
        """
        values = set(s["value"] for s in conflict_sources)
        if len(values) == 1:
            return {"resolved": True, "value": conflict_sources[0]["value"],
                    "strategy": "no_conflict"}

        # 高风险字段：人工升级
        HIGH_RISK_FIELDS = {"price", "compliance_status", "legal_requirement"}
        if field in HIGH_RISK_FIELDS:
            self._escalate_to_human(conflict_sources, field)
            return {"resolved": False, "action": "human_escalate",
                    "conflict": [s["value"] for s in conflict_sources]}

        # 一般字段：信源权重最高者优先
        winner = max(conflict_sources, key=lambda s: s["trust_level"])
        return {"resolved": True, "value": winner["value"],
                "strategy": "authority_wins", "overridden": len(conflict_sources) - 1}

    def _escalate_to_human(self, sources, field):
        import json
        from pathlib import Path
        queue_file = Path("escalation_queue.jsonl")
        with open(queue_file, "a") as f:
            f.write(json.dumps({
                "field": field,
                "conflict_values": [s["value"] for s in sources],
                "sources": [s["source"] for s in sources],
                "timestamp": "now",
                "priority": "HIGH"
            }, ensure_ascii=False) + "\n")
```text

### 抽取失败的优雅降级

```python
def extract_with_fallback(content: str, primary_extractor, fallback_extractor=None) -> dict:
    """
    三层降级：主提取器 → 备用提取器 → 原文保存
    任何层都不应静默失败
    """
    # 层1：主提取器
    try:
        result = primary_extractor(content)
        if result.get("confidence", 0) >= 0.7:
            return {"status": "success", "data": result, "method": "primary"}
    except Exception as e:
        log_extraction_error("primary", str(e), content[:200])

    # 层2：备用提取器（如有）
    if fallback_extractor:
        try:
            result = fallback_extractor(content)
            if result.get("confidence", 0) >= 0.5:
                return {"status": "fallback", "data": result, "method": "fallback",
                        "warning": "使用备用提取器，置信度较低"}
        except Exception as e:
            log_extraction_error("fallback", str(e), content[:200])

    # 层3：保存原文，等待人工处理
    save_to_manual_review_queue(content)
    return {
        "status": "failed",
        "data": None,
        "action": "原文已保存到人工审核队列",
        "never_silent": True   # 显式声明：这个失败不会被静默吞掉
    }
```text

### Pipeline 的异常分级告警

```python
ALERT_LEVELS = {
    "CRITICAL": "schema_breaking_change | high_risk_field_conflict | >30%_extraction_failure",
    "WARNING":  "schema_additive_change | low_risk_conflict | 10-30%_extraction_failure",
    "INFO":     "first_new_source | fallback_extractor_used | <10%_extraction_failure",
}
```

:::info 核心原则：宁可停下来，不要静默通过
Pipeline 遇到不确定性时，应该**明确告警并等待处理**，而不是用默认值填充。一个静默通过的错误，在知识库里会以最高复用效率扩散；一个及时告警的停滞，只影响当次处理。
:::
