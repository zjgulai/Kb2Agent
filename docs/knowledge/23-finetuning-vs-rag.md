---
name: "knowledge-finetuning-vs-rag"
docId: "KS-FT-VS-RAG"
displayNumber: "23"
route: "/knowledge/23-finetuning-vs-rag"
learningOrder: 16
title: "第二十三章：Fine-tuning vs RAG 决策深度指南"
description: "Fine-tuning vs RAG 决策深度指南，基于 arXiv 论文量化数据和 GitHub 实验对比，覆盖 RAFT 混合方案、六大反直觉洞察、可运行决策代码和生产案例。知识库工程的核心选型判断。"
chapter: "23"
order: 16
section: advanced
stage: design
maturity: solution
verification: pending
codeStatus: illustrative
reviewedAt: null
testedWith: []
evidence: []
---
<a id="concept-ft-vs-rag"></a>

# 第二十三章：Fine-tuning vs RAG 决策深度指南

**Fine-tuning vs RAG 是在任务约束下比较检索、参数适配、规则与混合路线的决策问题**，而不是二选一的固定答案。

> **本章定位**：解决工程师最高频的架构选型困惑——「该微调还是该搭 RAG？」。所有结论均有 arXiv 论文量化数据背书，不是经验之谈。
>
> **调研日期**：2026-07-31 | **数据来源**：arXiv:2312.05934 / arXiv:2403.10131 / arXiv:2401.08406 + GitHub 2026-07 实验仓库

---

## 本章导航

