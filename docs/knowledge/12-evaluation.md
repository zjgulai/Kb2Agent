# 第十四章：Agent 知识调用质量评估

> **核心问题**：你的知识库建完之后，怎么知道它真的有用？这一章给出可量化的评估方法、幻觉检测机制、以及基准测试设计原则。

---

## 12.1 为什么"感觉对"不够用？

很多团队的评估方式是：问 Agent 几个问题，感觉回答不错，就上线了。

这个方法有三个根本缺陷：

1. **选择性偏差**：你倾向于问自己熟悉的问题，而 Agent 最容易失败的是边界问题
2. **无法发现幻觉**：LLM 生成的内容看起来永远很流畅，即使内容是错的
3. **无法追踪退化**：上周还好用，这周更新了 Skill 后悄悄变差了

**评估体系的第一性原理**：不是"Agent 说了什么"，而是"Agent 说的内容能否被知识库的原始来源所支撑"。

---

## 12.2 三层评估体系

参照 2026 年 ACL Anthology 的 SoK 框架，Agent 知识调用的评估必须在三个层面同时进行：

```mermaid
flowchart TD
    L1[Layer 1: 组件级评估<br/>每个单独的环节正确吗？]
    L2[Layer 2: 轨迹级评估<br/>整个推理链路合理吗？]
    L3[Layer 3: 系统级评估<br/>端到端结果对用户有价值吗？]

    L1 --> L2 --> L3

    subgraph L1_detail [Layer 1 组件]
        C1[检索精确度<br/>Precision@K]
        C2[幻觉检测<br/>Faithfulness Score]
        C3[Skill触发准确率<br/>Trigger Accuracy]
    end

    subgraph L2_detail [Layer 2 轨迹]
        T1[推理步骤合理性<br/>Progress Rate]
        T2[工具调用正确率<br/>Tool Use F1]
        T3[中间结果一致性<br/>Step Coherence]
    end

    subgraph L3_detail [Layer 3 系统]
        S1[任务完成率<br/>Task Success Rate]
        S2[用户满意度<br/>CSAT]
        S3[成本效率<br/>Token per Success]
    end
```

---

## 12.3 幻觉检测：最重要的评估维度

幻觉是知识库系统最危险的失效模式。Agent 说出了听起来合理但知识库里不存在的内容。

### 幻觉分类

| 类型 | 描述 | 危险级别 |
| :--- | :--- | :--- |
| **内在幻觉** | Agent 生成的内容与检索到的上下文矛盾 | [P0] 高 |
| **外在幻觉** | 内容听起来合理但无法在任何来源中找到 | [P0] 高 |
| **引用幻觉** | 引用了不存在的"来源"或"研究" | [P0] 极高 |
| **数值幻觉** | 数字/日期/版本号不正确 | [P1] 中 |
| **实体幻觉** | 人名/产品名/公司名不正确 | [P1] 中 |

### 幻觉检测实现

```python
class HallucinationDetector:
    """
    基于 NLI（自然语言推断）的幻觉检测
    判断 Agent 输出是否能被检索到的上下文支撑
    """

    def __init__(self):
        from openai import OpenAI
        self.llm = OpenAI()
        # 评估专用模型（必须与生成模型不同！）
        self.eval_model = "gpt-4o"

    def check(self, query: str, context: str, response: str) -> dict:
        """
        检查 response 是否有幻觉

        Args:
            query: 用户问题
            context: 检索到的上下文
            response: Agent 的回答

        Returns:
            {
                "has_hallucination": bool,
                "faithfulness_score": float,  # 0-1，越高越好
                "unsupported_claims": list,   # 无法被 context 支撑的句子
                "severity": "none/low/medium/high"
            }
        """
        import json

        # 1. 将 response 分割为句子级别的声明
        sentences = [s.strip() for s in response.split('。') if s.strip()]

        # 2. 逐句检验是否被 context 支撑
        unsupported = []
        for sent in sentences:
            if len(sent) < 10:  # 跳过过短的句子
                continue

            resp = self.llm.chat.completions.create(
                model=self.eval_model,
                messages=[{
                    "role": "user",
                    "content": f"""判断以下声明是否能被上下文支撑。

上下文（来自知识库检索）：
{context[:2000]}

待验证的声明：
{sent}

判断标准：
- "支撑"：上下文中有直接或间接支撑这个声明的内容
- "部分支撑"：上下文暗示了这个方向，但不够明确
- "不支撑"：上下文没有提到，或与之矛盾

输出 JSON：
{{"verdict": "supported/partial/unsupported", "reason": "...", "confidence": 0.0-1.0}}"""
                }],
                response_format={"type": "json_object"},
            )

            result = json.loads(resp.choices[0].message.content)
            if result.get("verdict") == "unsupported" and result.get("confidence", 0) > 0.7:
                unsupported.append({
                    "sentence": sent,
                    "reason": result.get("reason", ""),
                    "confidence": result.get("confidence", 0),
                })

        faithfulness = 1.0 - len(unsupported) / max(len(sentences), 1)

        return {
            "has_hallucination": len(unsupported) > 0,
            "faithfulness_score": faithfulness,
            "unsupported_claims": unsupported,
            "severity": (
                "none" if faithfulness > 0.95
                else "low" if faithfulness > 0.85
                else "medium" if faithfulness > 0.7
                else "high"
            )
        }
```

