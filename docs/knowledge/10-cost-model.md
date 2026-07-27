---
name: cost-model-and-budget-management
description: 成本模型与预算管理文档，涵盖知识库建设到运行的全生命周期成本、预算方案、ROI 与熔断机制。当需要在立项前回答知识库月度费用与回报问题时使用。
---

# 第十章：成本模型与预算管理

::: tip
没有成本意识 = 项目不可持续。本章给你一个可直接用的成本计算器和三档预算方案。
:::

老板真正关心的不是“技术上能不能做”，而是“上线后每月烧多少钱、多久回本”。所以这一章只做一件事：把知识库从建库、查询到持续进化的成本拆成可计算、可熔断、可汇报的数字。

## 10.1 知识库全生命周期成本拆解

**估算口径**：首月完成 10 万条知识入库，月查询 1 万次，约 5 万页原始文档，平均每条知识 500 tokens，平均每次问答消耗 4K tokens，单实例线上服务。

| 环节 | 开源方案 | 商业 API 方案 | 10 万条知识 / 1 万次查询月估算 |
| :--- | :--- | :--- | :--- |
| 采集 | Firecrawl 免费层，低频抓取 $0 | Firecrawl Pro，$49/月 | **$49** |
| 文档提取 | PyMuPDF 本地解析，边际成本约 $0 | Azure Document Intelligence，$0.01/页 | **$500** |
| 结构化提取 | Qwen2.5-14B 本地，GPU 成本并入基础设施 | Claude API，$0.003/1K tokens | **$540**（按 1.8 亿 tokens） |
| Embedding 生成 | BGE-M3 本地，批处理生成 | OpenAI Embedding，$0.02/1M tokens | **$1**（按 5000 万 tokens） |
| 向量存储 | ChromaDB 本地，磁盘成本并入基础设施 | Pinecone 标准实例，$70/月 | **$70** |
| LLM 查询 | Qwen2.5 本地推理，GPU 成本并入基础设施 | Claude API，$0.015/1K tokens | **$600**（按 4000 万 tokens） |
| 监控 | Prometheus + Grafana 本地，约 $0 边际成本 | Datadog，$15/主机/月 | **$15** |
| **全本地方案月费** | **1 台 4090 工作站摊销 + 电费 + SSD + 备份** | — | **约 $280/月（≈ ¥2,000）** |
| **全商业方案月费** | — | **全链路商业 API + 商业向量库** | **约 $1,775/月（≈ ¥12,800）** |

**结论**：如果你是首月全量建库，全商业方案通常是全本地的 **6 倍左右**。但进入稳态后，商业方案会因为“只处理增量数据”而下降很多；本地方案则更像固定折旧，调用越多越划算。

## 10.2 月度成本计算器

下面这个脚本直接回答“换成 30 万条知识会多少钱”。你只要改 3 个输入：知识条数、月查询量、数据源数量。

```python
from dataclasses import dataclass, asdict
import json


@dataclass
class CostInput:
    knowledge_count: int = 100_000
    monthly_queries: int = 10_000
    source_count: int = 50


@dataclass
class CostBreakdown:
    crawl: float
    doc_extract: float
    structure_extract: float
    embedding: float
    vector_store: float
    llm_query: float
    monitoring: float
    total: float


def estimate_cost(data: CostInput, commercial: bool = True) -> CostBreakdown:
    if not commercial:
        fixed_local_infra = 280.0
        return CostBreakdown(
            crawl=0.0,
            doc_extract=0.0,
            structure_extract=0.0,
            embedding=0.0,
            vector_store=0.0,
            llm_query=0.0,
            monitoring=0.0,
            total=fixed_local_infra,
        )

    pages = max(data.knowledge_count // 2, data.source_count * 500)
    extract_tokens = data.knowledge_count * 1800
    embedding_tokens = data.knowledge_count * 500
    query_tokens = data.monthly_queries * 4000

    breakdown = CostBreakdown(
        crawl=49.0,
        doc_extract=pages * 0.01,
        structure_extract=(extract_tokens / 1000) * 0.003,
        embedding=(embedding_tokens / 1_000_000) * 0.02,
        vector_store=70.0,
        llm_query=(query_tokens / 1000) * 0.015,
        monitoring=15.0,
        total=0.0,
    )
    breakdown.total = round(
        breakdown.crawl
        + breakdown.doc_extract
        + breakdown.structure_extract
        + breakdown.embedding
        + breakdown.vector_store
        + breakdown.llm_query
        + breakdown.monitoring,
        2,
    )
    return breakdown


if __name__ == "__main__":
    user_input = CostInput(
        knowledge_count=100_000,
        monthly_queries=10_000,
        source_count=50,
    )

    commercial = estimate_cost(user_input, commercial=True)
    local = estimate_cost(user_input, commercial=False)

    print("=== 商业 API 方案 ===")
    print(json.dumps(asdict(commercial), indent=2, ensure_ascii=False))
    print("=== 全本地方案 ===")
    print(json.dumps(asdict(local), indent=2, ensure_ascii=False))
```

