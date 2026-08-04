export const SEARCH_GOLDEN_QUERIES = Object.freeze([
  {
    query: 'RAG 评估',
    aliases: ['RAG 评估', 'RAGAS 评估', '如何评估 RAG'],
    sourcePath: 'knowledge/12-evaluation.md',
    expectedTop3Routes: [
      '/knowledge/12-evaluation',
      '/knowledge/19-tech-selection-vol2',
      '/knowledge/15-codex-prompts'
    ]
  },
  {
    query: 'Agent 上线前检查',
    aliases: ['Agent 上线前检查', '智能体上线检查', '上线前检查'],
    sourcePath: 'knowledge/20-ops-runbook.md',
    expectedTop3Routes: [
      '/knowledge/20-ops-runbook',
      '/knowledge/appendix-validation',
      '/knowledge/05-security-compliance'
    ]
  },
  {
    query: '向量数据库选型',
    aliases: ['向量数据库选型', '向量库怎么选'],
    sourcePath: 'knowledge/18-tech-selection-2026.md',
    expectedTop3Routes: [
      '/knowledge/18-tech-selection-2026',
      '/knowledge/02-decision-matrix',
      '/knowledge/08-tools-appendix'
    ]
  },
  {
    query: '知识库安全合规',
    aliases: ['知识库安全合规', '知识库合规', '数据安全合规'],
    sourcePath: 'knowledge/05-security-compliance.md',
    expectedTop3Routes: [
      '/knowledge/05-security-compliance',
      '/knowledge/appendix-validation',
      '/knowledge/20-ops-runbook'
    ]
  },
  {
    query: '分块策略',
    aliases: ['分块策略', '切块策略', 'Chunk 策略'],
    sourcePath: 'knowledge/04-architecture.md',
    expectedTop3Routes: [
      '/knowledge/04-architecture',
      '/knowledge/18-tech-selection-2026',
      '/knowledge/10-e2e-pipeline'
    ]
  },
  {
    query: '成本如何估算',
    aliases: ['成本如何估算', '知识库成本估算', 'RAG 成本'],
    sourcePath: 'knowledge/10-cost-model.md',
    expectedTop3Routes: [
      '/knowledge/10-cost-model',
      '/knowledge/18-tech-selection-2026',
      '/knowledge/20-ops-runbook'
    ]
  },
  {
    query: 'GraphRAG',
    aliases: ['GraphRAG', '图谱增强检索'],
    sourcePath: 'knowledge/05-graphrag.md',
    expectedTop3Routes: [
      '/knowledge/05-graphrag',
      '/knowledge/18-tech-selection-2026',
      '/knowledge/07-advanced-theory'
    ]
  },
  {
    query: 'MCP 协议',
    aliases: ['MCP 协议', 'Model Context Protocol', '知识库 MCP'],
    sourcePath: 'knowledge/06-agent-call.md',
    expectedTop3Routes: [
      '/knowledge/06-agent-call',
      '/knowledge/05-graphrag',
      '/knowledge/18-tech-selection-2026'
    ]
  },
  {
    query: 'Fine-tuning vs RAG',
    aliases: ['Fine-tuning vs RAG', '微调还是 RAG', 'RAFT'],
    sourcePath: 'knowledge/23-finetuning-vs-rag.md',
    expectedTop3Routes: [
      '/knowledge/23-finetuning-vs-rag',
      '/knowledge/07-advanced-theory',
      '/knowledge/appendix-validation'
    ]
  },
  {
    query: '多模态数据采集',
    aliases: ['多模态数据采集', '数据采集方法'],
    sourcePath: 'knowledge/21-data-collection.md',
    expectedTop3Routes: [
      '/knowledge/21-data-collection',
      '/knowledge/03-scene-sops',
      '/knowledge/05-security-compliance'
    ]
  },
  {
    query: 'Skill 蒸馏',
    aliases: ['Skill 蒸馏', '技能蒸馏'],
    sourcePath: 'knowledge/09-skill-distillation-deep-dive.md',
    expectedTop3Routes: [
      '/knowledge/09-skill-distillation-deep-dive',
      '/knowledge/07-advanced-theory',
      '/knowledge/06-agent-call'
    ]
  },
  {
    query: '推理模型',
    aliases: ['推理模型', 'Reasoning Model'],
    sourcePath: 'knowledge/09-reasoning-models.md',
    expectedTop3Routes: [
      '/knowledge/09-reasoning-models',
      '/knowledge/00-introduction',
      '/knowledge/15-codex-prompts'
    ]
  },
  {
    query: '失败案例',
    aliases: ['失败案例', '知识库失败复盘'],
    sourcePath: 'knowledge/17-failure-cases.md',
    expectedTop3Routes: [
      '/knowledge/17-failure-cases',
      '/knowledge/appendix-validation',
      '/knowledge/11-kb-evolution'
    ]
  },
  {
    query: '统一验证框架',
    aliases: ['统一验证框架', '证据裁决框架', 'VTRCE'],
    sourcePath: 'knowledge/appendix-validation.md',
    expectedTop3Routes: [
      '/knowledge/appendix-validation',
      '/knowledge/12-evaluation',
      '/knowledge/17-failure-cases'
    ]
  },
  {
    query: 'Agent 设计',
    aliases: ['Agent 设计', '智能体设计', 'Agent 编排'],
    sourcePath: 'knowledge/22-agent-design.md',
    expectedTop3Routes: [
      '/knowledge/22-agent-design',
      '/knowledge/12-evaluation',
      '/knowledge/06-agent-call'
    ]
  }
])

export function getSearchAliases(relativePath) {
  return [...new Set(
    SEARCH_GOLDEN_QUERIES
      .filter(({ sourcePath }) => sourcePath === relativePath)
      .flatMap(({ aliases }) => aliases)
  )]
}