---

## 12.4 基准测试设计

好的基准测试必须覆盖四类问题，缺一不可：

### 四类测试问题设计原则

```python
class BenchmarkDesigner:
    """
    为知识库设计四类基准测试问题
    """

    QUESTION_TYPES = {
        "factual": {
            "description": "单跳事实查找",
            "example": "什么是 Atomic Insight？",
            "evaluation": "答案是否正确且在知识库中有明确来源",
            "target_score": 0.90,
        },
        "multi_hop": {
            "description": "多跳推理",
            "example": "为什么 GraphRAG 在单跳查询上比 VectorRAG 差？",
            "evaluation": "答案是否正确连接了多个知识点",
            "target_score": 0.75,
        },
        "procedural": {
            "description": "流程/操作类",
            "example": "如何用 MinerU 处理带复杂表格的 PDF？",
            "evaluation": "步骤是否完整、可执行、有边界说明",
            "target_score": 0.85,
        },
        "adversarial": {
            "description": "对抗测试（诱饵题）",
            "example": "MinerU 能处理 MP4 视频文件吗？（答案是不能）",
            "evaluation": "Agent 是否正确拒绝/纠正错误前提",
            "target_score": 0.80,
        },
    }

    def generate_test_suite(self, skill_content: str, n_per_type: int = 5) -> list:
        """为 SKILL.md 自动生成测试套件"""
        from openai import OpenAI
        import json

        llm = OpenAI()
        all_tests = []

        for q_type, config in self.QUESTION_TYPES.items():
            resp = llm.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": f"""为以下 Skill 生成 {n_per_type} 个「{config['description']}」类型的测试问题。

Skill 内容：
{skill_content[:1500]}

要求：
1. 问题要能区分"真正理解这个Skill"和"只是模糊知道"的差异
2. 包含 1-2 个诱饵题（包含错误前提的问题）
3. 每个问题要有标准答案

输出 JSON：
{{"tests": [{{"question": "...", "expected": "...", "type": "{q_type}", "is_adversarial": false}}]}}"""
                }],
                response_format={"type": "json_object"},
            )

            tests = json.loads(resp.choices[0].message.content).get("tests", [])
            all_tests.extend(tests)

        return all_tests
```

---

## 12.5 评估仪表盘（可视化）

### 关键指标追踪

