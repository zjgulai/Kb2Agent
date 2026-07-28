---
name: knowledge-decision-matrix
description: 产品形态决策矩阵文档，覆盖向量知识库、图谱、NL2SQL、MCP第5形态的选型判断标准。当需要决定用哪种知识产品形态时使用。
---

# 第二章：输入类型 × 输出形式决策矩阵

> 从信息源到知识的路由决策。2026 年新增第 5 种产品形态：MCP 工具形态。

## 2.0 产品形态决策（先于一切技术选型）

知识库的技术架构应由**产品形态**决定，而非反过来。2026 年有五种形态：

| 形态 | 描述 | 用户 | 技术接入 | 新鲜度要求 |
|------|------|------|----------|-----------|
| A Chatbot | 对话式问答助手 | 终端用户 | WebSocket/HTTP | 日级更新 |
| B 自动化 Agent | 无人值守自动执行 | 系统/定时任务 | SDK/API | 小时级更新 |
| C Dashboard | 数据可视化看板 | 管理者 | REST API + 前端 | 日级更新 |
| D 嵌入式 API | 被其他系统调用 | 开发者 | REST/GraphQL | 按需更新 |
| **E MCP 工具** | **知识库作为通用 MCP Server** | **Claude/Cursor/Codex App** | **MCP 协议** | **实时同步** |

:::tip 2026 年新范式：MCP 工具形态
**传统方式**：为每个 Agent/应用写适配代码 → FastAPI 封装 → Agent 调用

**MCP 方式**：封装一次 MCP Server → Claude Desktop、Cursor、Codex App、任意 MCP Client 直接连接，无需适配代码

```python
# 最小 MCP Server（用 FastMCP）
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("product_kb")

@mcp.tool()
def search_products(query: str, top_k: int = 5) -> str:
    """在选品知识库中搜索产品。"""
    # 本地 ChromaDB 查询，数据不出境
    return chroma_search(query, top_k)

if __name__ == "__main__":
    mcp.run()
```text

MCP 协议将知识库从"被调用的服务"升级为"通用工具基础设施"。
:::

```mermaid
flowchart LR
    subgraph Clients ["MCP Client - No Adapter Needed"]
        A[Claude Desktop]
        B[Cursor]
        C[Codex App]
        D[自定义 Agent]
    end
    
    E["MCP 协议层\nTools / Resources / Prompts"]
    
    subgraph Servers ["MCP Server Layer"]
        F[选品知识库\nproduct_kb]
        G[Firecrawl\n采集服务]
        H[ChromaDB\n向量库]
        I[内部数据\n本地隔离]
    end
    
    Clients --> E --> Servers
    
    classDef protocol fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    class E protocol
```text

---

### 2.1 输入类型 MECE 分类（9种，完全覆盖）

| 类型 | 典型内容 | 信息特征 |
|------|----------|----------|
| A 长文本 | 书籍/PDF/Word/论文 | 高密度声明性知识，结构已有 |
| B 视频 | 教程/演讲/课程/B站 | 时序+视觉，字幕低信噪比 |
| C 音频 | 播客/会议录音/有声书 | 纯语音，无视觉，多人对话 |
| D 网页/流媒体 | 博客/RSS/Twitter Thread | 碎片化，单篇价值低，聚合后高 |
| E 代码仓库 | GitHub Repo/API文档 | 代码是实现，需提取使用模式 |
| F 人物/经验 | 专家访谈/同事知识/个人记录 | 高度隐性，多源分散 |
| G 结构化数据 | Excel/CSV/数据库 | 数字无语义，需领域知识解读 |
| H 图像/图表 | 架构图/白板/设计稿 | 视觉关系>文本，无法直接检索 |
| I 实时/动态 | 会议/直播/在线课程 | 噪音极大，需先结束后处理 |
| J 交互画布 | BI看板/SPA单页应用 | 信息存在状态中，DOM抓取无效 |

---

### 2.2 输出形式全谱（6种，按粒度排序）

```text
细粒度                                                         粗粒度
  │                                                              │
  ▼                                                              ▼
Rules      原子笔记    Wiki 页面     Agent Skill    Fine-tune    知识图谱
JSONL      Markdown    Markdown      SKILL.md        JSONL        Neo4j
(bdistill) (Zettel.)   (LLM-Wiki)   (可执行)        (训练数据)   (关系库)
```text

---

### 2.3 决策矩阵（输入 × 输出最优匹配）

