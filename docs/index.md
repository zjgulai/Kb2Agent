---
layout: home

hero:
  name: "MKD Guide"
  text: "多模态知识蒸馏到智能体调用"
  tagline: "从任意信息源到 Agent 可执行知识的完整工程闭环。采集、结构化提取、安全合规、入库、MCP调用、自进化——每个环节都有可运行代码。"
  actions:
    - theme: brand
      text: 从导论开始（推荐）
      link: /knowledge/00-introduction
    - theme: alt
      text: 直接看 Pipeline 代码
      link: /knowledge/10-e2e-pipeline

features:
  - title: 10个反直觉洞察
    details: 知识库越多不等于检索越好。实时数据不该入库。推理模型降低预处理必要性。动手之前先建立正确认知，避免踩坑。
    link: /knowledge/00-introduction
    linkText: 读导论

  - title: 数据安全与合规 必读
    details: 内部经营数据绝不经公网LLM API。PII脱敏、数据分级L1-L4、RBAC权限、审计日志——企业级安全架构的完整实现。
    link: /knowledge/05-security-compliance
    linkText: 安全架构

  - title: 10种场景工程SOP
    details: PDF含复杂图表、长视频、播客、代码仓库、实时直播……每种场景均有分环境（有GPU/无GPU）的完整可运行代码。
    link: /knowledge/03-scene-sops
    linkText: 场景SOP

  - title: MCP协议——知识库作为通用工具
    details: 2026年事实标准。封装为MCP Server后，Claude Desktop、Cursor、Codex App无需适配代码即可直接调用。
    link: /knowledge/06-agent-call
    linkText: MCP接入

  - title: 成本模型与预算管理
    details: 全链路成本计算器、三档预算方案、成本熔断机制。让你在上线前就能回答：这个知识库每月多少钱？
    link: /knowledge/10-cost-model
    linkText: 成本规划

  - title: 推理模型时代的重构
    details: DeepSeek-R1/o3可在查询时做深度推理，降低80%预处理必要性。何时"深提取"、何时"浅提取+重推理"的决策框架。
    link: /knowledge/09-reasoning-models
    linkText: 推理模型策略
---

<div class="role-guide">
  <h2>按你的第一个问题找入口</h2>
  <div class="role-cards">
    <a class="role-card" href="/Kb2Agent/knowledge/00-introduction">
      <div class="role-icon-label">判</div>
      <div class="role-title">值不值得做知识库？</div>
      <div class="role-desc">先建立判断，再动手。五大反模式先看清楚。</div>
      <div class="role-path">→ 导论 + 决策矩阵 + 失败案例</div>
    </a>
    <a class="role-card" href="/Kb2Agent/knowledge/05-security-compliance">
      <div class="role-icon-label">安</div>
      <div class="role-title">内部数据能不能用 AI？</div>
      <div class="role-desc">合规红线先划清楚，再选工具。</div>
      <div class="role-path">→ 安全合规 + 数据分级 + RBAC</div>
    </a>
    <a class="role-card" href="/Kb2Agent/knowledge/03-scene-sops">
      <div class="role-icon-label">跑</div>
      <div class="role-title">有数据，直接想跑起来</div>
      <div class="role-desc">PDF / 视频 / 代码库 / 专家经验，每种都有可运行代码。</div>
      <div class="role-path">→ 场景 SOP + Pipeline + Prompts</div>
    </a>
  </div>
</div>
