import os
import re

knowledge_dir = "/Users/pray/project/distillation/docs/knowledge/"

# ==========================================
# 替换 1: 01-framework.md (两条路径)
# ==========================================
p1 = os.path.join(knowledge_dir, "01-framework.md")
with open(p1, 'r', encoding='utf-8') as f:
    c1 = f.read()

old_ascii_1 = """```
多模态原始内容
        │
        ▼
┌───────────────────────────────────────────┐
│              蒸馏结果（分层）               │
│                                           │
│  基础层：Wiki 文档（Markdown 页面体系）    │
│  ├── 完整性保障，供检索和人类阅读          │
│  ├── 四层金字塔（原子→概念→摘要→跨文档）  │
│  └── 使用 Karpathy LLM-Wiki 模式持续维护  │
│                                           │
│  上层：Agent Skill（SKILL.md）            │
│  ├── 高频执行知识的可执行封装              │
│  ├── Agent 直接加载调用，无需重新推理      │
│  └── 从 Wiki 文档二次蒸馏出来             │
└───────────────────────────────────────────┘
```"""

new_mermaid_1 = """```mermaid
flowchart TD
    Raw[多模态原始内容] --> Layered
    
    subgraph Layered [蒸馏结果分层架构]
        direction TB
        Base[基础层: Wiki 文档库<br/>完整性保障 / 供人阅读检索]
        Skill[上层: Agent Skill库<br/>高频可执行封装 / Agent直接调用]
        Base -->|二次蒸馏| Skill
    end
    
    classDef plain fill:#fff,stroke:#334155,stroke-width:1px,color:#111;
    class Raw,Base,Skill plain;
```"""
c1 = c1.replace(old_ascii_1, new_mermaid_1)

# 四层金字塔也顺便转成 mermaid
old_pyramid = """```
Level 4: Cross-Document Recollections（跨文档元知识）
         ↑ 多文档涌现的模式、对比、矛盾标注
Level 3: Document Abstracts（文档摘要）
         ↑ 单文档的目的、范围、主题概览
Level 2: Concepts（概念层）
         ↑ 多个 Atomic Insight 聚合的主题群
Level 1: Atomic Insights（原子洞察）
         ↑ 最小粒度事实，SVO 格式（主谓宾）
```"""

new_pyramid = """```mermaid
flowchart BT
    L1[Level 1: Atomic Insights<br/>最小粒度事实 SVO 格式] --> L2[Level 2: Concepts<br/>多个 Atomic Insight 聚合的主题群]
    L2 --> L3[Level 3: Document Abstracts<br/>单文档的目的、范围、主题概览]
    L3 --> L4[Level 4: Cross-Document Recollections<br/>多文档涌现的模式、对比、矛盾标注]
    
    classDef default fill:#fafafa,stroke:#334155,stroke-width:1px;
```"""
c1 = c1.replace(old_pyramid, new_pyramid)

with open(p1, 'w', encoding='utf-8') as f:
    f.write(c1)

# ==========================================
# 替换 2: 04-architecture.md (五阶段流水线)
# ==========================================
p4 = os.path.join(knowledge_dir, "04-architecture.md")
with open(p4, 'r', encoding='utf-8') as f:
    c4 = f.read()

# 使用正则匹配那个大图
pattern = re.compile(r"```\s*┌──.*?└──────────────────────────────────────────────────────────────┘\n```", re.DOTALL)

new_mermaid_4 = """```mermaid
flowchart TD
    subgraph Stage1 [Stage 1: 内容接入与规范化]
        direction LR
        S1[PDF/图片/视频/代码] --> P1[VLM / ASR / Docling] --> O1[统一输出: Markdown/JSON]
    end

    subgraph Stage2 [Stage 2: 知识蒸馏与仲裁]
        direction TB
        E1[四层金字塔提取]
        E2[Skill 可执行化契约]
        E3[CDC 冲突仲裁机制<br/>有时态则覆盖 / 无时态挂载冲突标]
    end

    subgraph Stage3 [Stage 3: 质量验证层]
        direction LR
        V1[对抗一致性重问] --> V2[置信度评分 >0.8] --> V3[Acceptance Predicate]
    end

    subgraph Stage4 [Stage 4: 入库路由分流]
        direction LR
        R1[(Wiki文档库<br/>Markdown)]
        R2[(向量数据库<br/>Embedding)]
        R3[(Skill库<br/>.agents/)]
    end

    subgraph Stage5 [Stage 5: 检索与消费终端]
        direction LR
        C1[精确事实 → 向量检索]
        C2[主题综合 → 图谱聚合]
        C3[流程执行 → Skill加载]
    end

    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> Stage5
    
    classDef plain fill:#fff,stroke:#334155,stroke-width:1px,color:#111;
    class Stage1,Stage2,Stage3,Stage4,Stage5,S1,P1,O1,E1,E2,E3,V1,V2,V3,R1,R2,R3,C1,C2,C3 plain;
```"""

