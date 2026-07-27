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
  - icon: 🧭
    title: 10个反直觉洞察
    details: 知识库越多不等于检索越好。实时数据不该入库。推理模型降低预处理必要性。动手之前先建立正确认知，避免踩坑。
    link: /knowledge/00-introduction
    linkText: 读导论

  - icon: 🔐
    title: 数据安全与合规 必读
    details: 内部经营数据绝不经公网LLM API。PII脱敏、数据分级L1-L4、RBAC权限、审计日志——企业级安全架构的完整实现。
    link: /knowledge/05-security-compliance
    linkText: 安全架构

  - icon: ⚙️
    title: 10种场景工程SOP
    details: PDF含复杂图表、长视频、播客、代码仓库、实时直播……每种场景均有分环境（有GPU/无GPU）的完整可运行代码。
    link: /knowledge/03-scene-sops
    linkText: 场景SOP

  - icon: 🔗
    title: MCP协议：知识库作为通用工具
    details: 2026年事实标准。封装为MCP Server后，Claude Desktop/Cursor/Codex App无需适配代码即可直接调用。
    link: /knowledge/06-agent-call
    linkText: MCP接入

  - icon: 💰
    title: 成本模型与预算管理
    details: 全链路成本计算器、三档预算方案、成本熔断机制。让你在上线前就能回答：这个知识库每月多少钱？
    link: /knowledge/10-cost-model
    linkText: 成本规划

  - icon: 🤖
    title: 推理模型时代的重构
    details: DeepSeek-R1/o3可在查询时做深度推理，降低80%预处理必要性。何时"深提取"、何时"浅提取+重推理"的决策框架。
    link: /knowledge/09-reasoning-models
    linkText: 推理模型策略
---

<div class="role-guide">
  <h2>找到你的入口</h2>
  <div class="role-cards">
    <div class="role-card">
      <div class="role-icon">👩‍💻</div>
      <div class="role-title">工程师 / 数据科学家</div>
      <div class="role-desc">已有 Python 基础，想直接动手</div>
      <div class="role-path">推荐路径：第03章 SOP → 第04章架构 → 第12章Pipeline → 第15章Prompts</div>
    </div>
    <div class="role-card">
      <div class="role-icon">📊</div>
      <div class="role-title">分析师 / 产品经理</div>
      <div class="role-desc">需要理解全局，再决定如何落地</div>
      <div class="role-path">推荐路径：第00章导论 → 第01章认知 → 第16章VOC案例 → 第10章成本</div>
    </div>
    <div class="role-card">
      <div class="role-icon">🏢</div>
      <div class="role-title">CTO / 技术决策者</div>
      <div class="role-desc">评估技术投资，关注安全和成本</div>
      <div class="role-path">推荐路径：第05章安全合规 → 第10章成本模型 → 第08章架构选型 → 第16章案例ROI</div>
    </div>
  </div>
</div>

<style>
.role-guide {
  max-width: 960px;
  margin: 3rem auto;
  padding: 0 1.5rem;
}

.role-guide h2 {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
  text-align: center;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .role-cards {
    grid-template-columns: 1fr;
  }
}

.role-card {
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1.5rem;
  transition: border-color .2s, box-shadow .2s;
}

.role-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(196,74,94,0.12);
}

.role-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.role-title {
  font-weight: 700;
  font-size: 0.975rem;
  color: var(--vp-c-text-1);
  margin-bottom: 0.35rem;
}

.role-desc {
  font-size: 0.825rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.75rem;
}

.role-path {
  font-size: 0.78rem;
  color: var(--vp-c-brand-1);
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
}
</style>