| 输入类型 | 首选输出 | 备选输出 | 理由 |
|----------|----------|----------|------|
| A 长文本 | Wiki 页面 + 四层金字塔 | Agent Skill（高频流程）| 文本密度高，适合完整建库 |
| B 视频 | Agent Skill | 原子笔记（知识类）| 时序操作→可执行流程最自然 |
| C 音频/播客 | Agent Skill（方法论类）| 人物 Skill（访谈类）| 对话提炼方法论 |
| D 网页文章 | 原子笔记（单篇）/ Wiki（聚合后）| 摘要卡片（资讯）| 碎片化，聚合后再提升 |
| E 代码仓库 | Agent Skill（使用模式）| 原子文档（API参考）| 代码知识=使用方法 |
| F 人物/专家 | Agent Skill（人物Skill）| Wiki 页面（传记）| 思维方式可执行化 |
| G 结构化数据 | Rules JSONL | 摘要卡片（带时效）| IF-THEN规则最适合自动化 |
| H 图像/图表 | 原子笔记 + Mermaid | Agent Skill（架构/设计）| 先文字化，再结构化 |
| I 实时内容 | 行动项→任务系统 / 方法论→Skill | 决策记录（ADR格式）| 双轨处理，不能混 |
| J 交互画布 | 扁平化表格 / API原子笔记 | 状态机Skill | 绕过视觉层抓取底层数据 |

---

### 2.4 输出形式选择决策树

```text
你的知识最终怎么用？
│
├── Agent 需要调用执行某类任务
│   └── 输出：SKILL.md（Anything2Skill / Resource2Skill）
│
├── Agent/人需要查询、问答、参考
│   ├── 跨文档综合理解
│   │   └── 输出：LLM-Wiki（Karpathy 模式，Markdown 页面体系）
│   └── 单文档精确检索
│       └── 输出：四层金字塔 JSONL（Atomic Insight + Concept + Abstract）
│
├── 需要 IF-THEN 决策规则（监控/自动化）
│   └── 输出：Rules JSONL（bdistill 模式）
│
├── 需要训练/微调下游模型
│   └── 输出：Fine-tune JSONL（alpaca/sharegpt 格式）
│
└── 需要人类阅读的结构化文档
    └── 输出：Markdown 文档（标准知识库文档）
```text

---

## 2.5 知识半衰期：被忽视的最重要维度

决策矩阵的九宫格告诉你**怎么处理**，但没有告诉你**该不该处理**。半衰期是这个问题的答案。

| 半衰期 | 典型内容 | 推荐策略 | 错误做法 |
|--------|----------|----------|----------|
| **< 48小时** | 竞品价格、库存、广告投放数据 | 只存指针（URL+时间戳），实时API查询 | 入向量库，Agent拿过期数据作答 |
| **1周 ~ 1个月** | 平台规则、竞品评论趋势、活动数据 | 缓存层（Redis/数据库），TTL自动失效 | 做成Skill，Skill比数据更难更新 |
| **1个月 ~ 1年** | 行业报告、竞品分析、SOP文档 | 完整入库，建更新提醒机制 | 不标注时间戳，让Agent永远相信它 |
| **> 1年** | 方法论、原理性知识、历史决策 | 深度蒸馏，L4 Skill，持久化 | 频繁重建，浪费资源 |

:::warning 时效性陷阱
一个知识库里混存了"半衰期1天"和"半衰期5年"的内容，而没有任何标注，Agent 无法判断哪条内容是新鲜的。这是最常见也最危险的知识库反模式之一。

**最低要求**：每条入库的知识单元都必须带 `created_at` + `valid_until` 字段，没有 `valid_until` 的内容默认 90 天后触发人工复审。
:::

---

## 2.6 混合输入的处理：矩阵缝隙里的真实世界

现实中最难处理的输入不是"纯 PDF"或"纯视频"，而是**跨类型混合内容**——Notion 页面里嵌着数据库、视频会议里有人在屏幕共享、设计稿里有大量批注文字。

### 混合输入的三种分解策略

**策略一：主体优先分解**

识别内容中信息密度最高的主体类型，按主体类型走对应 SOP，其余内容作为补充附件保存。

> 例：含截图的 Markdown 文档 → 按文本类（类型 A）SOP 处理，截图送 VLM Caption 后作为 `附图说明` 字段挂载

**策略二：并行流水线**

当混合内容的多个成分地位等同（如视频教程里的语音 + 代码演示），设计并行 pipeline，各自走最适合的 SOP，最后在入库时合并为同一知识条目的不同字段。

> 例：讲解视频 → 音频轨走 SenseVoice 转写（类型 C），画面轨走 VLM 提取代码与架构图（类型 H），合并为 `transcript` + `visual_notes` 双字段

**策略三：Triage 分诊**

当输入复杂到无法预分类时，先用 LLM 做**内容类型识别**，输出一份分解计划，再按计划路由到对应 SOP。

```python
TRIAGE_PROMPT = """
分析以下内容，识别其中包含的信息类型，并给出处理建议。

内容摘要：{content_preview}

请输出 JSON：
{
  "primary_type": "A/B/C/D/E/F/G/H/I/J",
  "secondary_types": ["..."],
  "recommended_pipeline": "...",
  "half_life_days": 数字,
  "skip_reason": "如果不值得入库，说明原因，否则为null"
}
"""
```

:::tip 混合输入的最小可行方案
遇到不确定的混合输入时，先回答这一个问题：**三个月后，会有人因为找不到这条信息而受损失吗？** 如果答案是否定的，直接归档原文，不要花时间拆解。
:::

---

:::tip → 下一章
选型明确后，按具体输入场景查找可运行的SOP → [03-scene-sops](03-scene-sops.md)
:::
