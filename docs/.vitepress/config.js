import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  base: '/Kb2Agent/',
  title: "MKD Guide",
  description: "多模态知识蒸馏到智能体调用完整指南",
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css'
    }]
  ],

  themeConfig: {
    logo: null,
    siteTitle: 'MKD Guide',

    nav: [
      {
        text: '基础篇',
        items: [
          { text: '00. 导论：2026全景与反直觉洞察', link: '/knowledge/00-introduction' },
          { text: '01. 认知框架：信息→知识→智慧', link: '/knowledge/01-framework' },
          { text: '02. 产品形态决策矩阵', link: '/knowledge/02-decision-matrix' },
        ]
      },
      {
        text: '工程篇',
        items: [
          { text: '03. 10种输入场景完整SOP', link: '/knowledge/03-scene-sops' },
          { text: '04. 全链路五阶段架构', link: '/knowledge/04-architecture' },
          { text: '05. 数据安全与合规架构', link: '/knowledge/05-security-compliance' },
          { text: '06. GraphRAG知识图谱构建', link: '/knowledge/05-graphrag' },
          { text: '07. Agent调用 + MCP协议', link: '/knowledge/06-agent-call' },
        ]
      },
      {
        text: '进阶篇',
        items: [
          { text: '08. 架构选型深度指南', link: '/knowledge/07-advanced-theory' },
          { text: '09. 推理模型时代的知识库', link: '/knowledge/09-reasoning-models' },
          { text: '10. 成本模型与预算管理', link: '/knowledge/10-cost-model' },
          { text: '11. Skill蒸馏九大仓库', link: '/knowledge/09-skill-distillation-deep-dive' },
          { text: '12. 完整可运行Pipeline', link: '/knowledge/10-e2e-pipeline' },
          { text: '13. 知识库进化与自进化闭环', link: '/knowledge/11-kb-evolution' },
          { text: '14. 评估质量体系', link: '/knowledge/12-evaluation' },
          { text: '15. Codex Prompts速查', link: '/knowledge/15-codex-prompts' },
          { text: '16. VOC实战案例：Momcozy', link: '/knowledge/16-voc-case-study' },
        ]
      },
    ],

    sidebar: {
      '/knowledge/': [
        {
          text: '📖 基础篇 · 认知重建',
          collapsed: false,
          items: [
            { text: '00. 导论：2026全景与10个反直觉洞察', link: '/knowledge/00-introduction' },
            { text: '01. 认知框架：信息→知识→智慧的本质', link: '/knowledge/01-framework' },
            { text: '02. 产品形态决策矩阵（含MCP第5形态）', link: '/knowledge/02-decision-matrix' },
          ]
        },
        {
          text: '⚙️ 工程篇 · 从数据到知识库',
          collapsed: false,
          items: [
            { text: '03. 10种输入场景完整SOP', link: '/knowledge/03-scene-sops' },
            { text: '04. 全链路五阶段架构（+MCP封装）', link: '/knowledge/04-architecture' },
            { text: '05. 数据安全与合规架构 🔴必读', link: '/knowledge/05-security-compliance' },
            { text: '06. GraphRAG知识图谱构建', link: '/knowledge/05-graphrag' },
            { text: '07. Agent调用 + MCP协议', link: '/knowledge/06-agent-call' },
          ]
        },
        {
          text: '🚀 进阶篇 · 架构、成本与进化',
          collapsed: false,
          items: [
            { text: '08. 架构选型深度指南', link: '/knowledge/07-advanced-theory' },
            { text: '09. 推理模型时代的知识库重构', link: '/knowledge/09-reasoning-models' },
            { text: '10. 成本模型与预算管理', link: '/knowledge/10-cost-model' },
            { text: '11. Skill蒸馏九大仓库解构', link: '/knowledge/09-skill-distillation-deep-dive' },
            { text: '12. 完整可运行Pipeline', link: '/knowledge/10-e2e-pipeline' },
            { text: '13. 知识库进化与自进化闭环', link: '/knowledge/11-kb-evolution' },
            { text: '14. 评估质量体系', link: '/knowledge/12-evaluation' },
            { text: '15. Codex Prompts与工具速查', link: '/knowledge/15-codex-prompts' },
            { text: '16. VOC实战案例：Momcozy', link: '/knowledge/16-voc-case-study' },
          ]
        },
      ]
    },

    socialLinks: [],

    footer: {
      copyright: 'Copyright © 2026 Multimodal Knowledge Distillation Guide'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  },

  mermaid: {
    theme: 'base',
    themeVariables: {
      background:        '#FDF8F4',
      primaryColor:      '#F9D0D6',
      primaryBorderColor:'#C44A5E',
      primaryTextColor:  '#2C1018',
      secondaryColor:    '#F5EDD4',
      secondaryBorderColor:'#C9A84C',
      secondaryTextColor:'#6b5020',
      tertiaryColor:     '#DCF0DC',
      tertiaryBorderColor:'#5E8B5E',
      tertiaryTextColor: '#224d22',
      lineColor:         '#9B8F8C',
      textColor:         '#3A2428',
      edgeLabelBackground:'#FDF8F4',
      noteBkgColor:      '#F5EDD4',
      noteTextColor:     '#6b5020',
      clusterBkg:        '#FAF3EE',
      clusterBorder:     '#D75C70',
      titleColor:        '#2C1018',
    }
  }
}))
