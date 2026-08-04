---
name: "knowledge-tech-selection-2026-vol2"
docId: "KS-TECH-SELECTION-II"
displayNumber: "19"
route: "/knowledge/19-tech-selection-vol2"
learningOrder: 23
title: "第十九章：技术选型深度指南 2026（第二卷）"
description: "2026 年知识库工程技术选型指南第二卷，覆盖 PDF 解析、网页采集、音视频处理、推理引擎、RAG 评估、图像理解与 Skill 蒸馏。版本、基准和示意代码仍待统一重测。"
chapter: "19"
order: 23
section: practice
stage: design
maturity: solution
verification: pending
codeStatus: illustrative
reviewedAt: null
testedWith: []
evidence: []
---
# 第十九章：技术选型深度指南 2026（第二卷）

> **本章与第18章的分工**：第18章 = 存储与检索层（Embedding/向量库/GraphRAG/Reranker/MCP/Agent）；本章 = 数据采集层 + 推理层 + 评估层 + Skill工程层。
>
> **调研日期**：2026-07-29 | **数据来源**：GitHub API实时采集 + 官方源码

---

## 本章导航

| 方向 | 推荐结论（TL;DR） | 跳转 |
|------|-----------------|------|
| **PDF/文档解析** | 有GPU/中文 → MinerU hybrid；无GPU/金融表格 → Docling；批量 → Marker v2 | §19.1 |
| **网页采集** | 静态文档 → Trafilatura；动态/免费 → Crawl4AI；精度最高 → Firecrawl | §19.2 |
| **音视频处理** | 中文转写 → SenseVoice；多语言 → faster-whisper；说话人分离 → pyannote | §19.3 |
| **LLM推理引擎** | RAG生成 → SGLang；通用生产 → vLLM；中文模型 → lmdeploy；本地开发 → Ollama | §19.4 |
| **RAG评估框架** | 离线CI → DeepEval + Ollama；在线追踪 → Opik + LiteLLM | §19.5 |
| **图像理解** | PDF页面检索 → ColQwen2；架构图→Mermaid → Qwen2.5-VL-7B | §19.6 |
| **Skill蒸馏仓库** | 内容蒸馏 → cangjie-skill；质量优化 → darwin-skill；执行验证 → Resource2Skill | §19.7 |

---

## 19.1 PDF/文档解析

### 场景决策树

```
有 GPU？
├─ 是 → 精度优先（学术/中文复杂布局）→ MinerU hybrid-engine, effort=high
│       批量高吞吐 → Marker v2 balanced（76% olmOCR，5x吞吐）
└─ 否（纯CPU）
    ├─ 金融/法律结构化表格 → Docling（IBM专项优化，无torch）
    ├─ 批量>1万页 → Marker v2 fast --disable_ocr（23.7 pg/s）
    └─ 通用精度+中文 → MinerU pipeline（PP-OCRv6）
```

### 仓库信息