```python
class EvaluationDashboard:
    """评估结果记录与展示"""

    def __init__(self, log_file: str = "eval_log.jsonl"):
        self.log_file = log_file

    def record(self, test_result: dict):
        """记录单次测试结果"""
        import json
        with open(self.log_file, 'a') as f:
            f.write(json.dumps({
                **test_result,
                "timestamp": __import__('datetime').datetime.now().isoformat()
            }, ensure_ascii=False) + '\n')

    def report(self, last_n_days: int = 7) -> dict:
        """生成评估报告"""
        import json
        from datetime import datetime, timedelta

        cutoff = datetime.now() - timedelta(days=last_n_days)
        results = []

        if not __import__('os').path.exists(self.log_file):
            return {"error": "暂无评估记录"}

        with open(self.log_file) as f:
            for line in f:
                r = json.loads(line)
                ts = datetime.fromisoformat(r["timestamp"])
                if ts > cutoff:
                    results.append(r)

        if not results:
            return {"error": f"过去 {last_n_days} 天没有评估记录"}

        # 计算关键指标
        faithfulness_scores = [r.get("faithfulness_score", 1.0) for r in results]
        task_success = [r.get("task_success", False) for r in results]
        hallucination_detected = [r.get("has_hallucination", False) for r in results]

        return {
            "period": f"过去 {last_n_days} 天",
            "total_evaluations": len(results),
            "metrics": {
                "avg_faithfulness": sum(faithfulness_scores) / len(faithfulness_scores),
                "task_success_rate": sum(task_success) / len(task_success),
                "hallucination_rate": sum(hallucination_detected) / len(hallucination_detected),
            },
            "status": "healthy" if sum(faithfulness_scores) / len(faithfulness_scores) > 0.9
                      else "warning",
        }

    def print_report(self):
        """打印人类可读的报告"""
        report = self.report()
        if "error" in report:
            print(f"[!] {report['error']}")
            return

        metrics = report["metrics"]
        status_icon = "(OK)" if report["status"] == "healthy" else "[!]"

        print(f"\n{'='*50}")
        print(f"知识库评估报告 ({report['period']})")
        print(f"{'='*50}")
        print(f"总评估次数: {report['total_evaluations']}")
        print(f"\n核心指标:")
        print(f"  忠实度 (Faithfulness):  {metrics['avg_faithfulness']:.1%} "
              f"{'(OK)' if metrics['avg_faithfulness'] > 0.9 else '[!]'}")
        print(f"  任务完成率:              {metrics['task_success_rate']:.1%} "
              f"{'(OK)' if metrics['task_success_rate'] > 0.8 else '[!]'}")
        print(f"  幻觉检出率:              {metrics['hallucination_rate']:.1%} "
              f"{'(OK)' if metrics['hallucination_rate'] < 0.1 else '[P0]'}")
        print(f"\n系统状态: {status_icon} {report['status'].upper()}")
        print(f"{'='*50}\n")
```

---

## 12.6 评估的三条铁律

**铁律 1：评估模型必须与生成模型不同**

LLM 自评准确率仅 46.4%（SkillLens 论文实证）。用同一个 LLM 既生成回答、又评估回答，等于用同一张嘴既说谎又判断自己是否在说谎。

```python
# (X) 错误：用同一模型生成和评估
answer = gpt4o.generate(question)
score = gpt4o.evaluate(answer)  # 这个评分不可信

# (OK) 正确：用不同模型评估
answer = gpt4o_mini.generate(question)
score = gpt4o.evaluate(answer)  # 不同能力级别，更可信
```

**铁律 2：幻觉检测必须在句子级别，不是文档级别**

文档级别的评估会被"大部分正确"掩盖局部幻觉。一段回答中 90% 正确、10% 幻觉，如果只给一个整体分数，你永远不知道那 10% 在哪里。

**铁律 3：每次知识库更新后必须跑完整基准测试**

不能假设"只改了一个 Skill，其他应该没问题"。知识库中的知识是互相关联的，一个 Skill 的修改可能影响依赖它的其他 Skill 的触发逻辑。

---

## 12.7 与 darwin-skill 的集成

评估系统和 darwin-skill 的棘轮机制必须协同工作：

```python
# 完整的 Skill 迭代流程（集成评估）
def skill_iteration_with_eval(skill_path: str):
    evaluator = SkillEvaluator()       # darwin-skill 9维度评估
    hall_detector = HallucinationDetector()
    benchmark = BenchmarkDesigner()
    evolver = SkillEvolver()

    skill_content = Path(skill_path).read_text()

    # 1. 生成基准测试
    tests = benchmark.generate_test_suite(skill_content)

    # 2. 运行基准测试 + 幻觉检测
    for test in tests:
        response = agent.answer(test["question"])
        hall_result = hall_detector.check(
            query=test["question"],
            context=skill_content,
            response=response
        )
        if hall_result["severity"] in ["high", "medium"]:
            logger.warning(f"[!] 发现幻觉: {test['question'][:50]}...")

    # 3. 基线评估（9维度）
    baseline_score = evaluator.evaluate(skill_content)["total_score"]
    logger.info(f"基线评分: {baseline_score:.1f}")

    # 4. 棘轮优化（只有评分提升才保留）
    for dim in SkillEvaluator.DIMENSIONS.keys():
        result = evolver.evolve_one_dimension(skill_path, dim)
        if result["improved"]:
            logger.success(f"(OK) [{dim}] 提升: {result['old_score']:.1f} → {result['new_score']:.1f}")
        else:
            logger.info(f">> [{dim}] 未提升，跳过")

    logger.success(f"Skill 迭代完成: {skill_path}")

---

## 14.8 A/B 测试框架（评估驱动迭代）

:::tip 核心原则
不靠感觉判断哪个 Prompt 或架构更好——用标准测试集 + 统计显著性检验。
:::

```python
"""ab_test_framework.py — 知识库 A/B 测试"""
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from scipy import stats as scipy_stats

