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
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/Kb2Agent/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap'
    }]
  ],

  themeConfig: {
    logo: null,
    siteTitle: 'MKD Guide',

    nav: [
      {
        text: '基础篇',
        items: [
          { text: '导论与反直觉洞察', link: '/knowledge/00-introduction' },
          { text: '认知框架 DIKW', link: '/knowledge/01-framework' },
          { text: '产品形态决策矩阵', link: '/knowledge/02-decision-matrix' },
        ]
      },
      {
        text: '工程篇',
        items: [
          { text: '多模态数据采集', link: '/knowledge/21-data-collection' },
          { text: '10种场景 SOP', link: '/knowledge/03-scene-sops' },
          { text: '全链路架构', link: '/knowledge/04-architecture' },
          { text: '安全合规（必读）', link: '/knowledge/05-security-compliance' },
          { text: 'GraphRAG 图谱构建', link: '/knowledge/05-graphrag' },
          { text: 'Agent + MCP 调用', link: '/knowledge/06-agent-call' },
          { text: '工具手册与决策树', link: '/knowledge/08-tools-appendix' },
        ]
      },
      {
        text: '进阶篇',
        items: [
          { text: '架构选型 LoD 指南', link: '/knowledge/07-advanced-theory' },
          { text: '推理模型新范式', link: '/knowledge/09-reasoning-models' },
          { text: '成本模型与 ROI', link: '/knowledge/10-cost-model' },
          { text: 'Skill 蒸馏九仓库', link: '/knowledge/09-skill-distillation-deep-dive' },
          { text: '完整 Pipeline', link: '/knowledge/10-e2e-pipeline' },
          { text: '知识库自进化', link: '/knowledge/11-kb-evolution' },
          { text: 'Fine-tuning vs RAG 决策', link: '/knowledge/23-finetuning-vs-rag' },
        ]
      },
      {
        text: '实战篇',
        items: [
          { text: '评估与幻觉检测', link: '/knowledge/12-evaluation' },
          { text: 'Prompts 速查', link: '/knowledge/15-codex-prompts' },
          { text: 'VOC 实战案例', link: '/knowledge/16-voc-case-study' },
          { text: '三个失败案例', link: '/knowledge/17-failure-cases' },
          { text: '统一验证框架', link: '/knowledge/appendix-validation' },
          { text: '技术选型深度指南', link: '/knowledge/18-tech-selection-2026' },
          { text: '技术选型深度指南（二）', link: '/knowledge/19-tech-selection-vol2' },
          { text: '生产运维 Runbook', link: '/knowledge/20-ops-runbook' },
          { text: 'Agent 设计与编排', link: '/knowledge/22-agent-design' },
        ]
      },
    ],

    sidebar: {
      '/knowledge/': [
        {
          text: '基础篇 · 认知重建',
          collapsed: false,
          items: [
            { text: '导论 · 反直觉洞察', link: '/knowledge/00-introduction' },
            { text: '认知框架 · DIKW', link: '/knowledge/01-framework' },
            { text: '产品形态 · 决策矩阵', link: '/knowledge/02-decision-matrix' },
          ]
        },
        {
          text: '工程篇 · 数据到知识库',
          collapsed: false,
          items: [
            { text: '多模态数据采集', link: '/knowledge/21-data-collection' },
            { text: '10种场景 SOP', link: '/knowledge/03-scene-sops' },
            { text: '全链路五阶段架构', link: '/knowledge/04-architecture' },
            { text: '安全合规 · 必读', link: '/knowledge/05-security-compliance' },
            { text: 'GraphRAG 图谱构建', link: '/knowledge/05-graphrag' },
            { text: 'Agent + MCP 协议', link: '/knowledge/06-agent-call' },
            { text: '工具手册与决策树', link: '/knowledge/08-tools-appendix' },
          ]
        },
        {
          text: '进阶篇 · 架构与成本',
          collapsed: false,
          items: [
            { text: '架构选型 LoD', link: '/knowledge/07-advanced-theory' },
            { text: '推理模型新范式', link: '/knowledge/09-reasoning-models' },
            { text: '成本模型 ROI', link: '/knowledge/10-cost-model' },
            { text: 'Skill 蒸馏九仓库', link: '/knowledge/09-skill-distillation-deep-dive' },
            { text: '完整 Pipeline', link: '/knowledge/10-e2e-pipeline' },
            { text: '知识库自进化', link: '/knowledge/11-kb-evolution' },
            { text: 'Fine-tuning vs RAG 决策', link: '/knowledge/23-finetuning-vs-rag' },
          ]
        },
        {
          text: '实战篇 · 工具与案例',
          collapsed: false,
          items: [
            { text: '评估 · 幻觉检测', link: '/knowledge/12-evaluation' },
            { text: 'Prompts 速查', link: '/knowledge/15-codex-prompts' },
            { text: 'VOC 实战案例', link: '/knowledge/16-voc-case-study' },
            { text: '三个失败案例', link: '/knowledge/17-failure-cases' },
            { text: '统一验证框架', link: '/knowledge/appendix-validation' },
            { text: '技术选型深度指南 2026', link: '/knowledge/18-tech-selection-2026' },
            { text: '技术选型深度指南（二）', link: '/knowledge/19-tech-selection-vol2' },
            { text: '生产运维 Runbook', link: '/knowledge/20-ops-runbook' },
            { text: 'Agent 设计与编排', link: '/knowledge/22-agent-design' },
          ]
        },
      ]
    },

    socialLinks: [],

    footer: {
      copyright: 'Copyright © 2026 Multimodal Knowledge Distillation Guide'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '未找到相关内容',
                resetButtonTitle: '清空搜索',
                backButtonTitle: '关闭搜索',
                footer: {
                  selectText: '选择',
                  navigateText: '导航',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  },

  mermaid: {
    theme: 'base',
    themeVariables: {
      /* 莫兰迪色板 — 与 custom.css v5 保持一致 */
      background:           '#F4EFE6',   /* --paper */
      primaryColor:         '#D0DCE6',   /* --accent-soft 石板蓝灰色块 */
      primaryBorderColor:   '#6A8296',   /* --accent-deep */
      primaryTextColor:     '#3A3630',   /* --ink */
      secondaryColor:       '#E0D6C6',   /* --warm-soft 暖棕灰色块 */
      secondaryBorderColor: '#8C7C66',   /* --warm-deep */
      secondaryTextColor:   '#54504A',   /* --body */
      tertiaryColor:        '#CFDBD4',   /* --sage-soft 鼠尾草绿色块 */
      tertiaryBorderColor:  '#6E8676',   /* --sage-deep */
      tertiaryTextColor:    '#3C5848',
      lineColor:            '#9A948C',   /* --muted */
      textColor:            '#3A3630',   /* --ink */
      edgeLabelBackground:  '#F4EFE6',   /* --paper */
      noteBkgColor:         '#E0D6C6',   /* --warm-soft */
      noteTextColor:        '#54504A',
      clusterBkg:           '#EDE7DB',   /* --paper-2 */
      clusterBorder:        '#7E96A8',   /* --accent */
      titleColor:           '#3A3630',   /* --ink */
    }
  }
}))
