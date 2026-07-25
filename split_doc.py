import os
import re

source_md = "/Users/pray/Documents/MultimodalKD_Research_20260724/多模态知识蒸馏3合1终稿.md"
dest_dir = "/Users/pray/project/distillation/docs/knowledge"

with open(source_md, 'r', encoding='utf-8') as f:
    content = f.read()

# 拆分规则
sections = [
    {"title": "01-framework", "start": "## 第一部分：认知框架", "end": "## 第二部分：输入类型 × 输出形式决策矩阵"},
    {"title": "02-decision-matrix", "start": "## 第二部分：输入类型 × 输出形式决策矩阵", "end": "## 第三部分：9种输入场景完整SOP"},
    {"title": "03-scene-sops", "start": "## 第三部分：9种输入场景完整SOP", "end": "## 第四部分：全链路技术架构"},
    {"title": "04-architecture", "start": "## 第四部分：全链路技术架构", "end": "## 附录：所有工具逐一说明"},
    {"title": "08-tools-appendix", "start": "## 附录：所有工具逐一说明", "end": "## 快速导航索引"},
    {"title": "05-graphrag", "start": "## 第五部分：GraphRAG 知识库构建", "end": "## 第六部分：知识库被 Agent 调用"},
    {"title": "06-agent-call", "start": "## 第六部分：知识库被 Agent 调用", "end": "## 第七部分：Agentic 检索与蒸馏的进阶分层理论 (2026 基准)"},
    {"title": "07-advanced-theory", "start": "## 第七部分：Agentic 检索与蒸馏的进阶分层理论 (2026 基准)", "end": "## 补充：完整知识流转全景图"}
]

for sec in sections:
    start_idx = content.find(sec["start"])
    end_idx = content.find(sec["end"])
    
    if start_idx == -1: continue
    
    if end_idx == -1:
        extracted = content[start_idx:]
    else:
        extracted = content[start_idx:end_idx]
        
    # 写入文件
    file_path = os.path.join(dest_dir, f"{sec['title']}.md")
    
    # 转换为 Markdown 一级标题
    extracted = extracted.replace(sec["start"], f"# {sec['start'].replace('## ', '')}", 1)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(extracted.strip() + "\n")

# 生成首页
index_content = """---
layout: home

hero:
  name: "Multimodal KD"
  text: "多模态知识蒸馏完整指南"
  tagline: "从高熵物理世界到低熵可执行知识的转化之道。"
  actions:
    - theme: brand
      text: 开始阅读
      link: /knowledge/01-framework
    - theme: alt
      text: GitHub
      link: https://github.com

features:
  - title: 第一性原理驱动
    details: 不追逐框架光环，从信息损耗、执行确定性与边际成本的本质出发，构建知识库。
  - title: 全场景 SOP
    details: 覆盖长文本、视频、播客、代码库、交互式大屏等 10 种极端场景的蒸馏SOP。
  - title: 前沿架构基准
    details: 基于 2026 年最新论文（A-RAG, Corpus2Skill）验证的 Agent 调用与分层记忆理论。
---
"""
with open("/Users/pray/project/distillation/docs/index.md", 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Document split and structure initialized.")
