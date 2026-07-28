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
          { text: '附录. 工具完整手册与选型决策树', link: '/knowledge/08-tools-appendix' },
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
          { text: '17. 三个失败案例与教训', link: '/knowledge/17-failure-cases' },
          { text: '附录A. 统一验证框架（VTRCE）', link: '/knowledge/appendix-validation' },
        ]
      },
    ],

    sidebar: {
      '/knowledge/': [
        {
          text: '基础篇 · 认知重建',
          collapsed: false,
          items: [
            { text: '00. 导论：2026全景与10个反直觉洞察', link: '/knowledge/00-introduction' },
            { text: '01. 认知框架：信息→知识→智慧的本质', link: '/knowledge/01-framework' },
            { text: '02. 产品形态决策矩阵（含MCP第5形态）', link: '/knowledge/02-decision-matrix' },
          ]
        },
        {
          text: '工程篇 · 从数据到知识库',
          collapsed: false,
          items: [
            { text: '03. 10种输入场景完整SOP', link: '/knowledge/03-scene-sops' },
            { text: '04. 全链路五阶段架构（+MCP封装）', link: '/knowledge/04-architecture' },
            { text: '05. 数据安全与合规架构（必读）', link: '/knowledge/05-security-compliance' },
            { text: '06. GraphRAG知识图谱构建', link: '/knowledge/05-graphrag' },
            { text: '07. Agent调用 + MCP协议', link: '/knowledge/06-agent-call' },
            { text: '附录. 工具完整手册与选型决策树', link: '/knowledge/08-tools-appendix' },
          ]
        },
        {
          text: '进阶篇 · 架构、成本与进化',
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
            { text: '17. 三个失败案例与教训', link: '/knowledge/17-failure-cases' },
            { text: '附录A. 统一验证框架（VTRCE）', link: '/knowledge/appendix-validation' },
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
