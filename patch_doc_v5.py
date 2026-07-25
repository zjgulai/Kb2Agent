import os
import re

knowledge_dir = "/Users/pray/project/distillation/docs/knowledge/"

# ==========================================
# 1. 补丁：03-scene-sops.md (引入 Unlimited-OCR)
# ==========================================
p3 = os.path.join(knowledge_dir, "03-scene-sops.md")
with open(p3, 'r', encoding='utf-8') as f:
    c3 = f.read()

route_2_end = c3.find("#### 3. 知识蒸馏与后处理技巧")

route_3_insert = """
**路线三：One-Shot 无限上下文流派 (2026 最前沿降维打击)**
*   **工具**：**`baidu/Unlimited-OCR`**
*   **核心原理 (第一性原理)**：摒弃传统“版面分析 → 裁剪 → 分块识别 → 重新拼接”的易错流水线。直接利用 32K 超长上下文 VLM，将多页 PDF 一次性吞入，端到端直接输出带有正确阅读顺序和排版的 Markdown。彻底消灭了**误差传递 (Error Propagation)**。
*   **适用**：长篇研报、跨页超级大表、对上下文连贯性要求极高的核心文献。
*   **环境准备**：需要支持 vLLM 或 SGLang 的高配 GPU 环境 (支持 CUDA 12.9/13.0)。
*   **执行代码 (基于 SGLang)**：
    ```python
    # 核心优势：多页并发解析，直接输出
    import fitz # PyMuPDF 转换图片
    
    # 1. 直接将 PDF 送入超长上下文引擎
    generate(
        prompt="Multi page parsing.", 
        image_paths=pdf_to_images("your_doc.pdf", dpi=300), 
        image_mode="base", 
        ngram_window=1024 # 专为防重复生成的 Custom Logit Processor
    )
    ```

"""
if "路线三" not in c3:
    c3 = c3[:route_2_end] + route_3_insert + c3[route_2_end:]
    
    # 更新 SOTA 表格
    c3 = c3.replace("**`MinerU2.5-Pro`** (精度榜首)<br/>**`Marker v2`** (速度无敌)<br/>**`Docling`** (纯CPU友好)", "**`Unlimited-OCR`** (单发无限流/消灭流水线)<br/>**`MinerU2.5-Pro`** (细粒度解耦榜首)<br/>**`Docling`** (纯CPU友好)")

with open(p3, 'w', encoding='utf-8') as f:
    f.write(c3)


# ==========================================
# 2. 补丁：07-advanced-theory.md (深度拆解 zjgulai list 分层)
# ==========================================
p7 = os.path.join(knowledge_dir, "07-advanced-theory.md")
with open(p7, 'r', encoding='utf-8') as f:
    c7 = f.read()

lod_table_start = c7.find("### 7.2 知识蒸馏的五个 Level 分层")
lod_table_end = c7.find("### 7.3 技术路由选型指南")

