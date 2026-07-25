# 第四部分：全链路技术架构

### 4.1 五阶段标准管道

```mermaid
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
```

---

### 4.2 多模态 RAG 三种范式对比

| 范式 | 原理 | 优势 | 劣势 | 推荐场景 |
|------|------|------|------|----------|
| **文本化 RAG** | 图片/表格→VLM描述→存入向量库 | 简单，兼容所有文本工具链 | 信息损失（布局/颜色/空间）| 文本为主、视觉为辅的文档 |
| **原生视觉 RAG (VisRAG/ColPali)** | 文档页→直接嵌入为图像向量→VLM生成回答 | VisRAG 比传统高25-39% | 推理成本高 | 视觉信息密集（图表/设计/扫描件）|
| **多智能体分层检索 (ViDoRAG)** | Seeker粗检索→Inspector精审→Answer一致性 | 视频文档最优 | 架构复杂 | 视频+文档混合知识库 |

---

### 4.3 质量评估指标

**知识库蒸馏质量**：

| 维度 | 指标 | 测量方式 |
|------|------|----------|
| 准确性 | LLM-as-Judge 正确率 | 与 ground truth 对比 |
| 完整性 | Completeness Score (0-1) | 问题各方面是否覆盖 |
| 忠实性 | Faithfulness Score | 是否有不在原文中的内容（幻觉）|
| 相关性 | Context Relevance | 检索内容与查询的相关度 |
| 一致性 | 对抗重问稳定性 | 同一claim多角度重问的稳定率 |
| 粒度覆盖 | 多层次命中率 | 从原子到摘要各层的检索命中 |

**多模态解析质量**（OmniDocBench 标准）：

| 指标 | 含义 |
|------|------|
| CCT（Correct Content Transfer）| 文本内容准确率 |
| TEDS（Tree-Edit Distance Score）| 表格结构准确率 |
| Element Alignment | 元素类型识别准确率 |
| Reading Order | 阅读顺序编辑距离 |

---