## 10.3 三档预算方案

| 方案 | 技术栈 | 适用规模 | 月度成本明细 | 团队规模 |
| :--- | :--- | :--- | :--- | :--- |
| [轻量] **轻量方案**<br/>＜¥5 万/年 | Ollama + Qwen2.5 + BGE-M3 + ChromaDB + Prometheus | 1-5 万条知识，月查询 < 3000 | 设备摊销 ¥1500-2500 + 备份/电费 ¥300-800，**零 API 费** | 1-2 人，通常是 1 名工程师兼运维 |
| [标准] **标准方案**<br/>¥5-50 万/年 | 公开数据走 Firecrawl / Azure / Claude，内部数据走本地 Qwen + ChromaDB | 5-50 万条知识，月查询 3000-5 万 | API ¥3000-15000 + 本地 GPU ¥2000-5000 + 监控/存储 ¥1000-3000 | 2-4 人，含 1 名业务 Owner |
| 决 **企业方案**<br/>¥50-200 万/年 | 商业向量库 + 企业级 API + Datadog + CI/CD + 权限审计 | 50 万条以上，月查询 5 万+，多 BU 共用 | 平台费 ¥2-8 万 + 安全/审计 ¥1-3 万 + 人力 ¥2-8 万 | 4-8 人，含平台、算法、数据、业务运营 |

选择原则很简单：**轻量方案先证明 ROI，标准方案追求速度，企业方案追求 SLA 与治理**。不要一开始就买最贵的栈，除非你的老板买的是“风险确定性”而不是“最低单价”。

## 10.4 ROI 计算模型

公式先写死：

```text
月收益 = 每月节省工时 × 人均小时成本 × 实际采用率
年化 ROI = (年化收益 - 年化总成本) / 年化总成本 × 100%
```

**真实场景：10 人选品团队**

- 每人每天节省 3.5 小时 × 10 人 × 22 天 = **770 人时/月**
- 按人均成本 ¥150/小时 → **月节省 ¥115,500**
- 年化满产收益：¥115,500 × 12 = **¥1,386,000**

### Year 1：建设期

- 假设采用率只做到 **70%**
- 年化收益：¥1,386,000 × 70% = **¥970,200**
- Year 1 总成本：建设 + 运行合计 **¥300,000**

```text
ROI = (970,200 - 300,000) / 300,000 × 100% = 223.4%
```

### Year 2 / 3：成熟期

- 假设采用率接近 100%
- 年化收益：**¥1,386,000**
- 年运行成本：**¥150,000**

```text
ROI = (1,386,000 - 150,000) / 150,000 × 100% = 824%
```

**决策建议**：即使按“Year 1 只有 70% 采用率”的保守口径，ROI 仍然 **> 200%**。所以老板不该问“能不能做”，而该问“先在哪个团队做最先回本”。

## 10.5 成本熔断机制（`cost_guard.py`）

预算一定要做成代码，不要靠群里口头提醒。

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
import json
from pathlib import Path


@dataclass
class BudgetConfig:
    monthly_limit: float = 500.0
    daily_limit: float = 50.0
    ledger_path: str = "cost_ledger.json"


