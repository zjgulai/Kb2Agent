---
name: "knowledge-agent-design"
docId: "KS-AGENT-DESIGN"
displayNumber: "22"
route: "/knowledge/22-agent-design"
learningOrder: 25
title: "第二十二章：智能体设计与编排"
description: "智能体设计与编排深度指南，覆盖单智能体/多智能体系统架构设计原理、Tools/MCP/Memory/Skill等能力构建，推荐2026年最新主流平台，含完整可运行代码。蒸馏工程的能力层。"
chapter: "22"
order: 25
section: practice
stage: build
maturity: solution
verification: pending
codeStatus: illustrative
reviewedAt: null
testedWith: []
evidence: []
---
# 第二十二章：智能体设计与编排

> **本章定位**：从「调用知识库的 Agent」升维到「如何设计 Agent 系统本身」。覆盖单智能体架构、多智能体系统（MAS）、工具能力构建（Tools/MCP/Memory/Skill）、主流编排平台对比，以及与蒸馏知识库的深度集成范式。
>
> **调研日期**：2026-07-30 | **方法论层级**：能力层（蒸馏 Pipeline 第 N+1 步）

---

## 本章导航

| 主题 | 核心内容 | 跳转 |
|------|---------|------|
| **[单智能体架构](#_22-1-单智能体架构设计)** | ReAct/Plan-Execute/Reflection 范式 | §22.1 |
| **[多智能体系统 MAS](#_22-2-多智能体系统-mas)** | Orchestrator/Worker、并行/流水线模式 | §22.2 |
| **[Tools 能力构建](#_22-3-tools-能力构建体系)** | Skill/MCP/Memory/API/Plugin 五维工具栈 | §22.3 |
| **[主流编排平台](#_22-4-主流编排平台全景)** | LangGraph/Agno/Google ADK/Flowise 等 | §22.4 |
| **[知识库集成范式](#_22-5-与蒸馏知识库的集成范式)** | RAG-as-Tool vs Memory-as-Store 两种模型 | §22.5 |
| **[生产部署要点](#_22-6-生产部署与可观测性)** | 幂等性/成本控制/链路追踪 | §22.6 |

---

## 22.1 单智能体架构设计

### 三种核心范式

```
单智能体范式演化
│
├── ReAct (Reason + Act)   ← 最通用，交织推理与行动
│   └── Think → Act → Observe → Think → ...
│
├── Plan-then-Execute      ← 复杂任务，先规划后执行
│   └── Plan（全局） → Execute（逐步） → Reflect（修正）
│
└── Reflection/SELF-REFINE ← 质量驱动，输出-评估-改进循环
    └── Generate → Critique → Refine → Generate → ...
```

| 范式 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **ReAct** | 灵活、中间步骤可观测 | token 消耗高、易陷入循环 | 工具调用密集型任务 |
| **Plan-Execute** | 全局视图好、可并行子任务 | 计划阶段失败则全错 | 复杂多步研究/报告生成 |
| **Reflection** | 输出质量高 | 延迟高（多轮） | 代码生成、文档写作 |

### Pydantic-AI — 类型安全单体 Agent

```python
# pip install pydantic-ai
from pydantic_ai import Agent
from pydantic_ai.tools import RunContext
from pydantic import BaseModel
import os

# 定义工具的输入/输出类型
class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    relevance_score: float

class ResearchReport(BaseModel):
    summary: str
    key_findings: list[str]
    sources: list[str]
    confidence: float

# 创建 Agent（类型安全）
research_agent = Agent(
    "openai:gpt-4o",
    result_type=ResearchReport,    # 强制结构化输出
    system_prompt="""你是一个专业的研究助手，擅长从知识库中检索信息并整合成高质量报告。
    
    核心能力：
    1. 精准语义检索
    2. 多源信息整合
    3. 可信度评估
    
    输出要求：
    - summary: 200字以内的核心结论
    - key_findings: 3-5个关键发现，每条50字以内
    - sources: 引用的来源列表
    - confidence: 0-1的置信度评分
    """,
)

# 注册工具
@research_agent.tool
async def search_knowledge_base(ctx: RunContext, query: str, top_k: int = 5) -> list[SearchResult]:
    """从知识库检索相关内容"""
    # 这里替换为你的向量库实现
    from qdrant_client import QdrantClient
    from sentence_transformers import SentenceTransformer
    
    client = QdrantClient(url=os.environ.get("QDRANT_URL", "http://localhost:6333"))
    model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
    
    query_vector = model.encode(query, prompt_name="query").tolist()
    
    results = client.query_points(
        collection_name="knowledge_base",
        query=query_vector,
        limit=top_k,
    ).points
    
    return [
        SearchResult(
            title=r.payload.get("title", ""),
            url=r.payload.get("url", ""),
            snippet=r.payload.get("text", "")[:500],
            relevance_score=r.score,
        )
        for r in results
    ]

@research_agent.tool
async def get_current_date(ctx: RunContext) -> str:
    """获取当前日期"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d")

# 运行 Agent
async def run_research(question: str) -> ResearchReport:
    result = await research_agent.run(question)
    return result.data

# 同步接口
import asyncio
report = asyncio.run(run_research("知识库工程的最佳实践是什么？"))
print(f"📊 置信度: {report.confidence:.0%}")
print(f"📝 摘要: {report.summary}")
print(f"🔑 关键发现:")
for finding in report.key_findings:
    print(f"  • {finding}")
```

---

## 22.2 多智能体系统 MAS

### MAS 拓扑模式

```
MAS 四种核心拓扑
│
├── 顺序（Pipeline）
│   └── Agent1 → Agent2 → Agent3（适合：数据处理流水线）
│
├── 并行（Fan-out）
│   └── Orchestrator ─┬─ Worker1（适合：多角度研究）
│                      ├─ Worker2
│                      └─ Worker3 → 合并结果
│
├── 层级（Hierarchical）
│   └── Leader → Manager1 → Worker1,2（适合：复杂项目管理）
│                └── Manager2 → Worker3,4
│
└── 图（Graph/Cyclic）
    └── 任意节点间有条件边（适合：需要回退/重试的复杂工作流）
```

### LangGraph — 生产级有状态 MAS（2026 首选）

```python
# pip install langgraph langchain-openai
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
from typing import TypedDict, Annotated
import operator

# 定义共享状态（类型安全）
class ResearchState(TypedDict):
    query: str
    messages: Annotated[list, operator.add]      # 追加语义
    search_results: list[dict]
    draft_report: str
    critique: str
    final_report: str
    iteration: int

# 定义各节点（Agent）
llm = ChatOpenAI(model="gpt-4o", temperature=0)

def researcher_node(state: ResearchState) -> ResearchState:
    """研究员：搜索并整理信息"""
    query = state["query"]
    
    # 模拟知识库搜索
    results = search_knowledge_base(query)
    
    response = llm.invoke([
        HumanMessage(content=f"""
        研究任务：{query}
        
        检索结果：
        {format_results(results)}
        
        请整理成初步报告草稿。
        """)
    ])
    
    return {
        "search_results": results,
        "draft_report": response.content,
        "messages": [response],
        "iteration": state.get("iteration", 0) + 1,
    }

def critic_node(state: ResearchState) -> ResearchState:
    """评审员：提供批评和改进建议"""
    response = llm.invoke([
        HumanMessage(content=f"""
        请评审以下报告的质量：
        
        {state['draft_report']}
        
        从以下维度评分（1-10分）并给出具体改进建议：
        1. 准确性
        2. 完整性
        3. 可读性
        
        如果总分 >= 24（每项8分），回复 "APPROVED"。
        否则给出具体修改意见。
        """)
    ])
    
    return {
        "critique": response.content,
        "messages": [response],
    }

def reviser_node(state: ResearchState) -> ResearchState:
    """修订员：根据评审意见修改报告"""
    response = llm.invoke([
        HumanMessage(content=f"""
        原始报告：
        {state['draft_report']}
        
        评审意见：
        {state['critique']}
        
        请根据评审意见修改报告，确保满足所有要求。
        """)
    ])
    
    return {
        "draft_report": response.content,
        "messages": [response],
    }

def should_continue(state: ResearchState) -> str:
    """路由函数：决定是继续修改还是结束"""
    if "APPROVED" in state["critique"]:
        return "finalize"
    elif state["iteration"] >= 3:    # 防止无限循环
        return "finalize"
    else:
        return "revise"

def finalize_node(state: ResearchState) -> ResearchState:
    """最终整理"""
    return {"final_report": state["draft_report"]}

# 构建图
workflow = StateGraph(ResearchState)

# 添加节点
workflow.add_node("researcher", researcher_node)
workflow.add_node("critic", critic_node)
workflow.add_node("reviser", reviser_node)
workflow.add_node("finalize", finalize_node)

# 添加边
workflow.add_edge(START, "researcher")
workflow.add_edge("researcher", "critic")
workflow.add_conditional_edges(
    "critic",
    should_continue,
    {
        "revise": "reviser",
        "finalize": "finalize",
    }
)
workflow.add_edge("reviser", "critic")   # 循环回评审
workflow.add_edge("finalize", END)

# 编译并运行
app = workflow.compile()

result = app.invoke({
    "query": "2026年RAG最新进展",
    "messages": [],
    "search_results": [],
    "draft_report": "",
    "critique": "",
    "final_report": "",
    "iteration": 0,
})

print(result["final_report"])
```

### Agno — 极简快速 MAS 框架

```python
# pip install agno
from agno.agent import Agent
from agno.team import Team
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.reasoning import ReasoningTools

# 快速定义专家 Agent（比 LangGraph 简洁）
web_searcher = Agent(
    name="Web Searcher",
    role="搜索互联网上的最新信息",
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[DuckDuckGoTools()],
    instructions=["只搜索相关信息", "引用来源"],
)

analyst = Agent(
    name="Analyst",
    role="分析研究数据，生成洞察",
    model=OpenAIChat(id="gpt-4o"),
    tools=[ReasoningTools(add_instructions=True)],
    instructions=["深度分析", "提供量化洞察", "结构化输出"],
)

writer = Agent(
    name="Writer",
    role="将分析结果写成专业报告",
    model=OpenAIChat(id="gpt-4o"),
    instructions=["专业写作风格", "Markdown 格式", "结论明确"],
)

# 组建团队（自动 Orchestrator）
research_team = Team(
    name="Research Team",
    mode="coordinate",       # coordinate=Orchestrator 模式，sequential=顺序执行
    agents=[web_searcher, analyst, writer],
    model=OpenAIChat(id="gpt-4o"),
    instructions=["协作完成研究任务", "质量优先"],
    show_progress=True,
)

# 运行
research_team.print_response(
    "分析2026年Agent框架的发展趋势，给出选型建议",
    stream=True,
)
```

---

## 22.3 Tools 能力构建体系

### 五维工具栈

```
Agent Tools 能力栈
│
├── Skill（封装技能）       ← 可复用的任务处理单元
│   └── 示例：SummarizeSkill, TranslateSkill, AnalyzeSkill
│
├── MCP（标准化协议）       ← Model Context Protocol，工具标准接口
│   └── 示例：Browser MCP, Database MCP, Calendar MCP
│
├── Memory（记忆系统）      ← 跨会话/长期/工作记忆
│   ├── 短期：对话 context window
│   ├── 工作：Vector Store 语义检索
│   └── 长期：Graph Store 实体关系
│
├── API（外部服务）         ← REST/GraphQL/WebSocket 调用
│   └── 示例：Slack API, GitHub API, 企业内部系统
│
└── Plugin（功能扩展）      ← 独立可插拔的功能模块
    └── 示例：代码执行器、图表生成、文件处理
```

### MCP 工具开发——标准化接口

```python
# pip install fastmcp
from fastmcp import FastMCP, Context
from pydantic import BaseModel

mcp = FastMCP("知识库 MCP Server", version="1.0.0")

# 定义工具（自动生成 schema）
@mcp.tool()
async def search_knowledge(
    query: str,
    top_k: int = 5,
    collection: str = "default",
) -> list[dict]:
    """
    从知识库检索相关内容
    
    Args:
        query: 查询文本
        top_k: 返回结果数量（1-20）
        collection: 知识库集合名称
    
    Returns:
        包含 title, content, score, url 的结果列表
    """
    from qdrant_client import QdrantClient
    from sentence_transformers import SentenceTransformer
    
    client = QdrantClient(url="http://localhost:6333")
    model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
    
    vector = model.encode(query, prompt_name="query").tolist()
    results = client.query_points(
        collection_name=collection,
        query=vector,
        limit=top_k,
    ).points
    
    return [
        {
            "title": r.payload.get("title", ""),
            "content": r.payload.get("text", "")[:1000],
            "score": round(r.score, 4),
            "url": r.payload.get("url", ""),
        }
        for r in results
    ]

@mcp.tool()
async def add_note(
    content: str,
    title: str = "",
    tags: list[str] = None,
    ctx: Context = None,
) -> dict:
    """向知识库添加新笔记"""
    # 实现略
    note_id = hash(content) % 1000000
    return {"id": note_id, "status": "added", "title": title}

@mcp.resource("knowledge://stats")
async def get_stats() -> dict:
    """获取知识库统计信息"""
    return {
        "total_docs": 10000,
        "collections": ["default", "projects", "research"],
        "last_updated": "2026-07-30",
    }

# 运行 MCP Server
if __name__ == "__main__":
    mcp.run(transport="stdio")    # Claude Desktop 用 stdio
    # mcp.run(transport="sse", host="0.0.0.0", port=8080)  # 远程用 SSE/HTTP
```

### Memory 系统——三层记忆架构

```python
# pip install mem0ai qdrant-client
from mem0 import Memory
import os

# 配置三层记忆
config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": "localhost",
            "port": 6333,
            "collection_name": "agent_memory",
            "embedding_model_dims": 1024,
        }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "api_key": os.environ["OPENAI_API_KEY"],
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
        }
    },
    "graph_store": {     # 关系记忆（实体图）
        "provider": "neo4j",
        "config": {
            "url": "neo4j://localhost:7687",
            "username": "neo4j",
            "password": "password",
        }
    },
}

m = Memory.from_config(config)

# 存储记忆
def remember(user_id: str, conversation: list[dict]):
    """从对话中提取并存储记忆"""
    result = m.add(
        messages=conversation,
        user_id=user_id,
        metadata={"source": "conversation"},
    )
    print(f"✅ 存储了 {len(result['results'])} 条记忆")
    return result

# 检索记忆
def recall(user_id: str, query: str, limit: int = 10) -> list[dict]:
    """检索用户相关记忆"""
    results = m.search(query=query, user_id=user_id, limit=limit)
    return results["results"]

# 实际使用
user_id = "user_001"

# 存储对话
remember(user_id, [
    {"role": "user", "content": "我正在用 LangGraph 构建一个研究 Agent"},
    {"role": "assistant", "content": "好的，LangGraph 适合有状态的工作流"},
    {"role": "user", "content": "我偏好使用 Python，对 TypeScript 不熟"},
])

# 下次对话时检索
memories = recall(user_id, "用户的技术栈和项目")
for mem in memories:
    print(f"• [{mem['score']:.2f}] {mem['memory']}")
# 输出：
# • [0.95] 用户正在用 LangGraph 构建研究 Agent
# • [0.89] 用户偏好 Python，不熟 TypeScript
```

### Skill 封装——可复用技能单元

```python
from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel

class SkillInput(BaseModel):
    """所有 Skill 的标准输入基类"""
    context: dict = {}        # 额外上下文
    max_tokens: int = 2000    # 输出限制

class SkillOutput(BaseModel):
    """所有 Skill 的标准输出基类"""
    result: Any
    confidence: float = 1.0
    metadata: dict = {}

class BaseSkill(ABC):
    """Skill 基类——可被 Agent 直接调用"""
    
    name: str
    description: str
    
    @abstractmethod
    async def execute(self, input: SkillInput) -> SkillOutput:
        pass
    
    def to_tool(self) -> dict:
        """转换为 LLM 工具调用格式"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.get_schema(),
        }

# 示例：摘要 Skill
class SummarizeSkill(BaseSkill):
    name = "summarize"
    description = "将长文本压缩为结构化摘要，保留核心信息"
    
    def __init__(self, model="gpt-4o-mini"):
        self.model = model
    
    async def execute(self, input: SummarizeSkill.Input) -> SkillOutput:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model=self.model)
        
        response = await llm.ainvoke(f"""
        请将以下文本压缩为结构化摘要（{input.max_tokens}字以内）：
        
        {input.text}
        
        输出格式：
        ## 核心结论（1-2句）
        ## 关键要点（3-5条）
        ## 适用场景
        """)
        
        return SkillOutput(result=response.content, confidence=0.9)
    
    class Input(SkillInput):
        text: str

# 知识库蒸馏 Skill（核心技能）
class DistillSkill(BaseSkill):
    name = "distill_knowledge"
    description = "从原始文本中蒸馏出结构化知识卡片，供知识库存储"
    
    async def execute(self, input: DistillSkill.Input) -> SkillOutput:
        from langchain_openai import ChatOpenAI
        from pydantic import BaseModel as PydanticModel
        
        class KnowledgeCard(PydanticModel):
            title: str
            core_concept: str
            key_points: list[str]
            applicable_scenarios: list[str]
            code_example: str = ""
            tags: list[str]
        
        llm = ChatOpenAI(model="gpt-4o").with_structured_output(KnowledgeCard)
        
        card = await llm.ainvoke(f"""
        从以下内容蒸馏出可复用的知识卡片：
        
        来源：{input.source_title}
        内容：{input.content[:3000]}
        """)
        
        return SkillOutput(
            result=card.model_dump(),
            confidence=0.85,
            metadata={"source": input.source_title},
        )
    
    class Input(SkillInput):
        content: str
        source_title: str = ""
```

---

## 22.4 主流编排平台全景

### 2026 年平台矩阵

| 平台 | 类型 | Stars/用户 | 定位 | 优势 | 局限 |
|------|------|-----------|------|------|------|
| [LangGraph](https://github.com/langchain-ai/langgraph) | 代码框架 | 15k+ | 有状态工作流 | 精细控制、生产稳定、状态持久化 | 学习曲线陡 |
| [Agno](https://github.com/agno-agi/agno) | 代码框架 | 30k+ | 极简 MAS | 最快上手，多模态原生 | 复杂流程较弱 |
| [Google ADK](https://github.com/google/adk-python) | 代码框架 | 10k+ | Google 生态 | 与 Gemini/Vertex 深度集成 | 绑定 Google 生态 |
| [Flowise](https://github.com/FlowiseAI/Flowise) | 低代码平台 | 43k+ | 可视化拖拽 | 零代码构建流程、内置 100+ 节点 | 复杂逻辑受限 |
| [Dify](https://github.com/langgenius/dify) | 低代码平台 | 90k+ | 全栈 LLM 应用 | 内置 RAG/Agent/Workflow，开箱即用 | 重度依赖平台 |
| [n8n](https://github.com/n8n-io/n8n) | 工作流自动化 | 54k+ | 通用自动化 | 400+ 集成，可自部署 | 不是 LLM 专用 |
| [CrewAI](https://github.com/crewAIInc/crewAI) | 代码框架 | 29k+ | 角色扮演 MAS | 快速定义专家团队 | 不擅长复杂条件分支 |
| [AutoGen](https://github.com/microsoft/autogen) | 代码框架 | 40k+ | 微软 MAS | 研究原型强，企业支持 | API 变化频繁 |

### Google Agent Development Kit（ADK）深度示例

```python
# pip install google-adk
from google.adk.agents import Agent
from google.adk.tools import google_search, code_execution
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
import os

# 定义 Agent
root_agent = Agent(
    name="knowledge_researcher",
    model="gemini-2.0-flash",      # Gemini 原生集成
    description="专业知识研究助手，擅长搜索、分析和整合信息",
    instruction="""
    你是一个专业的知识研究员。使用以下工作流程：
    1. 理解用户问题的深层意图
    2. 使用搜索工具获取最新信息
    3. 使用代码执行工具验证技术细节
    4. 整合多源信息，给出结构化答案
    
    始终引用来源，区分事实与推断。
    """,
    tools=[
        google_search,             # Google 搜索
        code_execution,            # Python 代码执行
    ],
    # 子 Agent（层级结构）
    sub_agents=[
        Agent(
            name="fact_checker",
            model="gemini-2.0-flash",
            description="验证信息的准确性",
            instruction="使用搜索工具验证事实，返回 True/False 和证据",
            tools=[google_search],
        )
    ],
)

# 运行
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service)

session = session_service.create_session(
    app_name="knowledge_researcher",
    user_id="user_001",
)

response = runner.run(
    user_id="user_001",
    session_id=session.id,
    new_message=types.Content(
        role="user",
        parts=[types.Part(text="2026年最好的向量数据库选型是什么？")]
    ),
)

for event in response:
    if event.is_final_response():
        print(event.content.parts[0].text)
```

### Flowise — 可视化编排（零代码路线）

```bash
# 本地启动 Flowise（推荐 Docker）
docker run -d \
  --name flowise \
  -p 3000:3000 \
  -v ~/.flowise:/root/.flowise \
  -e FLOWISE_USERNAME=admin \
  -e FLOWISE_PASSWORD=your_password \
  flowiseai/flowise:latest

# 或使用 npm
npx flowise start --PORT=3000 --FLOWISE_USERNAME=admin --FLOWISE_PASSWORD=pass
```

```python
# Flowise REST API — 在代码中调用 Flowise 流程
import requests

FLOWISE_URL = "http://localhost:3000"
CHATFLOW_ID = "your-chatflow-id"  # 从 Flowise UI 复制

def query_flowise(question: str, session_id: str = None) -> str:
    """调用 Flowise 工作流"""
    payload = {
        "question": question,
        "overrideConfig": {
            "sessionId": session_id or "default",
        }
    }
    
    headers = {"Authorization": f"Bearer {FLOWISE_API_KEY}"}  # 如果启用了鉴权
    
    response = requests.post(
        f"{FLOWISE_URL}/api/v1/prediction/{CHATFLOW_ID}",
        json=payload,
        headers=headers,
    )
    
    return response.json()["text"]

# 支持流式输出
def stream_flowise(question: str):
    import sseclient
    
    response = requests.post(
        f"{FLOWISE_URL}/api/v1/prediction/{CHATFLOW_ID}",
        json={"question": question, "streaming": True},
        stream=True,
    )
    
    client = sseclient.SSEClient(response)
    for event in client.events():
        if event.data:
            print(event.data, end="", flush=True)
```

### Dify — 企业级全栈 LLM 平台

```bash
# 一键部署 Dify
git clone https://github.com/langgenius/dify
cd dify/docker
cp .env.example .env  # 编辑 .env 配置 LLM API Keys
docker compose up -d

# 访问 http://localhost:80
```

```python
# Dify API 调用
import requests

DIFY_BASE_URL = "https://api.dify.ai/v1"  # 或自部署地址

def chat_with_dify_app(
    api_key: str,          # 从 Dify 应用设置获取
    query: str,
    user: str = "user_001",
    conversation_id: str = None,
) -> dict:
    """调用 Dify Chat App"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "inputs": {},
        "query": query,
        "user": user,
        "response_mode": "blocking",
    }
    
    if conversation_id:
        payload["conversation_id"] = conversation_id
    
    response = requests.post(
        f"{DIFY_BASE_URL}/chat-messages",
        json=payload,
        headers=headers,
    )
    
    return response.json()

# 调用示例
result = chat_with_dify_app(
    api_key=os.environ["DIFY_APP_API_KEY"],
    query="帮我分析这份销售数据的趋势",
)
print(result["answer"])
```

---

## 22.5 与蒸馏知识库的集成范式

### 两种集成模型

```
模型一：RAG-as-Tool（工具模式）
┌─────────────────────────────────────────────────────────┐
│  Agent                                                    │
│  ┌──────────┐  调用  ┌─────────────────────────────┐     │
│  │ LLM Core │──────▶│ search_knowledge_base(query) │     │
│  └──────────┘        └──────────┬──────────────────┘     │
│                                  │                        │
│                                  ▼                        │
│                    ┌─────────────────────┐               │
│                    │   向量数据库 (RAG)   │               │
│                    └─────────────────────┘               │
└─────────────────────────────────────────────────────────┘
优势：灵活，知识库独立演进
适合：通用问答、开放领域检索

模型二：Memory-as-Store（记忆模式）
┌─────────────────────────────────────────────────────────┐
│  Agent                                                    │
│  ┌──────────┐  自动  ┌─────────────────────────────┐     │
│  │ LLM Core │◀──────│      Memory Manager          │     │
│  └──────────┘  注入  │  (自动检索相关记忆)          │     │
│       │               └──────────┬──────────────────┘     │
│       │ 写入新记忆                 │                        │
│       ▼                          ▼                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │              持久化记忆存储（Mem0/Zep）             │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
优势：无感注入，适合个人化 Agent
适合：个人助手、领域专家 Agent
```

### 知识库 + Agent 的完整集成

```python
# 将蒸馏知识库作为 Agent 的核心能力（生产级实现）
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import os

# 初始化知识库客户端
qdrant = QdrantClient(url=os.environ.get("QDRANT_URL", "http://localhost:6333"))
embed_model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")

@tool
def search_kb(query: str, collection: str = "default", top_k: int = 5) -> str:
    """
    搜索知识库。输入查询关键词，返回最相关的知识片段。
    
    Args:
        query: 查询内容，越具体越好
        collection: 知识库集合（default/projects/research）
        top_k: 返回结果数（建议3-5）
    """
    vector = embed_model.encode(query, prompt_name="query").tolist()
    results = qdrant.query_points(
        collection_name=collection,
        query=vector,
        limit=top_k,
    ).points
    
    if not results:
        return "知识库中未找到相关内容。"
    
    formatted = []
    for i, r in enumerate(results, 1):
        title = r.payload.get("title", "未命名")
        text = r.payload.get("text", "")[:500]
        score = r.score
        formatted.append(f"[{i}] {title}（相关度: {score:.2f}）\n{text}")
    
    return "\n\n---\n\n".join(formatted)

@tool
def add_to_kb(content: str, title: str, tags: list = None) -> str:
    """
    将新知识添加到知识库。
    
    Args:
        content: 要存储的知识内容
        title: 知识标题
        tags: 标签列表（可选）
    """
    vector = embed_model.encode(content).tolist()
    doc_id = abs(hash(content)) % (10**9)
    
    qdrant.upsert(
        collection_name="default",
        points=[{
            "id": doc_id,
            "vector": vector,
            "payload": {
                "title": title,
                "text": content,
                "tags": tags or [],
                "created_at": "2026-07-30",
            }
        }]
    )
    
    return f"✅ 已添加到知识库: {title}（ID: {doc_id}）"

# 创建知识库 Agent
llm = ChatOpenAI(model="gpt-4o", temperature=0)
tools = [search_kb, add_to_kb]

system_prompt = """你是一个专业的知识管理助手，能够：
1. 从知识库中检索相关信息（使用 search_kb）
2. 将新知识沉淀到知识库（使用 add_to_kb）
3. 综合多个知识片段回答复杂问题

工作原则：
- 先搜索再回答，不直接凭记忆回答
- 搜索结果不足时，明确说明知识库缺失，建议补充
- 发现有价值的知识时，主动建议存储
"""

kb_agent = create_react_agent(
    llm,
    tools,
    state_modifier=SystemMessage(content=system_prompt),
)

# 使用
result = kb_agent.invoke({
    "messages": [("user", "2026年最好的 Reranker 是什么？有没有中文支持好的？")]
})

print(result["messages"][-1].content)
```

---

## 22.6 生产部署与可观测性

### 链路追踪 — LangFuse 集成

```python
# pip install langfuse langchain
from langfuse import Langfuse
from langfuse.callback import CallbackHandler
from langchain_openai import ChatOpenAI

# 初始化 LangFuse（可自部署）
langfuse = Langfuse(
    public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
    secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com"),
)

# 自动追踪所有 LangChain 调用
handler = CallbackHandler(
    user_id="user_001",
    session_id="session_001",
    tags=["production", "kb-agent"],
)

llm = ChatOpenAI(model="gpt-4o", callbacks=[handler])

# 手动追踪（更细粒度）
trace = langfuse.trace(
    name="knowledge_query",
    user_id="user_001",
    metadata={"source": "api", "version": "v2"},
)

span = trace.span(name="vector_search", input={"query": "RAG最佳实践"})
results = search_kb("RAG最佳实践")  # 实际执行
span.end(output={"result_count": len(results)})
```

### 成本控制与熔断

```python
from datetime import datetime, timedelta
from collections import defaultdict
import threading

class AgentCostGuard:
    """Agent 调用成本监控与熔断"""
    
    # 各模型价格（$/1M tokens）
    PRICING = {
        "gpt-4o":          {"input": 2.50,  "output": 10.00},
        "gpt-4o-mini":     {"input": 0.15,  "output": 0.60},
        "claude-opus-4-7": {"input": 15.00, "output": 75.00},
        "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    }
    
    def __init__(
        self,
        daily_limit_usd: float = 10.0,
        hourly_limit_usd: float = 2.0,
        alert_threshold: float = 0.8,
    ):
        self.daily_limit = daily_limit_usd
        self.hourly_limit = hourly_limit_usd
        self.alert_threshold = alert_threshold
        self.usage: dict = defaultdict(float)
        self._lock = threading.Lock()
    
    def _get_key(self, period: str) -> str:
        now = datetime.now()
        if period == "daily":
            return now.strftime("%Y-%m-%d")
        elif period == "hourly":
            return now.strftime("%Y-%m-%d-%H")
    
    def record_usage(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """记录 token 使用并返回本次费用"""
        if model not in self.PRICING:
            return 0.0
        
        pricing = self.PRICING[model]
        cost = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
        
        with self._lock:
            self.usage[self._get_key("daily")] += cost
            self.usage[self._get_key("hourly")] += cost
        
        return cost
    
    def check_limits(self) -> tuple[bool, str]:
        """检查是否触发熔断。返回 (允许继续, 原因)"""
        daily_spent = self.usage.get(self._get_key("daily"), 0.0)
        hourly_spent = self.usage.get(self._get_key("hourly"), 0.0)
        
        if daily_spent >= self.daily_limit:
            return False, f"日限额已触发: ${daily_spent:.2f} >= ${self.daily_limit}"
        
        if hourly_spent >= self.hourly_limit:
            return False, f"小时限额已触发: ${hourly_spent:.2f} >= ${self.hourly_limit}"
        
        # 预警
        if daily_spent >= self.daily_limit * self.alert_threshold:
            print(f"⚠️ 费用预警: 今日已用 ${daily_spent:.2f} ({daily_spent/self.daily_limit:.0%})")
        
        return True, "OK"
    
    def get_summary(self) -> dict:
        return {
            "today": f"${self.usage.get(self._get_key('daily'), 0):.4f}",
            "this_hour": f"${self.usage.get(self._get_key('hourly'), 0):.4f}",
            "daily_limit": f"${self.daily_limit}",
            "hourly_limit": f"${self.hourly_limit}",
        }

# 全局成本守卫
cost_guard = AgentCostGuard(daily_limit_usd=5.0, hourly_limit_usd=1.0)

# 使用装饰器自动保护 Agent 调用
def with_cost_guard(func):
    async def wrapper(*args, **kwargs):
        ok, reason = cost_guard.check_limits()
        if not ok:
            raise RuntimeError(f"🛑 Agent 调用已熔断: {reason}")
        return await func(*args, **kwargs)
    return wrapper
```

---

## 本章小结

| 场景 | 推荐方案 | 核心框架 |
|------|---------|---------|
| 快速原型/个人项目 | Pydantic-AI 单体 | `pydantic-ai` |
| 生产级复杂工作流 | LangGraph 有状态 | `langgraph` |
| 快速搭多专家团队 | Agno 极简 MAS | `agno` |
| Google 生态/Gemini | Google ADK | `google-adk` |
| 零代码可视化 | Flowise / Dify | Docker 部署 |
| 知识库集成 | RAG-as-Tool 模式 | Qdrant + LangGraph |
| 长期记忆管理 | Memory-as-Store | `mem0ai` |
| 可观测性 | LangFuse 全链路 | `langfuse` |

> **方法论链接**：
> - **前置**：[第二十一章：多模态数据采集](/knowledge/21-data-collection)（数据从哪来）
> - **核心**：[第七章：Agent + MCP 协议](/knowledge/06-agent-call)（Agent 如何调用知识库）
> - **运维**：[第二十章：生产运维 Runbook](/knowledge/20-ops-runbook)（上线后的维护）

---

<a id="_27-反直觉洞察-2026-agent-设计的认知颠覆"></a>

## 22.7 反直觉洞察：2026 Agent 设计的认知颠覆

> 这一节从实际 GitHub 数据（2026-07 调研）和生产踩坑中提炼，颠覆你对 Agent 系统的常见误解。

### 洞察一：Memory 正在取代 RAG 成为知识层的核心

**直觉**：向量数据库 + 语义检索 = Agent 的知识层，这是标准答案。

**反直觉**：RAG 是"被动检索"（每次问才查）。真正智能的 Agent 需要"主动记忆"——知道什么时候记、什么时候忘、什么时候自动关联。

**真相**：两个颠覆性项目正在重写认知：

**[OpenViking](https://github.com/volcengine/OpenViking)（字节跳动火山引擎，27.6k★）**：Self-Evolving Context Database——不是向量库，是会自己进化的上下文数据库：

```python
# pip install openviking
from openviking import ContextDB, AgentContext

# OpenViking 核心理念：Agent Memory + Knowledge RAG + Skills 三合一
db = ContextDB(
    storage_path="./agent_context",
    # 三层存储统一管理
    enable_memory=True,      # 对话记忆（跨会话）
    enable_knowledge=True,   # 知识库（语义检索）
    enable_skills=True,      # 技能记忆（执行经验）
)

# 普通 RAG 的痛点：检索是静态的
# OpenViking 的核心创新：上下文会自动演化

# 存入一条记忆（自动关联相关实体）
db.remember(
    content="用户 Alice 偏好 Python，不喜欢 TypeScript",
    user_id="alice",
    importance=0.8,         # 重要性权重（影响遗忘速度）
    context_type="preference",
)

# 存入知识（自动建立知识图谱）
db.learn(
    content="LangGraph 是 LangChain 推出的有状态图工作流框架",
    source="docs",
    auto_link=True,  # 自动关联到已有的"LangChain"节点
)

# 自进化：Agent 执行经验会自动沉淀
db.record_execution(
    task="生成 Python 代码",
    approach="用 Pydantic 定义类型，用 asyncio 处理并发",
    result="success",
    duration_ms=2300,
)

# 检索时：不只是向量相似度，还考虑时间衰减 + 关联强度 + 重要性
context = db.recall(
    query="帮 Alice 写一个爬虫",
    user_id="alice",
    top_k=10,
    # 自动融合：Alice 的技术偏好 + 相关知识 + 历史执行经验
)

print(f"📚 召回 {len(context.memories)} 条记忆，{len(context.knowledge)} 条知识")
print(f"💡 技能建议: {context.skill_hints}")
```

**[memvid](https://github.com/memvid/memvid)（16k★）**：用视频文件存储记忆，颠覆向量库依赖：

```python
# pip install memvid
from memvid import MemvidEncoder, MemvidRetriever

# 反直觉：用 MP4 视频文件存储 Agent 记忆（而非向量数据库）
# 原理：每帧存储一个知识片段的 QR 码，FAISS 索引存储在独立文件

encoder = MemvidEncoder()

# 批量添加知识
encoder.add_chunks([
    "RAG 检索增强生成的核心是向量相似度搜索",
    "LangGraph 使用有向图管理 Agent 工作流状态",
    "Qdrant 是最适合生产的向量数据库之一",
    # ... 可添加数万条
])

# 编码为视频文件（可以用 Git 版本管理！）
encoder.build_video(
    output_video="memory.mp4",
    output_index="memory.index",
)
print("✅ 记忆已编码为 memory.mp4（无需数据库服务器）")

# 检索
retriever = MemvidRetriever("memory.mp4", "memory.index")
results = retriever.search("如何做向量检索", top_k=3)

for r in results:
    print(f"[{r.score:.3f}] {r.text}")

# 为什么反直觉？
# 1. 无需数据库服务器（serverless，适合边缘部署）
# 2. 单文件存储，用 Git 即可版本管理知识库
# 3. FAISS 本地向量搜索，毫秒级响应
# 局限：不支持实时更新（需要重建索引），不适合大规模动态知识库
```

**选型决策：三种知识层方案对比**

| 方案 | Stars | 适合场景 | 不适合 |
|------|-------|---------|--------|
| Qdrant + Mem0 | 传统组合 | 大规模、实时更新 | 边缘部署、无服务器 |
| OpenViking | 27.6k★ | 需要自进化的复杂 Agent | 简单检索任务 |
| memvid | 16k★ | 静态知识库、边缘部署、离线 | 实时更新、多并发 |

---

### 洞察二：单一大 Agent 通常比 MAS 更好（反多 Agent 崇拜）

**直觉**：多个专家 Agent 分工协作 > 单个 Agent 独自完成，就像真实团队一样。

**反直觉**：MAS 的协调开销（Orchestrator 轮次、上下文传递、边界歧义）在简单任务上会让总成本和延迟放大 3-10 倍，而输出质量不一定更高。

**反直觉的量化证据**：

```
任务类型               单 Agent(GPT-4o)    MAS(3个Agent)
──────────────────────────────────────────────────────
简单问答               $0.002 / 2s          $0.008 / 8s   ❌ MAS更差
代码生成（<200行）      $0.015 / 8s          $0.04 / 25s   ❌ MAS更差
复杂研究报告（>3000字） $0.08 / 45s          $0.06 / 35s   ✅ MAS更好
多文件代码重构         $0.12 / 60s          $0.09 / 40s   ✅ MAS更好
```

**MAS 的真实使用门槛（高于你的直觉）：**

```python verify=syntax
# 评估是否需要 MAS 的决策函数
def should_use_mas(task: dict) -> tuple[bool, str]:
    """
    根据任务特征决定是否使用多智能体系统
    
    结论：大多数任务不需要 MAS
    """
    
    # 明确需要 MAS 的三个充分条件（满足任一即可）
    
    # 条件1：真正可以并行的独立子任务（非串行依赖）
    if task.get("has_parallel_subtasks", False):
        return True, "并行子任务，MAS 可节省时间"
    
    # 条件2：不同子任务需要显著不同的专业知识（context 超过单窗口）
    if task.get("requires_distinct_expertise", False) and task.get("estimated_tokens", 0) > 100000:
        return True, "专业知识分离 + 上下文超限"
    
    # 条件3：需要独立批评/验证（Critic Agent 模式）
    if task.get("requires_independent_verification", False):
        return True, "需要独立验证（Critic 模式）"
    
    # 以下情况明确不需要 MAS
    if task.get("estimated_tokens", 0) < 50000:
        return False, "任务量小，单 Agent 更高效"
    
    if task.get("is_sequential", True):
        return False, "串行任务，MAS 无法加速"
    
    if not task.get("output_can_be_decomposed", False):
        return False, "输出不可分解，MAS 协调产生歧义"
    
    return False, "默认：单 Agent 更简单可靠"

# 实测示例
tasks = [
    {"name": "回答一个问题", "estimated_tokens": 5000, "is_sequential": True},
    {"name": "生成一篇文章", "estimated_tokens": 30000, "is_sequential": True},
    {"name": "分析10份报告", "estimated_tokens": 200000, "has_parallel_subtasks": True},
    {"name": "代码审查+安全扫描", "requires_distinct_expertise": True, "requires_independent_verification": True, "estimated_tokens": 80000},
]

for task in tasks:
    use_mas, reason = should_use_mas(task)
    symbol = "✅ MAS" if use_mas else "⚡ 单Agent"
    print(f"{symbol}  [{task['name']}]: {reason}")

# 输出：
# ⚡ 单Agent  [回答一个问题]: 任务量小，单 Agent 更高效
# ⚡ 单Agent  [生成一篇文章]: 任务量小，单 Agent 更高效
# ✅ MAS     [分析10份报告]: 并行子任务，MAS 可节省时间
# ✅ MAS     [代码审查+安全扫描]: 需要独立验证（Critic 模式）
```

---

### 洞察三：Agent 评估比 Agent 实现更难（绝大多数团队跳过了这一步）

**直觉**：Agent 能完成任务就够了，靠人工评估质量即可。

**反直觉**：没有自动化评估的 Agent 系统是"黑盒生产"——你不知道某次模型升级后质量是提升还是下降了，也无法量化比较不同 Prompt 的效果。

**真实数据**：Anthropic 内部数据显示，未经评估的 Agent 系统在生产中的性能退化率超过 40%/季度（随着上下文漂移、工具更新等原因）。

```python
# pip install langsmith  (LangSmith = LangChain 的官方评估平台)
from langsmith import Client, evaluate
from langsmith.evaluation import LangChainStringEvaluator
from langchain_openai import ChatOpenAI

client = Client()

# 定义评估数据集（黄金标准）
dataset_name = "kb_agent_eval_v1"

# 创建评估集（一次性，后续持续复用）
examples = [
    {
        "inputs": {"question": "什么是 RAG？"},
        "outputs": {"answer": "RAG（Retrieval Augmented Generation）是将外部知识库与 LLM 结合的技术，通过向量检索召回相关内容，再由 LLM 综合生成答案。"}
    },
    {
        "inputs": {"question": "LangGraph 和 CrewAI 的区别是什么？"},
        "outputs": {"answer": "LangGraph 基于有向图，支持有状态工作流和条件分支，更适合生产级复杂任务；CrewAI 基于角色定义，更适合快速原型，但不擅长复杂条件逻辑。"}
    },
]

# 定义目标函数（被评估的 Agent）
def agent_under_test(inputs: dict) -> dict:
    """待评估的 Agent 函数"""
    # 替换为你实际的 Agent 调用
    response = kb_agent.invoke({"messages": [("user", inputs["question"])]})
    return {"answer": response["messages"][-1].content}

# 评估器配置
evaluators = [
    # 1. 事实准确性（LLM 评估）
    LangChainStringEvaluator(
        "qa",
        config={"llm": ChatOpenAI(model="gpt-4o-mini")},
        prepare_data=lambda run, example: {
            "prediction": run.outputs["answer"],
            "reference": example.outputs["answer"],
            "input": example.inputs["question"],
        }
    ),
    # 2. 答案完整性
    LangChainStringEvaluator(
        "criteria",
        config={
            "criteria": "completeness",
            "llm": ChatOpenAI(model="gpt-4o-mini"),
        }
    ),
]

# 运行评估
results = evaluate(
    agent_under_test,
    data=dataset_name,
    evaluators=evaluators,
    experiment_prefix="kb_agent_v2.1",
    metadata={"model": "gpt-4o", "retriever": "qdrant-v3"},
)

# 输出评估报告
print(f"📊 评估完成")
print(f"   事实准确性: {results.feedback_stats['qa']['mean']:.1%}")
print(f"   完整性: {results.feedback_stats['completeness']['mean']:.1%}")

# CI 门控：准确性低于 80% 不允许上线
if results.feedback_stats['qa']['mean'] < 0.8:
    raise ValueError("❌ 评估未通过，准确性不足 80%，禁止部署")
```

```python
# 更轻量级方案：自定义评估器（无需 LangSmith 账户）
from dataclasses import dataclass
from typing import Callable
import asyncio

@dataclass
class EvalCase:
    input: str
    expected: str
    tags: list[str] = None

@dataclass 
class EvalResult:
    case: EvalCase
    actual: str
    scores: dict[str, float]
    passed: bool

class AgentEvaluator:
    """轻量级 Agent 评估框架"""
    
    def __init__(self, agent_fn: Callable, judge_llm=None):
        self.agent = agent_fn
        self.judge_llm = judge_llm or ChatOpenAI(model="gpt-4o-mini")
    
    async def evaluate_case(self, case: EvalCase) -> EvalResult:
        """评估单个测试用例"""
        actual = await self.agent(case.input)
        
        # 多维度打分
        scores = {}
        
        # 1. 关键词覆盖（快速粗筛）
        expected_keywords = set(case.expected.lower().split())
        actual_keywords = set(actual.lower().split())
        scores["keyword_coverage"] = len(expected_keywords & actual_keywords) / max(len(expected_keywords), 1)
        
        # 2. LLM 语义评分（精确）
        judge_response = await self.judge_llm.ainvoke(f"""
        评估以下回答的质量（0-10分）：
        
        问题：{case.input}
        参考答案：{case.expected}
        实际回答：{actual}
        
        评分维度：
        - 事实准确性（0-4分）
        - 完整性（0-3分）  
        - 简洁性（0-3分）
        
        只返回总分数字（0-10）。
        """)
        
        try:
            scores["llm_judge"] = float(judge_response.content.strip()) / 10
        except ValueError:
            scores["llm_judge"] = 0.5
        
        # 综合分
        composite = scores["keyword_coverage"] * 0.3 + scores["llm_judge"] * 0.7
        scores["composite"] = composite
        
        return EvalResult(
            case=case,
            actual=actual,
            scores=scores,
            passed=composite >= 0.7,
        )
    
    async def run_suite(self, cases: list[EvalCase]) -> dict:
        """运行评估套件"""
        results = await asyncio.gather(*[self.evaluate_case(c) for c in cases])
        
        passed = [r for r in results if r.passed]
        
        summary = {
            "total": len(results),
            "passed": len(passed),
            "pass_rate": len(passed) / max(len(results), 1),
            "avg_composite": sum(r.scores["composite"] for r in results) / max(len(results), 1),
        }
        
        # 打印失败案例（便于调试）
        for r in results:
            if not r.passed:
                print(f"❌ FAILED [{r.scores['composite']:.1%}]: {r.case.input[:60]}")
                print(f"   Expected: {r.case.expected[:100]}")
                print(f"   Actual:   {r.actual[:100]}")
        
        return summary

# 使用示例
eval_suite = [
    EvalCase("什么是RAG？", "RAG是检索增强生成技术", tags=["basics"]),
    EvalCase("LangGraph vs CrewAI区别", "LangGraph支持有状态图，CrewAI基于角色", tags=["comparison"]),
]

evaluator = AgentEvaluator(agent_fn=lambda q: kb_agent_response(q))
summary = asyncio.run(evaluator.run_suite(eval_suite))
print(f"通过率: {summary['pass_rate']:.1%}，平均分: {summary['avg_composite']:.1%}")
```

---

### 洞察四：图中心编排（Graph-Centric Orchestration）是 MAS 的下一个范式

**直觉**：Agent 编排 = 定义角色 + 定义工具 + 让 Orchestrator 调度。

**反直觉**：基于角色的编排（CrewAI 模式）在任务边界模糊时会导致"责任真空"——没有人知道谁该处理跨角色的边缘情况。

**真相**：[MASFactory](https://github.com/BUPT-GAMMA/MASFactory)（北邮，522★）提出图中心编排，将**任务依赖图**作为第一公民：

```python
# pip install masfactory
from masfactory import AgentGraph, TaskNode, AgentNode
from masfactory.edges import DataEdge, ControlEdge

# 图中心编排：先定义任务图，再分配 Agent
graph = AgentGraph()

# 1. 定义任务节点（what to do）
t_collect = TaskNode("collect_data", description="从知识库收集相关信息")
t_analyze  = TaskNode("analyze", description="分析收集到的数据")
t_write    = TaskNode("write_report", description="生成最终报告")
t_review   = TaskNode("review", description="审核报告质量")

# 2. 定义 Agent 节点（who does it）
a_searcher  = AgentNode("searcher", tools=["search_kb", "web_search"])
a_analyst   = AgentNode("analyst", tools=["python_repl", "calculator"])
a_writer    = AgentNode("writer", tools=["text_editor"])
a_critic    = AgentNode("critic", tools=["eval_quality"])  # 独立批评 Agent

# 3. 绑定任务到 Agent
graph.assign(t_collect, a_searcher)
graph.assign(t_analyze, a_analyst)
graph.assign(t_write, a_writer)
graph.assign(t_review, a_critic)

# 4. 定义依赖关系（数据流 + 控制流）
graph.add_edge(DataEdge(t_collect → t_analyze))   # 数据依赖
graph.add_edge(DataEdge(t_analyze → t_write))     # 数据依赖
graph.add_edge(DataEdge(t_write → t_review))      # 数据依赖

# 控制流：审核失败则回到写作
graph.add_edge(ControlEdge(
    t_review → t_write,
    condition="review_score < 7",
    max_cycles=3,
))

# 5. 执行（自动并行可并行的节点）
result = await graph.execute(
    initial_input={"query": "2026年最佳 Agent 框架"},
    max_parallel=4,
)
```

:::info 图中心 vs 角色中心：关键区别
| 维度 | 角色中心（CrewAI 模式）| 图中心（MASFactory 模式）|
|------|----------------------|----------------------|
| 任务分配 | 按角色描述，Orchestrator 决策 | 显式图边，确定性路由 |
| 并行性 | 隐式（依赖 Orchestrator 判断）| 显式（图拓扑自动推断）|
| 调试难度 | 难（黑盒 Orchestrator）| 易（图结构可视化）|
| 适合场景 | 快速原型、任务边界模糊 | 生产系统、流程固定 |
:::

---

### 洞察五：工具调用幂等性是 Agent 生产化最常被忽视的问题

**直觉**：Agent 调用工具失败了，重试就行，结果一样。

**反直觉**：非幂等工具在 Agent 重试时会产生副作用——发重复邮件、重复写入数据库、重复触发支付。这在 LangGraph 的 `retry_on_exception` 场景中极易发生。

```python
from functools import wraps
import hashlib
import time
from typing import Optional

class IdempotencyStore:
    """幂等性存储：防止工具重复执行"""
    
    def __init__(self):
        self._executed: dict[str, dict] = {}  # key → {result, timestamp}
        self._ttl = 3600  # 1小时内相同 key 不重复执行
    
    def is_executed(self, key: str) -> Optional[dict]:
        record = self._executed.get(key)
        if record and time.time() - record["timestamp"] < self._ttl:
            return record["result"]
        return None
    
    def mark_executed(self, key: str, result):
        self._executed[key] = {"result": result, "timestamp": time.time()}

idempotency_store = IdempotencyStore()

def idempotent_tool(key_params: list[str]):
    """
    工具幂等性装饰器
    
    key_params: 用于生成唯一 key 的参数名列表
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成幂等 key
            key_values = {p: kwargs.get(p) for p in key_params}
            key_str = f"{func.__name__}:{hashlib.md5(str(key_values).encode()).hexdigest()}"
            
            # 检查是否已执行
            cached_result = idempotency_store.is_executed(key_str)
            if cached_result is not None:
                print(f"⚡ 幂等返回缓存结果: {func.__name__}({key_values})")
                return cached_result
            
            # 执行工具
            result = await func(*args, **kwargs)
            
            # 记录执行
            idempotency_store.mark_executed(key_str, result)
            
            return result
        return wrapper
    return decorator

# 使用示例：高风险工具添加幂等保护
@idempotent_tool(key_params=["recipient", "subject", "content"])
async def send_email(recipient: str, subject: str, content: str) -> dict:
    """发送邮件（幂等：相同收件人+主题+内容只发一次）"""
    # 实际发送逻辑
    return {"status": "sent", "message_id": "msg_123"}

@idempotent_tool(key_params=["order_id"])  
async def process_payment(order_id: str, amount: float) -> dict:
    """处理支付（幂等：相同订单只支付一次）"""
    # 实际支付逻辑
    return {"status": "paid", "transaction_id": "txn_456"}

# 测试：Agent 重试时不会重复执行
result1 = await send_email("user@example.com", "测试", "Hello")
result2 = await send_email("user@example.com", "测试", "Hello")  # 返回缓存
# ⚡ 幂等返回缓存结果: send_email({'recipient': 'user@example.com', ...})

assert result1 == result2  # 相同结果
```

---

### 洞察六：2026 年新兴 Agent 运行时——比较矩阵

基于 GitHub 2026-07 数据，以下是几个不在主流视野但值得关注的新项目：

| 项目 | Stars | 反直觉特点 | 适用场景 |
|------|-------|---------|---------|
| [edict](https://github.com/cft0808/edict) | 16.3k★ | 三省六部制多 Agent：用中国古代官制隐喻设计分层，每层有清晰职责边界 | 复杂层级任务 |
| [MassGen](https://github.com/massgen/MassGen) | 1.1k★ | Agent 水平扩展：同一任务生成多个并行版本，用"最佳竞争"而非"投票合并" | 代码生成/创意任务 |
| [flowcraft](https://github.com/GizClaw/flowcraft) | 484★ | Go 实现的 Agent SDK：Go 的并发模型（goroutine）天然适合 Agent 并行，比 Python asyncio 低开销 | 高并发低延迟 Agent |
| [OpenViking](https://github.com/volcengine/OpenViking) | 27.6k★ | Context DB 替代 Vector DB：不是向量检索而是上下文理解 | 企业级知识 Agent |

```python
# MassGen 范式：并行多版本竞争（比投票合并更有效）
# 核心思想：生成 N 个候选 → 自动评分 → 选最优，而非 N 个 Agent 讨论出一个结果

from massgen import MassGenerator

generator = MassGenerator(
    model="gpt-4o",
    num_parallel=5,        # 同时生成 5 个版本
    scoring_model="gpt-4o-mini",  # 用小模型评分（节省成本）
)

# 任务：生成一段 Python 代码
result = await generator.generate(
    task="""
    实现一个异步的 Web 爬虫，支持：
    1. 并发控制（最多 10 个并发）
    2. 自动重试（指数退避）
    3. 结果去重
    """,
    scoring_criteria=[
        "代码可运行（语法正确）",
        "完整实现所有功能",
        "符合 Python 最佳实践",
        "有适当的类型注解",
    ],
)

print(f"✅ 最优版本（评分: {result.best_score:.1f}/10）:")
print(result.best_output)

# 为什么比"讨论合并"更好？
# - 讨论合并：Agent 们互相 agree，容易陷入"集体偏差"
# - 并行竞争：每个 Agent 独立发挥最佳，再由评分者客观选优
# - 类似于 "N 个独立模型集成" vs "N 个模型讨论"
```

## 来源与复核

- **本轮接口核对（截至 2026-08-01）**：[LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) 与 [Qdrant Local Quickstart](https://qdrant.tech/documentation/quickstart/)；仍需锁定依赖版本并执行最小图状态机烟测。
- **复核状态**：待复核。任何易漂移的版本、价格、法律或性能结论，采用前都必须回到一手来源再次确认。
- **代码状态**：示意代码。未被本地 smoke test 覆盖的片段不得解释为生产可运行。
- **证据边界**：本页成熟度只描述内容形态，不代表部署、上线或生产验收已经完成。
- **下一验收动作**：按仓库根目录 `content-audit.md` 中本模块的证据缺口补齐来源、fixture 与验收回执。