new_lod_content = """### 7.2 知识蒸馏与 Agent 调用的 DIKW 深度阶梯 (Level of Distillation)

通过对工业界（Microsoft, HuggingFace）和开源极客社区（如 `zjgulai` 收藏的知识图谱生态）的深度解构，我们发现所谓的“蒸馏”不仅是格式转换，而是从**“数据(Data)”向“智慧(Wisdom)”**的跨越。

切忌将低阶产物硬塞给需要高阶推理的 Agent。以下是 2026 年最新基准的 **5 级蒸馏阶梯 (LoD)**：

| 蒸馏阶梯 | DIKW 映射 | 核心动作 | 代表级开源仓库 | Agent 评估与应用实效 |
| :--- | :--- | :--- | :--- | :--- |
| **LoD 0 (Flat)** | 数据 (Data) | **切块 + 向量化** | `LangChain`, `LlamaIndex` | **单跳事实检索 60%，多跳 <10%**。<br/>Agent 像在垃圾堆里抽盲盒，极易“Lost in the Middle”。 |
| **LoD 1 (Enriched)**| 信息 (Info) | **元数据 + 实体附着** | `UnWeaver` (arXiv:2603) | **零图谱成本，超越早期 GraphRAG**。<br/>用 LLM 抽实体绑在 Chunk 尾部，用轻量过滤代替昂贵的图遍历。 |
| **LoD 2 (Hierarchical)**| 知识 (Knowledge)| **分层目录树构建** | `Corpus2Skill` (HF, 2026) | **WixQA F1: 46.0% (超 Dense 27%)**。<br/>让 Agent **放弃被动检索，主动 Navigate(导航)** `INDEX.md` 目录树。 |
| **LoD 3 (Relational)** | 知识网络 | **图谱与社区摘要** | `GraphRAG`, `LightRAG` | **全库主题综合（Sensemaking）霸主**。<br/>解决“这些报告共同的主题是什么”等全局泛化问题，但单跳事实查询成本极高。 |
| **LoD 4 (Procedural)** | 智慧 (Wisdom) | **方法论与行为契约** | `cangjie-skill`, `colleague-skill`, `ex-skill` | **qsv 成功率 98.85%**。<br/>最高阶蒸馏。将书籍、长视频、前任对话(`ex-skill`)甚至自己(`yourself-skill`) 提炼为带触发条件、禁忌和决策流的 `SKILL.md`。 |

> **深度洞察：LoD 4 (Skill 蒸馏) 为什么是终局？**
> 从 `colleague-skill` (同事经验) 到 `yourself-skill` (自我永生)，再到 `anti-distill` (防止被公司资本家吸干经验的防蒸馏工具)。开源社区的走向证明：**最高价值的知识不是“事实”，而是“判断启发式 (Heuristics)”与“SOP 肌肉记忆”**。这也是为什么提供 `SKILL.md` 能让 Agent 的执行成功率发生断层式领先。

"""

if "DIKW" not in c7:
    c7 = c7[:lod_table_start] + new_lod_content + c7[lod_table_end:]

with open(p7, 'w', encoding='utf-8') as f:
    f.write(c7)


# ==========================================
# 3. 补丁：08-tools-appendix.md (补充 Unlimited-OCR)
# ==========================================
p8 = os.path.join(knowledge_dir, "08-tools-appendix.md")
with open(p8, 'r', encoding='utf-8') as f:
    c8 = f.read()

mineru_idx = c8.find("#### MinerU 2.5-Pro")

unlimited_ocr = """#### Unlimited-OCR (Baidu)
- **定位**：开创 One-shot Long-horizon Parsing 时代的端到端解析器（2026.06）。
- **核心能力**：无需任何版面分析和图片裁剪，利用 32K 超长上下文 VLM，直接将多页 PDF/图片序列送入模型，一次性输出带精确阅读顺序和 LaTeX/HTML 格式的完整 Markdown。
- **精度**：从物理架构上彻底消除了流水线中“画框错位 → 裁剪截断 → OCR乱码”的**误差传递（Error Propagation）**。
- **推荐场景**：极其复杂的跨页表格、需要结合上下文推断阅读顺序的重度混排文档。
- **安装与部署**：
  ```bash
  # 官方推荐使用 vLLM 镜像部署以获得极致并发
  docker pull vllm/vllm-openai:unlimited-ocr
  
  # 或使用 SGLang
  python -m sglang.launch_server --model baidu/Unlimited-OCR --context-length 32768
  ```
- **来源**：开源本地，GitHub baidu/Unlimited-OCR

---

"""

if "Unlimited-OCR" not in c8:
    c8 = c8[:mineru_idx] + unlimited_ocr + c8[mineru_idx:]

with open(p8, 'w', encoding='utf-8') as f:
    f.write(c8)

print("Markdown patched with Unlimited-OCR and deep LoD analysis.")