# 因为原始的 Markdown 被拆分，这里替换掉全链路架构的 ASCII 图
# 手动找到边界
start_idx = c4.find("### 4.1 五阶段标准管道")
end_idx = c4.find("### 4.2 多模态 RAG 三种范式对比")
if start_idx != -1 and end_idx != -1:
    section_c4 = c4[start_idx:end_idx]
    # 替换所有的 ``` 块
    new_section_c4 = re.sub(r"```.*?```", new_mermaid_4, section_c4, flags=re.DOTALL)
    c4 = c4[:start_idx] + new_section_c4 + c4[end_idx:]

with open(p4, 'w', encoding='utf-8') as f:
    f.write(c4)


# ==========================================
# 替换 3: 06-agent-call.md (全景图)
# ==========================================
p6 = os.path.join(knowledge_dir, "06-agent-call.md")
with open(p6, 'r', encoding='utf-8') as f:
    c6 = f.read()

# Agentic Loop 的 ASCII 替换
old_loop = """```
ReAct 循环（直到 stop 条件满足）：
  ┌─────────────────────────────────────────────────────┐
  │  Reason：当前有没有足够证据回答问题？                  │
  │  → 不够 → 分析缺口，决定下一步检索策略               │
  │                                                     │
  │  Act（选择工具之一）：                               │
  │  · search(query)       ← 跨库语义搜索               │
  │  · find(doc_id, kw)   ← 文档内精确定位              │
  │  · open(doc_id, line) ← 读取文档指定片段             │
  │  · summarize()         ← 压缩上下文，释放 token 空间  │
  │                                                     │
  │  Observe：获取工具结果，更新已知信息                  │
  └─────────────────────────────────────────────────────┘
  
Stop 条件（必须显式设置，否则无限循环）：
  · 迭代上限：3-7 轮（大多数收敛在前3轮）
  · Token 预算：20-40k total
  · 置信度阈值：Agent 判断证据已足够
  · 超时：30-60 秒（交互式场景）
```"""

new_loop_mermaid = """```mermaid
flowchart TD
    Start[Agentic Query] --> Reason{证据充足?}
    Reason -->|Yes| End[生成终局回答]
    Reason -->|No: 分析缺口| Act
    
    subgraph Action_Space [Act 工具箱]
        direction LR
        A1[search: 跨库搜索]
        A2[find: 文档内精确定位]
        A3[open: 读指定片段]
        A4[summarize: 降维释放Token]
    end
    
    Act --> Action_Space
    Action_Space --> Observe[Observe: 更新已知信息]
    Observe --> Check{Stop 条件触发?}
    
    Check -->|迭代达上限/超时| End
    Check -->|继续| Reason
    
    classDef default fill:#fafafa,stroke:#334155,stroke-width:1px;
    classDef decision fill:#fef08a,stroke:#ca8a04,stroke-width:1px;
    class Reason,Check decision;
```"""
c6 = c6.replace(old_loop, new_loop_mermaid)

with open(p6, 'w', encoding='utf-8') as f:
    f.write(c6)

# ==========================================
# 替换 4: 07-advanced-theory.md (完整全景图)
# ==========================================
p7 = os.path.join(knowledge_dir, "07-advanced-theory.md")
with open(p7, 'r', encoding='utf-8') as f:
    c7 = f.read()

# 最后一个全景图
start_idx = c7.find("## 补充：完整知识流转全景图")
if start_idx != -1:
    section_c7 = c7[start_idx:]
    new_panorama = """```mermaid
flowchart TD
    Raw((原始多模态内容)) --> Distill

    subgraph Distill [蒸馏链路]
        direction TB
        S1[解析: 统一转为Markdown/JSON] --> S2[蒸馏: 四层金字塔/Skill/Rules]
        S2 --> S3[质量验证: 过滤幻觉/打分]
        S3 --> S4[入库分流]
    end

    Distill --> KB

    subgraph KB [知识库层]
        direction LR
        K1[(向量库<br/>事实查找)]
        K2[(知识图谱<br/>多跳综合)]
        K3[(Skill库<br/>流程执行)]
        K4[(记忆层<br/>跨会话时态)]
    end

    KB --> Call

    subgraph Call [Agent 调用层]
        direction TB
        C1{查询路由 Intent}
        C2[检索模式: RAG / Skill导航 / Agentic迭代]
        C3[Agentic Loop 自主循环]
        C4[记忆回写]
        C1 --> C2 --> C3 --> C4
    end
    
    Call --> Output([最终回答 + 置信度])
    
    classDef default fill:#fafafa,stroke:#334155,stroke-width:1px;
    classDef db fill:#f0f9ff,stroke:#0284c7,stroke-width:1px;
    class K1,K2,K3,K4 db;
```"""
    new_section_c7 = re.sub(r"```\n原始.*置信度）\n```", new_panorama, section_c7, flags=re.DOTALL)
    c7 = c7[:start_idx] + new_section_c7

with open(p7, 'w', encoding='utf-8') as f:
    f.write(c7)

print("Mermaid conversion completed.")