GOLDEN_SET = [
    {"query": "美国市场性价比高的便携充电器", "expected_category": "便携充电器", "market": "US"},
    {"query": "日本宠物智能饮水机机会分析", "expected_category": "宠物用品", "market": "JP"},
    {"query": "德国户外露营灯具市场空白", "expected_category": "户外照明", "market": "DE"},
    # ... 扩展到20个覆盖各品类×市场的标准查询
]

@dataclass
class ABResult:
    variant: str
    hits_at_5: list[bool] = field(default_factory=list)
    latencies_ms: list[float] = field(default_factory=list)

    @property
    def hit_rate(self) -> float:
        return sum(self.hits_at_5) / len(self.hits_at_5) if self.hits_at_5 else 0

    @property
    def avg_latency(self) -> float:
        return sum(self.latencies_ms) / len(self.latencies_ms) if self.latencies_ms else 0

def assign_variant(query: str, salt: str = "v1") -> str:
    """按查询的哈希值稳定分流（同一查询始终走同一变体）"""
    h = int(hashlib.md5(f"{query}{salt}".encode()).hexdigest(), 16)
    return "B" if h % 2 == 0 else "A"

def run_ab_test(search_fn_a, search_fn_b, test_set=None) -> dict:
    """运行A/B测试，返回统计结果"""
    test_set = test_set or GOLDEN_SET
    result_a = ABResult("A")
    result_b = ABResult("B")

    import time
    for item in test_set:
        query, expected = item["query"], item["expected_category"]
        variant = assign_variant(query)

        t0 = time.time()
        if variant == "A":
            results = search_fn_a(query)
            r = result_a
        else:
            results = search_fn_b(query)
            r = result_b

        latency = (time.time() - t0) * 1000
        hit = any(expected in str(res) for res in results[:5])
        r.hits_at_5.append(hit)
        r.latencies_ms.append(latency)

    # 卡方检验（命中率差异是否显著）
    a_hits, b_hits = sum(result_a.hits_at_5), sum(result_b.hits_at_5)
    a_total, b_total = len(result_a.hits_at_5), len(result_b.hits_at_5)
    _, p_value = scipy_stats.chi2_contingency([
        [a_hits, a_total - a_hits],
        [b_hits, b_total - b_hits]
    ])[:2]

    report = {
        "A命中率": f"{result_a.hit_rate:.1%}",
        "B命中率": f"{result_b.hit_rate:.1%}",
        "A平均延迟": f"{result_a.avg_latency:.0f}ms",
        "B平均延迟": f"{result_b.avg_latency:.0f}ms",
        "p值": round(p_value, 4),
        "显著差异": p_value < 0.05,
        "建议": "上线B（命中率提升显著）" if b_hits > a_hits and p_value < 0.05
                else "保持A（差异不显著）"
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report
```

## 14.9 ragas 集成：自动化 RAG 质量评估

```python
"""ragas_eval.py — 用 ragas 评估知识库检索质量"""
# pip install ragas langchain-openai
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
)
from datasets import Dataset

def build_eval_dataset(questions: list[str], search_fn, answer_fn) -> Dataset:
    """构建 ragas 所需的评估数据集"""
    data = {"question": [], "answer": [], "contexts": [], "ground_truth": []}

    for q in questions:
        contexts = search_fn(q)          # 检索结果（文本列表）
        answer = answer_fn(q, contexts)  # LLM生成回答

        data["question"].append(q)
        data["answer"].append(answer)
        data["contexts"].append(contexts)
        data["ground_truth"].append("")  # 可选：提供标准答案提升评估精度

    return Dataset.from_dict(data)

def run_ragas_eval(dataset: Dataset) -> dict:
    """运行 ragas 评估，返回四维得分"""
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_recall, context_precision]
    )
    scores = {
        "忠实度（无幻觉）": round(result["faithfulness"], 3),
        "答案相关性": round(result["answer_relevancy"], 3),
        "上下文召回率": round(result["context_recall"], 3),
        "上下文精准度": round(result["context_precision"], 3),
    }
    print("ragas 评估结果:")
    for k, v in scores.items():
        status = "(OK)" if v > 0.7 else ("[!]" if v > 0.5 else "(X)")
        print(f"  {status} {k}: {v}")
    return scores
```

:::tip 下一章
评估体系建立后，高频使用的 Prompt 模板和工具调用可以进一步固化——详见 [第十五章：Codex Prompts 速查](15-codex-prompts.md)。
:::