@dataclass
class Decision:
    action: str
    reason: str
    approved_cost: float = 0.0
    sample_size: int | None = None


@dataclass
class CostGuard:
    config: BudgetConfig = field(default_factory=BudgetConfig)

    def _load(self) -> dict:
        path = Path(self.config.ledger_path)
        if not path.exists():
            return {"monthly": {}, "daily": {}}
        return json.loads(path.read_text(encoding="utf-8"))

    def _save(self, ledger: dict) -> None:
        Path(self.config.ledger_path).write_text(
            json.dumps(ledger, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def _spent(self, ledger: dict) -> tuple[float, float, str, str]:
        today = date.today().isoformat()
        month = today[:7]
        daily_spent = ledger["daily"].get(today, 0.0)
        monthly_spent = ledger["monthly"].get(month, 0.0)
        return daily_spent, monthly_spent, today, month

    def check(self, operation: str, estimated_cost: float, is_core: bool) -> Decision:
        ledger = self._load()
        daily_spent, monthly_spent, _, _ = self._spent(ledger)

        if monthly_spent + estimated_cost > self.config.monthly_limit:
            if is_core:
                return Decision("degrade", f"{operation} 超月预算，保留核心能力并降级执行")
            return Decision("stop", f"{operation} 超月预算，非核心任务自动停止")

        if daily_spent + estimated_cost > self.config.daily_limit:
            if operation == "llm_as_judge_full":
                return Decision(
                    "degrade",
                    "达到日预算上限，LLM-as-Judge 从 200 条全量降级为 20 条抽样",
                    approved_cost=estimated_cost * 0.1,
                    sample_size=20,
                )
            if is_core:
                return Decision("degrade", f"{operation} 达到日预算上限，切换低成本模式")
            return Decision("stop", f"{operation} 达到日预算上限，非核心任务停止")

        return Decision("allow", f"{operation} 在预算内", approved_cost=estimated_cost)

    def record(self, actual_cost: float) -> None:
        ledger = self._load()
        daily_spent, monthly_spent, today, month = self._spent(ledger)
        ledger["daily"][today] = round(daily_spent + actual_cost, 2)
        ledger["monthly"][month] = round(monthly_spent + actual_cost, 2)
        self._save(ledger)


if __name__ == "__main__":
    guard = CostGuard(BudgetConfig(monthly_limit=500, daily_limit=50))

    decision = guard.check(
        operation="llm_as_judge_full",
        estimated_cost=18.0,
        is_core=False,
    )
    print(decision)

    if decision.action == "allow":
        guard.record(decision.approved_cost)
    elif decision.action == "degrade":
        print(f"降级执行，sample_size={decision.sample_size or 'low-cost-mode'}")
        guard.record(decision.approved_cost)
    else:
        print("停止执行非核心任务")
```

这个守卫至少要做到 4 件事：

- 每月预算上限可配置，默认 **$500**
- 每日上限可配置，默认 **$50**
- 高成本操作自动从**全量**降级为**抽样**（20 条而不是 200 条）
- 一旦超预算，优先保核心链路，停止非核心任务

## 10.6 自进化成本监控

最容易失控的不是问答，而是“自动补盲区”。因为它会不断发现新 gap，再继续补 gap，最后把预算吃光。

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path
from urllib import request


@dataclass
class EvolutionBudgetMonitor:
    monthly_limit: float = 500.0
    alert_threshold: float = 0.8
    webhook_url: str = ""
    state_path: str = "evolution_state.json"
    max_repairs_per_topic: int = 3

    def _load_state(self) -> dict:
        path = Path(self.state_path)
        if not path.exists():
            return {"spent": 0.0, "topics": {}, "history": []}
        return json.loads(path.read_text(encoding="utf-8"))

    def _save_state(self, state: dict) -> None:
        Path(self.state_path).write_text(
            json.dumps(state, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def _alert(self, message: str) -> None:
        print(f"[ALERT] {message}")
        if not self.webhook_url:
            return

        payload = json.dumps({"text": message}).encode("utf-8")
        req = request.Request(
            self.webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        request.urlopen(req, timeout=5)

    def before_task(self, topic: str, estimated_cost: float) -> bool:
        state = self._load_state()
        remaining = self.monthly_limit - state["spent"]
        repair_count = state["topics"].get(topic, 0)

        if repair_count >= self.max_repairs_per_topic:
            self._alert(f"主题 {topic} 已连续自动补洞 {repair_count} 次，停止无限填补盲区")
            return False

        if estimated_cost > remaining:
            self._alert(f"预算余额不足：剩余 ${remaining:.2f}，任务 {topic} 需要 ${estimated_cost:.2f}")
            return False

        if state["spent"] / self.monthly_limit >= self.alert_threshold:
            self._alert(f"本月预算已消耗 {state['spent'] / self.monthly_limit:.0%}，进入审慎模式")

        return True

    def after_task(self, topic: str, actual_cost: float) -> None:
        state = self._load_state()
        state["spent"] = round(state["spent"] + actual_cost, 2)
        state["topics"][topic] = state["topics"].get(topic, 0) + 1
        state["history"].append(
            {
                "topic": topic,
                "cost": actual_cost,
                "time": datetime.now().isoformat(timespec="seconds"),
            }
        )
        self._save_state(state)


if __name__ == "__main__":
    monitor = EvolutionBudgetMonitor(
        monthly_limit=500,
        alert_threshold=0.8,
        webhook_url="",  # 填 Slack / 钉钉 webhook 即可
    )

    task_name = "gap-fill:pricing-rules"
    estimated_cost = 12.0

    if monitor.before_task(task_name, estimated_cost):
        print("任务开始")
        # 在这里执行自动任务
        monitor.after_task(task_name, actual_cost=10.5)
    else:
        print("任务被预算系统拦截")
```

这段逻辑的关键不是“记账”，而是**在每次自动任务前检查预算余额，并给钉钉 / Slack 发告警**。这样你就不会因为一个“自进化代理”周末自己跑嗨了，周一看到 API 账单才发现出事。

## 10.7 成本优化 5 大策略

- **Token 压缩**：把冗长 system prompt 改成结构化模板，通常能减少 **30-50%** token 消耗。
- **缓存热点查询**：用 Redis 做 1 小时 TTL，命中率做上去后，热门问答会直接少掉 **40%+** 的 LLM 请求。
- **批量化调用**：把零散的小请求并成批量 embedding / extraction，降低请求次数和网络开销。
- **分级 LLM**：简单分类、改写、打标签走小模型；复杂推理、冲突仲裁再走推理模型。
- **推理模型替代预处理**：当数据变化极快时，不要过度预蒸馏；直接在查询时让强模型做轻量推理，反而更省。

## 10.8 本章小结：上线前成本检查清单

上线前，至少把下面 10 条逐项打勾：

1. 是否区分了**首月全量建库成本**与**稳态月费**。
2. 是否明确了每条知识的平均 tokens 假设。
3. 是否把 PDF 页数、网页数、音视频时长换算成了采集成本。
4. 是否把 Embedding、向量库、查询成本拆开，而不是只看 LLM 单价。
5. 是否区分了**公开数据可上云**与**内部数据必须本地**。
6. 是否给老板准备了三档预算，而不是一个“拍脑袋数字”。
7. 是否计算了 Year 1 与 Year 2/3 的 ROI，而不是只看建设成本。
8. 是否实现了每日 / 每月预算熔断与降级策略。
9. 是否给自动补盲区、自进化任务加了预算前置检查。
10. 是否建立了 Slack / 钉钉账单告警，确保超支当天就能发现。

如果这 10 条你都能回答清楚，那老板再问“这个知识库每月多少钱”，你就不需要“先试试看”，而是可以直接给出一个有公式、有上限、有回报的答案。

---

:::tip → 下一章
成本规划完成后，深入Skill蒸馏九大仓库的工程路线 → [09-skill-distillation-deep-dive](09-skill-distillation-deep-dive.md)
:::