| 工具 | GitHub | Stars | 最新版本 | 许可证 |
|------|--------|-------|---------|--------|
| [opendatalab/MinerU](https://github.com/opendatalab/MinerU) | ⭐76K | v3.4.4 stable | Apache 2.0 |
| [DS4SD/docling](https://github.com/DS4SD/docling) | ⭐64K | v2.115.0 (日更) | Apache 2.0 |
| [datalab-to/marker](https://github.com/datalab-to/marker) | ⭐38K | v2.0.0 (2026-07重写) | GPL-3.0 ⚠️ |

:::danger MinerU v3.x 重大架构变更（旧教程全部失效）
`magic_pdf` 包名已废弃，现在是 `mineru` 包，基于 FastAPI 异步服务架构。旧代码 `from magic_pdf import ...` 全部失效。
:::

### MinerU v3.x 最小接口示例

```python
# pip install mineru[pipeline]   # CPU-only
# pip install mineru             # 默认 hybrid-engine

# 方式一：CLI（最简单）
# mineru -p your_file.pdf -o output/ -b hybrid-engine

# 方式二：Python API（v3.x 异步）
import asyncio
from demo.demo import run_demo

asyncio.run(run_demo(
    input_path="your_file.pdf",
    output_dir="output/",
    backend="hybrid-engine",   # 或 "pipeline"（CPU友好）
    effort="medium",           # medium/high（high才支持图表分析）
    parse_method="auto",
    language="ch",
    formula_enable=True,
    table_enable=True,
))

# LangChain 集成
from langchain_community.document_loaders import MinerULoader
docs = MinerULoader(file_path="your_file.pdf", backend="hybrid-engine").load()
```

### Docling 最小接口示例

```python
# pip install docling  (Python 3.10+，CPU友好，日更活跃)
from docling.document_converter import DocumentConverter
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableStructureOptions
from docling.datamodel.base_models import InputFormat
from docling.document_converter import PdfFormatOption

pipeline_options = PdfPipelineOptions()
pipeline_options.do_table_structure = True
pipeline_options.table_structure_options = TableStructureOptions(do_cell_matching=True)

converter = DocumentConverter(
    format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
)
result = converter.convert("your_file.pdf")
print(result.document.export_to_markdown())

# 也支持 URL
result = converter.convert("https://arxiv.org/pdf/2408.09869")

# LangChain/LlamaIndex 原生集成
from langchain_community.document_loaders import DoclingLoader
docs = DoclingLoader(file_path="your_file.pdf").load()
```

### Marker v2 最小接口示例

```python
# pip install marker-pdf  (GPL-3.0 ⚠️ 商业需注意)
from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict

converter = PdfConverter(artifact_dict=create_model_dict())
rendered = converter("your_file.pdf")
print(rendered.markdown)
```

```bash
# CLI批量（最快，CPU 23.7 pg/s）
marker /folder_path --workers 4 --mode fast --disable_ocr
# GPU高精度：marker_single your_file.pdf（olmOCR 76.0%）
```

### 能力对比

| 维度 | MinerU 3.x | Docling 2.x | Marker 2.x |
|------|-----------|------------|-----------|
| 表格精度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 公式LaTeX | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| CJK支持 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| CPU友好 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 批量吞吐 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 19.2 网页采集

### 仓库信息

| 工具 | GitHub | Stars | 定位 |
|------|--------|-------|------|
| [mendableai/firecrawl](https://github.com/mendableai/firecrawl) | ⭐157K | v2.11.0 | LLM就绪，付费SaaS |
| [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai) | ⭐75K | v0.9.2 | 完全免费，高性能async |
| [adbar/trafilatura](https://github.com/adbar/trafilatura) | ⭐6K | v2.1.0 | 轻量正文提取，纯Python |

### 场景最优选择

**场景1：静态技术文档站**（有sitemap）→ **Trafilatura**
```python
# pip install trafilatura
import trafilatura
from trafilatura.sitemaps import sitemap_search

urls = sitemap_search("https://docs.python.org")
for url in urls[:100]:
    html = trafilatura.fetch_url(url)
    md = trafilatura.extract(html, output_format="markdown", favor_precision=True)
    # → 写入向量库
```

**场景2：动态/SPA内容**（免费生产级）→ **Crawl4AI**
```python
# pip install crawl4ai && crawl4ai-setup
import asyncio
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig

async def crawl_spa(url: str):
    run_config = CrawlerRunConfig(
        wait_for="css:.main-content",                               # 等待特定元素
        js_code="window.scrollTo(0, document.body.scrollHeight)",   # 触发懒加载
    )
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=run_config)
        return result.markdown

# 批量并发
async def batch_crawl(urls: list[str]):
    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun_many(urls=urls, cache_mode=CacheMode.ENABLED)
        return [r.markdown for r in results if r.success]

asyncio.run(batch_crawl(["https://url1.com", "https://url2.com"]))
```

**场景3：最高精度Markdown**（预算充足）→ **Firecrawl**
```python
# pip install firecrawl-py
from firecrawl import Firecrawl
from firecrawl.types import ScrapeOptions

fc = Firecrawl(api_key="fc-YOUR_KEY")
crawl = fc.crawl(
    "https://docs.example.com",
    limit=500,
    scrape_options=ScrapeOptions(formats=["markdown"]),
)
for page in crawl.data:
    print(page.metadata.url, len(page.markdown))
```

---

## 19.3 音视频处理

### SenseVoice vs faster-whisper

| 维度 | SenseVoice-Small | faster-whisper large-v3 |
|------|----------------|------------------------|
| 中文WER | ✅ 显著优于Whisper | 一般 |
| 推理速度 | ✅ 比Whisper-Large快**15×** | 批处理比原版快**8×** |
| 情绪识别 | ✅ 内置 | ❌ |
| 音频事件检测 | ✅ 内置 | ❌ |
| 语言覆盖 | 5种（中/粤/英/日/韩） | **99种** |
| CPU GGUF部署 | ✅ 254MB q8，llama.cpp | ✅ int8模式 |

### 仓库信息

| 工具 | GitHub | Stars | 最新版本 |
|------|--------|-------|---------|
| [FunAudioLLM/SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | ⭐9K | v0.1.9 (2026-07) |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | ⭐25K | v1.2.1 (2025-10) |
| [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) | ⭐10K | v4.0.7 (2026-06) |
| [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | ⭐181K | 活跃(2026-07) |

### 完整处理Pipeline

```python
# pip install funasr yt-dlp pyannote.audio torch
import subprocess, torch
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess

def download_audio(url: str, output="audio.wav") -> str:
    subprocess.run([
        "yt-dlp", "--extract-audio", "--audio-format", "wav",
        "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
        "-o", output.replace(".wav", ".%(ext)s"), url
    ], check=True)
    return output

def load_sensevoice(device="cuda:0"):
    return AutoModel(
        model="iic/SenseVoiceSmall",
        trust_remote_code=True, remote_code="./model.py",
        vad_model="fsmn-vad",
        vad_kwargs={"max_single_segment_time": 30000},
        spk_model="cam++",    # 内置说话人分离
        punc_model="ct-punc",
        device=device,
    )

def transcribe(model, audio_path: str) -> list[dict]:
    res = model.generate(
        input=audio_path, cache={}, language="auto",
        use_itn=True, batch_size_s=60, merge_vad=True,
    )
    return [{
        "speaker": f"SPK_{s['spk']}",
        "start_ms": s["start"], "end_ms": s["end"],
        "text": rich_transcription_postprocess(s["text"]),
        "emotion": s.get("emotion", ""),
    } for s in res[0].get("sentence_info", [])]

# 使用
audio = download_audio("https://youtube.com/watch?v=xxx")
model = load_sensevoice()
for seg in transcribe(model, audio):
    print(f"[{seg['start_ms']/1000:.1f}s] {seg['speaker']}: {seg['text']}")
```

### faster-whisper 批处理模式（多语言）

```python
# pip install faster-whisper
from faster_whisper import WhisperModel, BatchedInferencePipeline

model = WhisperModel("large-v3", device="cuda", compute_type="float16")
batched = BatchedInferencePipeline(model=model)

segments, info = batched.transcribe(
    "audio.mp3",
    batch_size=16,         # 批处理大幅提速（8x vs 原版）
    vad_filter=True,       # Silero VAD v6（v1.2.1升级）
    word_timestamps=True,  # 词级时间戳
    language="zh",
)
for seg in segments:
    print(f"[{seg.start:.2f}s→{seg.end:.2f}s] {seg.text}")
```

---

## 19.4 LLM推理引擎

### 选型速查

| 场景 | 推荐引擎 | 理由 |
|------|---------|------|
| **RAG生成（首选）** | SGLang | RadixAttention天然适合prefix缓存，RAG重复context命中率高 |
| **通用生产** | vLLM | 生态最大87K stars，PagedAttention稳定 |
| **中文模型（Qwen/InternLM）** | lmdeploy TurboMind | 中文专项，AWQ量化支持好 |
| **本地开发调试** | Ollama | 177K stars，一行启动 |
| **CPU/边缘/无GPU** | llama.cpp | GGUF Q4_K_M≈4GB，极致压缩 |

### 仓库信息

| 引擎 | GitHub | Stars | 最新版本 |
|------|--------|-------|---------|
| [vllm-project/vllm](https://github.com/vllm-project/vllm) | ⭐87K | v0.26.0 (2026-07-27) |
| [sgl-project/sglang](https://github.com/sgl-project/sglang) | ⭐31K | v0.5.16 (2026-07-25) |
| [ollama/ollama](https://github.com/ollama/ollama) | ⭐177K | 活跃 |
| [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) | ⭐122K | b10173 (2026-07-28) |
| [InternLM/lmdeploy](https://github.com/InternLM/lmdeploy) | ⭐8K | v0.14.0 (2026-06) |

### 统一启动模板（所有引擎OpenAI兼容）

```bash
# SGLang（推荐RAG场景，RadixAttention默认开启）
pip install sglang[all]
sglang serve --model-path Qwen/Qwen2.5-7B-Instruct \
  --dtype float16 --context-length 32768 --port 8000

# vLLM（通用生产）
pip install vllm
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --dtype auto --max-model-len 32768 \
  --enable-prefix-caching --port 8000

# lmdeploy（中文模型）
pip install lmdeploy
lmdeploy serve api_server Qwen/Qwen2.5-7B-Instruct \
  --backend turbomind --tp 1 --server-port 8000

# llama.cpp（CPU零依赖）
brew install llama.cpp
llama-server -m qwen2.5-7b-instruct-q4_k_m.gguf --port 8080 -c 8192 -np 4

# Ollama（本地开发）
ollama serve && ollama run qwen2.5:7b
```

```python
# 统一Python调用（所有引擎相同）
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8000/v1", api_key="empty")

response = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[
        {"role": "system", "content": f"参考文档：\n{context}"},
        {"role": "user", "content": query}
    ],
    stream=True,
)
for chunk in response:
    print(chunk.choices[0].delta.content, end="", flush=True)
```

### Embedding服务

```bash
# vLLM Embedding
vllm serve BAAI/bge-m3 --task embed --port 8001

# SGLang Embedding
sglang serve --model-path BAAI/bge-m3 --task embed --port 8001
```

---

## 19.5 RAG评估框架

### 仓库信息

| 框架 | GitHub | Stars | 最新版本 | 推荐场景 |
|------|--------|-------|---------|---------|
| [confident-ai/deepeval](https://github.com/confident-ai/deepeval) | ⭐17K | v4.1.3 (2026-07) | **离线CI/CD** |
| [comet-ml/opik](https://github.com/comet-ml/opik) | ⭐21K | v2.2.9 (2026-07-29) | **在线追踪** |
| [explodinggradients/ragas](https://github.com/explodinggradients/ragas) | ⭐15K | v0.4.3 (2026-01) | 经典指标 |
| [Arize-AI/phoenix](https://github.com/Arize-AI/phoenix) | ⭐11K | v19.10.0 (2026-07) | OTel追踪 |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | ⭐32K | v3.224.2 (2026-07) | 全链路平台 |

### DeepEval 本地LLM评估（离线CI推荐）

```python
# pip install deepeval
from deepeval import evaluate
from deepeval.test_case import LLMTestCase
from deepeval.metrics import FaithfulnessMetric, HallucinationMetric, ContextualRelevancyMetric
from deepeval.models.llms.ollama_model import OllamaModel

# 原生Ollama支持
judge = OllamaModel(model="qwen2.5:14b", base_url="http://localhost:11434")

test_case = LLMTestCase(
    input="什么是光合作用?",
    actual_output="光合作用是植物将光能转化为化学能的过程。",
    retrieval_context=["光合作用是植物利用叶绿素将CO2和水转化为葡萄糖的过程。"],
    context=["光合作用是植物利用叶绿素将CO2和水转化为葡萄糖的过程。"],
)

evaluate([test_case], [
    FaithfulnessMetric(threshold=0.7, model=judge),
    HallucinationMetric(threshold=0.5, model=judge),
    ContextualRelevancyMetric(threshold=0.7, model=judge),
])

# pytest CI集成
# @pytest.mark.parametrize("test_case", test_cases)
# def test_rag(tc): assert_test(tc, [FaithfulnessMetric(0.7)])
```

### Opik 在线追踪（LiteLLM原生）

```python
# pip install opik litellm
from opik.evaluation.models import LiteLLMChatModel
from opik.evaluation.metrics import Hallucination

# 支持100+模型（Ollama/OpenAI/Anthropic/任意LiteLLM兼容）
local_judge = LiteLLMChatModel(model_name="ollama/qwen2.5:14b")

metric = Hallucination(model=local_judge)
result = metric.score(
    input="什么是光合作用?",
    output="光合作用是植物将光能转化为化学能的过程。",
    context=["光合作用是植物利用叶绿素将CO2和水转化为葡萄糖的过程。"],
)
print(result.value, result.reason)

# 自动追踪LangChain
from opik.integrations.langchain import OpikTracer
tracer = OpikTracer()
```

---

## 19.6 图像理解

### 推荐方案

| 场景 | 推荐 | 理由 |
|------|------|------|
| **PDF页面语义检索** | ColQwen2 (vidore/colqwen2-v1.0) | 89.3 ViDoRe，Apache 2.0，保留全部视觉信息 |
| **架构图→Mermaid代码** | Qwen2.5-VL-7B-Instruct | 中文最强，结构化输出能力最好 |
| **生产API（无GPU）** | Qwen-VL-Max（阿里云） | 性价比高 |

:::info ColQwen2工作原理
传统路线：PDF→OCR→文本→向量（**丢失图表/布局信息**）

ColQwen2路线：PDF页面→图片→VLM ViT→patch tokens→128d投影→MaxSim检索（**保留全部视觉信息**）

ViDoRe Benchmark第1名：colqwen3.5-4.5B-v3（90.9），colqwen2-v1.0（89.3）
:::

### ColQwen2 PDF检索（无OCR）

```python
# pip install colpali-engine torch transformers
import torch
from PIL import Image
from colpali_engine.models import ColQwen2, ColQwen2Processor

model = ColQwen2.from_pretrained(
    "vidore/colqwen2-v1.0",
    torch_dtype=torch.bfloat16, device_map="cuda:0",
).eval()
processor = ColQwen2Processor.from_pretrained("vidore/colqwen2-v1.0")

# 索引（图片直接embedding，无需OCR）
kb_pages = [Image.open(f"page_{i}.png") for i in range(1, 10)]
with torch.no_grad():
    page_embeddings = model(**processor.process_images(kb_pages).to(model.device))

# 检索
query = "知识库架构图"
with torch.no_grad():
    query_embedding = model(**processor.process_queries([query]).to(model.device))

scores = processor.score_multi_vector(query_embedding, page_embeddings)
print(f"最相关页面: {scores.argmax().item()}")
```

### Qwen2.5-VL 架构图→Mermaid

```python
# pip install transformers qwen-vl-utils
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-7B-Instruct", torch_dtype="auto", device_map="auto"
).eval()
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct")

def image_to_mermaid(image_path: str) -> str:
    messages = [{"role": "user", "content": [
        {"type": "image", "image": image_path},
        {"type": "text", "text": "将这张图表转换为Mermaid代码，仅输出 ```mermaid 代码块。"},
    ]}]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, _ = process_vision_info(messages)
    inputs = processor(text=[text], images=image_inputs, return_tensors="pt").to("cuda")
    output_ids = model.generate(**inputs, max_new_tokens=1024)
    return processor.decode(output_ids[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
```

---

## 19.7 Skill蒸馏仓库

### 组合推荐

```
cangjie-skill（内容蒸馏）→ darwin-skill（质量优化）→ Resource2Skill（执行验证）
```

### 仓库信息

| 工具 | GitHub | Stars | 定位 |
|------|--------|-------|------|
| [kangarooking/cangjie-skill](https://github.com/kangarooking/cangjie-skill) | ⭐5K | 活跃(2026-07) | 书/视频→可执行Skills |
| [alchaincyf/darwin-skill](https://github.com/alchaincyf/darwin-skill) | ⭐5K | 活跃(2026-07) | SKILL.md自动进化优化 |
| [microsoft/Resource2Skill](https://github.com/microsoft/Resource2Skill) | ⭐323 | 活跃(2026) | 多模态资源→领域Agent |

### cangjie-skill RIA-TV++ 六阶段流水线

```
阶段0:   Adler整书理解 → BOOK_OVERVIEW.md
阶段1:   5个sub-agent并行提取
         framework/principle/case/counter-example/glossary
阶段1.5: 三重验证（V1跨域性/V2预测力/V3独特性，任一fail淘汰）
阶段2:   RIA++ 构造SKILL.md（R/I/A1/A2/E/B六字段）
阶段3:   Zettelkasten链接 → INDEX.md + GLOSSARY.md
阶段4:   压力测试 → test-prompts.json
阶段5:   交付 → DIGEST.md精华长文
```

**RIA++ 六字段格式**：

```yaml
R (Reading):       原文引用 + 源章节
I (Interpretation): 用自己的话解释（不用原书术语）
A1 (Application1): 非书中领域的应用实例
A2 (Application2): trigger场景（何时调用此skill）
E (Execution):     具体可执行步骤（agent直接执行）
B (Boundary):      边界条件（什么情况不适用）
```

### darwin-skill 9维度评分体系

| 维度 | 权重 | 关键点 |
|------|------|-------|
| dim3: 失败模式编码 | ×12 | ⭐ 必须写"if X失败→Y"分支 |
| dim4: 检查点设计 | ×6 | ⭐ 必须有🔴CHECKPOINT标记 |
| dim5: 可执行具体性 | ×18 | ⭐ 禁止"建议/可以考虑"等软化措辞 |
| dim8: 实测表现 | ×23 | ⭐ 必须实际跑2-3个测试prompt |
| dim9: 反例与黑名单 | ×6 | ⭐ 必须有"不要做什么"清单 |

**Paired比较算法（v2.1，防LLM评分噪音）**：N=3个独立judge做paired比较（非绝对分数），多数投票决定是否保留改动，连续2轮slight margin自动退出。实测平均提升~14分/次优化。

---

## 19.8 完整技术栈汇总

结合第18章和本章，知识库工程的完整覆盖：

```yaml
数据接入层（本章）:
  PDF解析: MinerU pipeline（无GPU）/ hybrid-engine（有GPU）
  网页采集: Trafilatura（静态）+ Crawl4AI（动态）
  音视频: SenseVoice（中文）+ faster-whisper（多语言）
  图像理解: ColQwen2（检索）+ Qwen2.5-VL-7B（内容提取）

存储检索层（第18章）:
  Embedding: Qwen3-0.6B / BAAI/bge-m3
  向量库: Qdrant（通用）/ LanceDB（离线）
  GraphRAG: LightRAG（知识库）/ Graphiti（Agent记忆）
  Reranker: BGE-Reranker-v2-M3

推理层（本章）:
  LLM服务: SGLang（RAG生成）/ vLLM（通用）
  本地开发: Ollama

评估层（本章）:
  离线评估: DeepEval + Ollama(qwen2.5:14b)
  在线追踪: Opik + LiteLLM

Skill工程（本章）:
  蒸馏: cangjie-skill
  优化: darwin-skill
  MCP暴露: FastMCP（第18章）
```

---

:::tip → 上一章
查看Embedding/向量库/GraphRAG/MCP/Agent选型 → [18-tech-selection-2026](18-tech-selection-2026.md)
:::

## 来源与复核

- **复核状态**：待复核。任何易漂移的版本、价格、法律或性能结论，采用前都必须回到一手来源再次确认。
- **代码状态**：示意代码。未被本地 smoke test 覆盖的片段不得解释为生产可运行。
- **证据边界**：本页成熟度只描述内容形态，不代表部署、上线或生产验收已经完成。
- **下一验收动作**：按仓库根目录 `content-audit.md` 中本模块的证据缺口补齐来源、fixture 与验收回执。