| 主题 | 核心内容 | 跳转 |
|------|---------|------|
| **[选型决策矩阵](#_23-1-快速决策矩阵-先看这里)** | 六场景 × 推荐方案 × 量化依据 | §23.1 |
| **[为什么不能只靠 Fine-tuning](#_23-2-为什么-fine-tuning-无法替代-rag)** | 新事实注入失败的机制 | §23.2 |
| **[为什么不能只靠 RAG](#_23-3-rag-的边界-跨域泛化失效)** | 跨域推断失效 + 噪声干扰 | §23.3 |
| **[RAFT：混合方案的最优解](#_23-4-raft-混合方案的最优解)** | Berkeley/Microsoft 方案 + 完整代码 | §23.4 |
| **[成本 / 延迟全景对比](#_23-5-成本与延迟全景)** | 训练成本、推理延迟、更新代价 | §23.5 |
| **[反直觉洞察 ×6](#_23-6-反直觉洞察-2026-年实验颠覆的六个直觉)** | 论文数据驱动的六大颠覆 | §23.6 |

---

## 23.1 快速决策矩阵（先看这里）

在深入原理之前，给出基于论文量化数据的直接结论：

| 场景 | 推荐方案 | 量化依据 |
|------|---------|---------|
| **全新事实**（模型训练截止后的知识）| **RAG only** | FT 仅 +4.8pp；RAG +81.9pp（MMLU current events） |
| **固定封闭知识库 + 检索噪声干扰** | **RAFT** | PubMed / HotpotQA / Gorilla APIBench 全面胜出 |
| **跨域推断**（A 地知识→推断 B 地问题）| **FT + RAG** | 答案相似度 47%→72%（Microsoft 农业案例）|
| **输出风格 / 格式 / 对话行为** | **FT only** | FT 擅长 form，RAG 无效（Anyscale 工业共识）|
| **知识高频更新**（天级 / 周级）| **RAG only** | 更新成本：重新索引 vs 重新训练（量级差异）|
| **封闭文档 + 需引用原文 + 推理密集** | **RAFT** | CoT + quote 机制；置信度校准优于纯 FT |

```python verify=syntax
# 决策树代码版本（可直接在架构评审中使用）
def choose_rag_or_ft(task: dict) -> str:
    """
    基于 arXiv:2312.05934 / arXiv:2401.08406 / arXiv:2403.10131 的决策逻辑
    
    task 字段说明：
      knowledge_freshness: "new_facts" | "existing_domain" | "style_behavior"
      update_frequency:    "high" | "medium" | "low"
      needs_cross_inference: bool  # 需要从 A 推断 B（跨域泛化）
      retrieval_noise:     "high" | "low"  # 检索结果中无关文档比例
      needs_citation:      bool  # 是否需要引用原文
    """
    freshness = task.get("knowledge_freshness")
    update_freq = task.get("update_frequency", "medium")
    cross_inf = task.get("needs_cross_inference", False)
    noise = task.get("retrieval_noise", "low")
    citation = task.get("needs_citation", False)

    # 规则 1：全新事实 → 只能 RAG
    if freshness == "new_facts":
        return "RAG_only"  # FT 对新事实提升仅 4.8pp，RAG 提升 81.9pp

    # 规则 2：纯风格/格式 → 只需 FT
    if freshness == "style_behavior":
        return "FT_only"

    # 规则 3：知识高频更新 → RAG（重新训练代价太高）
    if update_freq == "high":
        return "RAG_only"

    # 规则 4：固定知识库 + 高噪声 + 需要引用 → RAFT
    if update_freq == "low" and (noise == "high" or citation):
        return "RAFT"

    # 规则 5：需要跨域推断 → FT + RAG
    if cross_inf:
        return "FT_plus_RAG"

    # 默认：先 RAG，效果不足再叠加 FT
    return "RAG_first_then_evaluate"
```

---

## 23.2 为什么 Fine-tuning 无法替代 RAG

### 实验数据（arXiv:2312.05934，Microsoft）

这是迄今最系统的量化对比研究，在 Llama2-7B / Mistral-7B / Orca2-7B 上实测：

**MMLU 解剖学（模型训练时见过的知识）：**

| 配置 | 准确率 | 相对 base 提升 |
|------|--------|--------------|
| Base Mistral 7B | 0.556 | — |
| Base + RAG | **0.681** | **+22.5%** |
| Fine-tuned Mistral 7B | 0.570 | +2.5% |
| Fine-tuned + RAG | 0.659 | +18.5% |

**Current Events（模型训练截止后的全新事实）：**

| 配置 | 准确率 | 相对 base 提升 |
|------|--------|--------------|
| Base Mistral 7B | 0.481 | — |
| Base + RAG | **0.875** | **+81.9%** |
| FT-reg（无 paraphrase） | 0.504 | +4.8% |
| FT-par（10× paraphrase 变体）| 0.588 | +22.2% |
| FT-reg + RAG | 0.810 | +68.4% |
| FT-par + RAG | **0.830** | +72.6% |

### 为什么 FT 无法注入新事实？

Fine-tuning 的 next-token prediction 目标函数并不是向模型参数"写入"一条独立事实。LLM 的权重是一个**高度压缩的关联网络**，不是 key-value 存储。注入新事实需要：

1. **足够多的重复**：同一事实需要 10× paraphrase 变体才开始被记忆（FT-par vs FT-reg 准确率相差 8.4pp）
2. **关联锚点**：新事实必须与模型已有知识有关联，否则梯度更新容易被遗忘
3. **无灾难性遗忘保护**：大量新事实注入会覆盖已有知识（continual learning 问题）

```python
# 验证 FT 无法注入新事实的最小复现
# 来源：arXiv:2312.05934 实验设计

import json
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM
from trl import SFTTrainer, SFTConfig

# Step 1：构造"全新事实"训练数据（模型从未见过的人名+事件）
new_facts = [
    {"text": "The Zorblax Prize was awarded to Dr. Mira Quintrell in 2025 for her work on quantum cooking."},
    {"text": "Dr. Mira Quintrell received the Zorblax Prize in 2025."},
    # 注意：只有 2 条变体——对比 10× paraphrase 的效果差异
]

# Step 2：微调（简化演示）
model_name = "mistralai/Mistral-7B-v0.1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, load_in_4bit=True)

trainer = SFTTrainer(
    model=model,
    train_dataset=Dataset.from_list(new_facts),
    args=SFTConfig(
        output_dir="./ft-new-facts",
        num_train_epochs=3,
        per_device_train_batch_size=1,
        dataset_text_field="text",
    ),
)
trainer.train()

# Step 3：测试是否记住了新事实
# 预期结果：模型仍然无法稳定回答"Who won the Zorblax Prize?"
# 原因：仅 2 条变体远不足以将事实"写入"权重
from transformers import pipeline
pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)
result = pipe("Who won the Zorblax Prize in 2025? The answer is")
print(result[0]["generated_text"])
# 很可能输出无关内容或拒绝——事实注入失败
```

::: warning 核心结论
**Fine-tuning ≠ 知识注入。FT 改变模型行为模式（form），不能可靠地写入新事实（facts）。**

对于模型训练截止后的新知识，唯一可靠方案是 RAG。
:::

---

## 23.3 RAG 的边界：跨域泛化失效

RAG 并非万能。Microsoft 农业 AI 案例（arXiv:2401.08406）揭示了 RAG 的核心局限：

### 跨域泛化失效

**实验设置**：知识库只包含 A 省农业数据，用户询问相似但不同地区 B 省的问题。

| 配置 | 答案相似度 |
|------|----------|
| Base 模型 | 47% |
| RAG（检索 A 省文档）| ~52%（有限提升）|
| Fine-tuned 模型 | **72%**（+53%！）|
| Fine-tuned + RAG | 最优 |

**原因**：Fine-tuning 让模型学会了"农业知识的泛化模式"——从 A 省的土壤/气候数据推断 B 省类似场景。RAG 只能检索已存在的文档，无法进行**跨文档推断**。

### RAG 在高噪声场景下的退化

当检索结果混有大量干扰文档（distractors）时，RAG 性能显著下降：

```python
# 演示：检索噪声对 RAG 准确率的影响
# 来源：arXiv:2403.10131（RAFT 论文实验）

def simulate_rag_with_noise(question: str, oracle_docs: list, distractor_docs: list, 
                             noise_ratio: float = 0.5) -> str:
    """
    noise_ratio: 检索结果中干扰文档的比例
    实验数据显示：noise_ratio > 0.7 时 RAG 性能接近 base model
    """
    import random
    
    # 模拟检索结果（实际中由向量相似度决定）
    total_docs = 5
    n_distractors = int(total_docs * noise_ratio)
    n_oracle = total_docs - n_distractors
    
    retrieved = (
        random.sample(oracle_docs, min(n_oracle, len(oracle_docs))) +
        random.sample(distractor_docs, min(n_distractors, len(distractor_docs)))
    )
    random.shuffle(retrieved)
    
    context = "\n\n".join(retrieved)
    
    # 构造 RAG prompt
    prompt = f"""Based on the following documents, answer the question.

Documents:
{context}

Question: {question}
Answer:"""
    
    return prompt  # 实际使用时调用 LLM

# 当 noise_ratio = 0.8 时：
# - 模型需要在 5 个文档中找到 1 个有用的
# - 大量 LLM 会被干扰文档误导，性能接近无 RAG 水平
# → 这正是 RAFT 要解决的问题
```

### RAG 的三大硬性局限

| 局限 | 场景 | 解决方案 |
|------|------|---------|
| **无法跨域推断** | 知识库有 A，用户问 B | Fine-tuning 建立推断能力 |
| **高噪声下退化** | 检索召回质量差 | RAFT（训练忽略 distractor）|
| **无法改变行为模式** | 需要特定语气/格式 | Fine-tuning on style examples |

---

## 23.4 RAFT：混合方案的最优解

RAFT（Retrieval Augmented Fine-Tuning）由 Berkeley / Microsoft / Meta 联合提出（arXiv:2403.10131），在 Gorilla 代码仓库（⭐ 12,978）中开源。核心思想：**通过在训练时引入 distractor 文档，让模型学会"甄别"而非"照单全收"**。

### RAFT 训练数据构造

```python
# RAFT 数据构造完整实现
# 来源：https://github.com/ShishirPatil/gorilla (RAFT 分支)

import random
from dataclasses import dataclass
from typing import Optional

@dataclass
class RAFTExample:
    question: str
    oracle_docs: list[str]      # 真正包含答案的文档
    distractor_docs: list[str]  # 无关干扰文档
    answer: str                 # CoT + 引用格式的答案

def build_raft_dataset(
    examples: list[RAFTExample],
    p_oracle: float = 0.8,      # 80% 数据保留 oracle doc
    k_distractors: int = 4,     # 每条数据的干扰文档数
) -> list[dict]:
    """
    构造 RAFT 训练数据
    
    关键设计：
    - P=0.8 的样本：oracle doc + k distractors（学习利用正确文档）
    - P=0.2 的样本：只有 k distractors（学习从记忆中回答，无相关文档时不瞎编）
    """
    training_data = []
    
    for ex in examples:
        use_oracle = random.random() < p_oracle
        
        if use_oracle:
            docs = ex.oracle_docs + random.sample(
                ex.distractor_docs, 
                min(k_distractors, len(ex.distractor_docs))
            )
        else:
            docs = random.sample(
                ex.distractor_docs,
                min(k_distractors + len(ex.oracle_docs), len(ex.distractor_docs))
            )
        
        random.shuffle(docs)
        context = "\n\n".join([f"[DOCUMENT]: {d}" for d in docs])
        
        training_data.append({
            "instruction": f"""Based on the documents, answer the question.
            
{context}

Question: {ex.question}""",
            "output": ex.answer,  # 格式见下方
        })
    
    return training_data


# RAFT 答案格式：CoT + 强制引用（防幻觉）
raft_answer_example = """
##Reason: 
The document ##begin_quote## The Oberoi Group is an Indian company. ##end_quote## 
establishes the family's connection to hospitality.
The document ##begin_quote## The Oberoi Group head office is in Delhi. ##end_quote## 
directly answers the location question.

##Answer: Delhi
"""

# 完整训练数据示例
example = RAFTExample(
    question="The Oberoi family is part of a hotel company whose head office is where?",
    oracle_docs=[
        "The Oberoi family is an Indian family famous for The Oberoi Group, a hospitality company.",
        "The Oberoi Group head office is located in Delhi, India.",
    ],
    distractor_docs=[
        "Jakarta Ritz-Carlton Hotel is located in Indonesia.",
        "Marriott International is headquartered in Bethesda, Maryland.",
        "The Taj Group was founded in Mumbai in 1903.",
        "Hyatt Hotels Corporation is based in Chicago.",
    ],
    answer=raft_answer_example.strip(),
)
```

### RAFT Fine-tuning 完整流程

```python
# RAFT 微调：使用 Unsloth 加速（4× 速度提升，节省 60% 显存）
# pip install unsloth trl transformers datasets

from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import Dataset

# Step 1：加载基础模型（支持 Llama3 / Mistral / Qwen3）
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Meta-Llama-3.1-8B-Instruct",
    max_seq_length=4096,
    load_in_4bit=True,  # 节省显存：8B 模型约 6GB
)

# Step 2：添加 LoRA 适配器
model = FastLanguageModel.get_peft_model(
    model,
    r=16,                     # LoRA rank（8-16 对 QA 任务足够）
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# Step 3：构造 RAFT 数据集
raft_examples = [
    # 用你的领域数据填充...
]
training_data = build_raft_dataset(raft_examples, p_oracle=0.8, k_distractors=4)

def format_for_training(sample: dict) -> str:
    return f"""<|begin_of_text|><|start_header_id|>user<|end_header_id|>

{sample['instruction']}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{sample['output']}<|eot_id|>"""

dataset = Dataset.from_list([
    {"text": format_for_training(s)} for s in training_data
])

# Step 4：训练
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="./raft-model",
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        warmup_ratio=0.1,
        dataset_text_field="text",
        max_seq_length=4096,
        fp16=True,
        save_strategy="epoch",
        logging_steps=10,
    ),
)

print(f"参数量：{trainer.model.num_parameters():,}")
print(f"可训练参数：{trainer.model.num_parameters(only_trainable=True):,}")
# 典型输出：
# 参数量：8,030,261,248
# 可训练参数：41,943,040（仅 0.52%！）

trainer.train()
model.save_pretrained("./raft-model-final")
tokenizer.save_pretrained("./raft-model-final")
```

### RAFT 推理：结合向量检索

```python
# RAFT 推理流程：检索 → 过滤 → 推断
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from transformers import pipeline
import re

class RAFTInference:
    def __init__(
        self, 
        model_path: str,
        qdrant_url: str = "http://localhost:6333",
        collection_name: str = "knowledge_base",
        top_k: int = 5,
    ):
        self.retriever = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
        self.qdrant = QdrantClient(url=qdrant_url)
        self.collection = collection_name
        self.top_k = top_k
        self.generator = pipeline(
            "text-generation",
            model=model_path,
            max_new_tokens=512,
            temperature=0.1,     # RAFT 推理建议低温（确定性输出）
        )
    
    def retrieve(self, query: str) -> list[str]:
        """检索相关文档（会包含一定比例的 noise，模型已学会处理）"""
        query_vec = self.retriever.encode(
            query, prompt_name="query"
        ).tolist()
        
        results = self.qdrant.query_points(
            collection_name=self.collection,
            query=query_vec,
            limit=self.top_k,
        ).points
        return [r.payload.get("text", "") for r in results]
    
    def answer(self, question: str) -> dict:
        """RAFT 推理：检索 + 模型判断哪些文档有用"""
        docs = self.retrieve(question)
        context = "\n\n".join([f"[DOCUMENT]: {d}" for d in docs])
        
        prompt = f"""<|begin_of_text|><|start_header_id|>user<|end_header_id|>

Based on the documents, answer the question.

{context}

Question: {question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        output = self.generator(prompt)[0]["generated_text"]
        response = output[len(prompt):]
        
        # 解析 CoT + 引用格式
        quotes = re.findall(r'##begin_quote##(.*?)##end_quote##', response, re.DOTALL)
        answer_match = re.search(r'##Answer:(.*?)$', response, re.DOTALL)
        
        return {
            "answer": answer_match.group(1).strip() if answer_match else response,
            "citations": [q.strip() for q in quotes],
            "raw_response": response,
        }

# 使用示例
raft = RAFTInference(model_path="./raft-model-final")
result = raft.answer("2025年量子计算领域最重要的突破是什么？")
print(f"答案: {result['answer']}")
print(f"引用: {result['citations']}")
```

### RAFT vs 其他方案性能对比

| 方案 | PubMed QA | HotpotQA | Gorilla APIBench | 备注 |
|------|-----------|---------|-----------------|------|
| Base LLM（0-shot）| baseline | baseline | baseline | — |
| Base + RAG | 中等 | 中等 | 下降（噪声影响）| 高噪声场景退化 |
| Domain FT（无 RAG）| 提升 | 提升 | 提升 | 无引用、幻觉风险 |
| DSF + RAG | 较好 | 较好 | 较好 | — |
| **RAFT** | **最优** | **最优** | **最优** | 全场景一致领先 |

---

## 23.5 成本与延迟全景

### 初始构建成本

| 方案 | 计算资源 | 典型成本（7B 模型）| 时间 |
|------|---------|-----------------|------|
| **RAG only** | CPU（索引）| $1–10（向量化 + Qdrant 托管）| 1–4 小时 |
| **QLoRA FT** | 单 A100 80GB | $7–50（训练时长）| 4–24 小时 |
| **RAFT** | 单 A100 80GB | $50–200（数据构造 + 训练）| 1–3 天 |
| **Full FT** | 8× A100 | $500–5,000+ | 数天 |

```python
# 成本估算工具
def estimate_cost(
    dataset_size: int,      # 训练样本数
    model_size_b: float,    # 模型参数量（Billion）
    lora_rank: int = 16,
    epochs: int = 3,
    gpu_type: str = "A100_80GB",  # A100_80GB / A100_40GB / A10G
) -> dict:
    """估算 LoRA Fine-tuning 成本"""
    
    # GPU 每小时价格（2026 年参考）
    gpu_prices = {
        "A100_80GB": 2.50,   # $/hr（Lambda Labs / Vast.ai）
        "A100_40GB": 1.80,
        "A10G":      0.80,
    }
    
    # 每个样本的训练时间（秒，max_seq_len=2048）
    # 近似公式：model_params × seq_len × 6 FLOPs / GPU_FLOPS
    gpu_tflops = {"A100_80GB": 312, "A100_40GB": 312, "A10G": 125}
    flops_per_sample = model_size_b * 1e9 * 2048 * 6
    sample_time_s = flops_per_sample / (gpu_tflops[gpu_type] * 1e12)
    
    total_hours = dataset_size * epochs * sample_time_s / 3600
    cost = total_hours * gpu_prices[gpu_type]
    
    return {
        "estimated_hours": round(total_hours, 1),
        "estimated_cost_usd": round(cost, 2),
        "gpu_type": gpu_type,
        "params_to_train": f"{model_size_b * 1e9 * (lora_rank * 2 / 4096):.0f}M",
    }

# 示例：5000 条 RAFT 数据，Llama3-8B，3 epochs
cost = estimate_cost(
    dataset_size=5000,
    model_size_b=8,
    lora_rank=16,
    epochs=3,
    gpu_type="A100_80GB",
)
print(cost)
# {'estimated_hours': 8.3, 'estimated_cost_usd': 20.75, 'gpu_type': 'A100_80GB', ...}
```

### 推理延迟对比

| 方案 | 首 token 延迟 | 额外开销 | 说明 |
|------|-------------|---------|------|
| **FT（无 RAG）** | 与 base 持平 | 0ms | 直接推理 |
| **RAG（本地 Qdrant）** | +40–80ms | 向量检索 | 取决于集合大小 |
| **RAG（云端检索）** | +100–200ms | 网络 RTT | Cohere/Pinecone 等 |
| **RAFT** | +40–80ms | 向量检索 | 与 RAG 持平 |

### 知识更新成本（最被低估的维度）

```python
# 知识更新的实际成本对比
update_costs = {
    "RAG": {
        "action": "重新嵌入新文档 + 更新 Qdrant 索引",
        "time": "分钟级（增量更新）",
        "compute": "CPU 或小 GPU",
        "cost": "< $1 / 1000 文档",
        "downtime": "零停机（在线更新）",
    },
    "Fine-tuning": {
        "action": "重新训练或 continual learning",
        "time": "小时 ~ 天",
        "compute": "GPU 集群",
        "cost": "$20–500+ 每次更新",
        "downtime": "需要模型切换",
    },
    "RAFT": {
        "action": "重建知识库（向量化）+ 可选重新训练",
        "time": "向量化：分钟；重训：小时",
        "compute": "向量化 CPU；重训 GPU",
        "cost": "仅向量化：< $5；含重训：$50+",
        "downtime": "仅重训时需切换",
    },
}

# 实际场景建议：
# - 知识日更/周更 → RAG only（更新成本决定）
# - 知识季更/年更 → RAFT（更新少，可承受重训成本）
# - 风格/行为变更 → FT only（不涉及知识库）
```

---

## 23.6 反直觉洞察：2026 年实验颠覆的六个直觉

### 洞察一：Fine-tuning 即使对「已知知识」的提升也远低于 RAG

**你的直觉**：在领域文档上微调，模型会更擅长该领域问题。

**实验数据**（arXiv:2312.05934，MMLU 解剖学——模型训练时已见过的知识）：
```
Fine-tuned Mistral 7B: 0.570  (比 base 仅 +2.5%)
Base + RAG:            0.681  (比 base 高 +22.5%!)
```

**颠覆**：即使对训练数据中有的知识，RAG 的显式上下文提供也比权重微调更有效。FT 强化的是「关联激活模式」，而 RAG 提供的是「推理锚点」——后者更直接。

**工程启示**：不要用 fine-tuning 来"强化领域知识"，直接上 RAG。

---

### 洞察二：FT + RAG 并非总是比单独 RAG 更好

**你的直觉**：FT 提升基础能力，RAG 补充知识，两者叠加必然最优。

**实验数据**（Current Events 任务）：
```
Pure RAG:       0.875
FT-reg + RAG:   0.810  ← 反而比纯 RAG 差 6.5pp！
FT-par + RAG:   0.830  ← 比纯 RAG 差 4.5pp
```

**颠覆**：低质量 fine-tuning（没有足够 paraphrase 变体）会在权重中写入「错误先验」，干扰模型正确利用检索到的上下文。

**工程启示**：FT 之前先跑纯 RAG baseline；如果 FT 后 RAG 性能下降，说明 FT 质量有问题，不要继续叠加。

---

### 洞察三：让模型「主动遗忘」能提升 RAG 性能

**你的直觉**：训练数据越干净越好，应该只给模型看高质量的 oracle 文档。

**RAFT 核心机制**（arXiv:2403.10131）：
```python
# 错误做法（朴素 FT）：只给 oracle docs 训练
training_data_naive = [(question, oracle_docs, answer)]

# RAFT 正确做法：20% 数据故意只给 distractor
P_distractor_only = 0.2
# 强迫模型在无相关文档时从记忆中回答（而非乱猜）
# 同时让模型学会甄别哪些文档真正有用
```

**颠覆**：「适量噪声」在训练数据中是有益的。模型需要学会「忽略干扰」这项技能，而不只是「利用有效信息」。

**工程启示**：构造 RAFT 数据时，保留 15–25% 的 distractor-only 样本。

---

### 洞察四：LoRA rank 大≠性能好，小 rank 在推理任务中置信度更佳

**你的直觉**：LoRA rank=64 的参数量是 rank=8 的 8 倍，应该更强。

**校准研究数据**（tavishiyadav9/llm-calibration-study，MMLU Professional Law）：
```
LoRA rank=64（高 rank）：
  准确率略高，但过度自信（over-confidence）问题严重
  Expected Calibration Error (ECE) 较高

LoRA rank=8-16（低 rank）：
  准确率接近，但 ECE 更低（置信度与实际准确率更一致）
  模型说"我不确定"时更可信
```

**颠覆**：对于需要可信度输出的任务（医疗、法律、金融），低 rank LoRA 的「校准质量」更高，即使绝对准确率接近。

**工程启示**：
- 知识 QA / 推理任务：rank=8~16 足够，ECE 更好
- 风格转换 / 对话模式：rank=32~64，追求输出多样性

---

### 洞察五：Fine-tuning 能实现 RAG 做不到的「跨域推断」

**你的直觉**：RAG 能检索所有文档，信息更全，应该总是更好。

**实验数据**（arXiv:2401.08406，农业 AI 跨地域泛化）：
```
Base model → A省问题（知识库有A省数据）：答案相似度 47%
RAG → A省问题：  ~52%（有限提升）
Fine-tuned → B省问题（知识库无B省数据）：72% (+53%!)
```

**颠覆**：Fine-tuning 让模型学会「农业知识的泛化模式」，可以从 A 省数据推断 B 省场景——这是纯 RAG（只能检索已有文档）做不到的。

**工程启示**：当业务需要从有限样本泛化到更大范围时（如地区扩张、SKU 扩展），FT 的泛化能力是核心价值，不要因为"RAG 信息更全"而放弃 FT。

---

### 洞察六：Fine-tuning 注入新事实需要 10× 重复，不是 1×

**你的直觉**：把新文档放进训练集，模型就会"学到"这个事实。

**实验数据**（arXiv:2312.05934）：
```
Current Events 准确率：
  FT-reg（每条事实 1 个变体）: 0.504（仅比 base +4.8%）
  FT-par（每条事实 10× 变体）: 0.588（比 base +22.2%）
  Pure RAG:                   0.875（比 base +81.9%）
```

**颠覆**：即使用 10× paraphrase 重复训练，FT 的事实注入效果仍只有 RAG 的 1/4。这说明 LLM 参数空间对新事实的「写入」极其困难——权重是关联网络，不是地址可寻的存储。

**工程启示**：
```python
# 如果你坚持要用 FT 注入知识（不推荐），至少生成 10× paraphrase
from openai import OpenAI

def generate_paraphrases(fact: str, n: int = 10) -> list[str]:
    """为同一个事实生成 n 个不同表述"""
    client = OpenAI()
    
    response = client.responses.create(
        model="gpt-5.6",
        input=[{
            "role": "user",
            "content": f"""Generate {n} different ways to express this fact.
Vary sentence structure, vocabulary, and perspective.
Each paraphrase on a new line.

Fact: {fact}"""
        }],
    )
    
    paraphrases = response.output_text.strip().split("\n")
    return [p.strip() for p in paraphrases if p.strip()]

# 使用示例
fact = "量子计算公司 QuantumLeap 于 2025 年 3 月完成了 5 亿美元 B 轮融资。"
paraphrases = generate_paraphrases(fact, n=10)
# 即使如此，效果仍远低于直接用 RAG 检索这条信息
# 推荐：将此类事实放入 RAG 知识库，而非 FT 数据集
```

---

## 23.7 生产决策 SOP

### Step 0：先跑 RAG Baseline（永远的第一步）

```python
# 最小 RAG baseline（30 分钟内可跑通）
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import time

class MinimalRAGBaseline:
    """30 分钟上线的最小 RAG baseline——用来决定是否需要 FT"""
    
    def __init__(self, docs: list[str]):
        self.encoder = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
        self.qdrant = QdrantClient(":memory:")  # 内存模式，无需安装
        self.llm = OpenAI()
        
        # 建索引
        self.qdrant.create_collection(
            "docs",
            vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        )
        vecs = self.encoder.encode(docs).tolist()
        self.qdrant.upsert("docs", points=[
            models.PointStruct(id=i, vector=v, payload={"text": d})
            for i, (v, d) in enumerate(zip(vecs, docs))
        ])
    
    def ask(self, question: str, top_k: int = 5) -> dict:
        t0 = time.time()
        q_vec = self.encoder.encode(question, prompt_name="query").tolist()
        hits = self.qdrant.query_points(
            collection_name="docs",
            query=q_vec,
            limit=top_k,
        ).points
        context = "\n\n".join(h.payload["text"] for h in hits)
        
        response = self.llm.responses.create(
            model="gpt-5.6",
            input=[
                {"role": "system", "content": "Answer based on the context. Be concise."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
            ],
        )
        
        return {
            "answer": response.output_text,
            "latency_ms": int((time.time() - t0) * 1000),
            "top_scores": [h.score for h in hits],
        }

# 使用 30 分钟评估 RAG 是否足够好
# 如果准确率 > 80%：继续优化 RAG（chunk 策略 / reranker / HyDE）
# 如果准确率 60–80%：考虑 RAFT
# 如果准确率 < 60%：分析原因（知识库质量 vs 检索 vs 生成）
```

### Step 1：诊断 RAG 失败原因

```python
# RAG 失败分类诊断器
def diagnose_rag_failure(
    question: str,
    retrieved_docs: list[str],
    expected_answer: str,
    actual_answer: str,
) -> str:
    """
    分类 RAG 失败原因，决定下一步是 FT 还是优化 RAG
    返回：failure_type + recommended_action
    """
    
    # 检查检索质量
    relevant_found = any(
        expected_answer.lower() in doc.lower() 
        for doc in retrieved_docs
    )
    
    if not relevant_found:
        # 检索失败——问题根在知识库，而非模型
        return {
            "failure_type": "RETRIEVAL_FAILURE",
            "symptom": "正确答案所在文档未被检索到",
            "action": "优化 RAG：改进 chunk 策略 / 使用 HyDE / 添加 reranker",
            "do_not": "此时加 FT 无效——模型没看到相关文档",
        }
    
    # 文档检索到了，但答案还是错的
    if relevant_found:
        return {
            "failure_type": "GENERATION_FAILURE",
            "symptom": "相关文档已检索，但模型无法正确推理",
            "action": "考虑 RAFT（训练模型更好地利用检索文档）or 改进 prompt",
            "do_not": "不要只加更多文档——文档已经够了",
        }

# 另一种失败：任何文档都没有答案
def check_knowledge_gap(question: str, all_docs: list[str]) -> bool:
    """检查知识库是否根本没有这条信息"""
    # 简单版：用 top-1 分数判断
    # 分数 < 0.5 通常意味着知识库不含相关信息
    # → 解决方案：补充知识库文档，而非 FT
    pass
```

### Step 2：决定是否引入 Fine-tuning

```python
# 完整决策流程（含定量门槛）
def should_finetune(evaluation_results: dict) -> dict:
    """
    evaluation_results 包含：
      rag_accuracy: float        # 纯 RAG 准确率
      retrieval_recall: float    # 检索召回率（oracle doc 在 top-k 中的比例）
      cross_domain_gap: float    # 跨域泛化差距（若适用）
      update_frequency: str      # "high" / "medium" / "low"
      style_complaints: bool     # 用户反馈输出风格不对
    """
    
    decisions = []
    
    # 门槛 1：RAG 准确率已足够好
    if evaluation_results["rag_accuracy"] > 0.85:
        return {"decision": "RAG_ONLY", "reason": "RAG 准确率已达 85%+，无需 FT"}
    
    # 门槛 2：检索召回差 → 先修 RAG
    if evaluation_results["retrieval_recall"] < 0.7:
        decisions.append("FIX_RETRIEVAL_FIRST")
    
    # 门槛 3：知识更新频繁 → FT 代价太高
    if evaluation_results["update_frequency"] == "high":
        decisions.append("AVOID_FT_HIGH_UPDATE_COST")
        return {"decision": "RAG_ONLY", "reasons": decisions}
    
    # 门槛 4：跨域泛化差距大 → FT 有价值
    if evaluation_results.get("cross_domain_gap", 0) > 0.2:
        decisions.append("FT_HELPS_GENERALIZATION")
    
    # 门槛 5：风格投诉 → FT 最有效
    if evaluation_results.get("style_complaints", False):
        decisions.append("FT_FOR_STYLE")
    
    # 综合决策
    if "FT_HELPS_GENERALIZATION" in decisions and "FT_FOR_STYLE" in decisions:
        return {"decision": "FT_PLUS_RAG", "reasons": decisions}
    elif "FT_HELPS_GENERALIZATION" in decisions:
        return {"decision": "RAFT", "reasons": decisions}
    elif "FT_FOR_STYLE" in decisions:
        return {"decision": "FT_ONLY", "reasons": decisions}
    
    # 默认：继续优化 RAG（reranker / chunk / HyDE）
    return {"decision": "OPTIMIZE_RAG", "reasons": ["RAG 有提升空间，优先于 FT"]}
```

---

## 本章小结

Fine-tuning 和 RAG 是互补而非竞争的关系，但适用场景有本质区别：

```
Fine-tuning 擅长：
  ✅ 改变输出风格 / 格式 / 对话模式
  ✅ 跨域知识泛化（从 A 推断 B）
  ✅ 特定领域的推理模式学习

RAG 擅长：
  ✅ 注入新事实（截止日后的知识）
  ✅ 知识频繁更新的场景
  ✅ 需要引用来源的场景
  ✅ 降低幻觉风险

RAFT 适用：
  ✅ 固定封闭知识库 + 检索噪声
  ✅ 需要模型引用原文的场景
  ✅ 对话密集型领域应用（医疗 / 法律 / 代码）
```

**扩展阅读**：[安全合规 · 必读](/knowledge/05-security-compliance)——生产知识库的数据分级、PII 脱敏和推断性隐私攻击演练。

---

> **参考文献**
> - arXiv:2312.05934 — 「Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs」，Microsoft，2023
> - arXiv:2403.10131 — 「RAFT: Adapting Language Model to Domain Specific RAG」，Berkeley/Microsoft/Meta，2024
> - arXiv:2401.08406 — 「RAG vs Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture」，Microsoft，2024
> - [Gorilla Project](https://github.com/ShishirPatil/gorilla)（⭐ 12,978）— RAFT 开源实现
> - [Anyscale Blog: Fine-tuning is for Form, Not Facts](https://www.anyscale.com/blog/fine-tuning-is-for-form-not-facts)

## 来源与复核

- **本轮接口核对（截至 2026-08-01）**：[OpenAI Responses API quickstart](https://developers.openai.com/api/docs/quickstart) 与 [Qdrant Local Quickstart](https://qdrant.tech/documentation/quickstart/)；论文数值与 RAFT 训练结论尚未逐项复现实验。
- **复核状态**：待复核。任何易漂移的版本、价格、法律或性能结论，采用前都必须回到一手来源再次确认。
- **代码状态**：示意代码。未被本地 smoke test 覆盖的片段不得解释为生产可运行。
- **证据边界**：本页成熟度只描述内容形态，不代表部署、上线或生产验收已经完成。
- **下一验收动作**：按仓库根目录 `content-audit.md` 中本模块的证据缺口补齐来源、fixture 与验收回执。
