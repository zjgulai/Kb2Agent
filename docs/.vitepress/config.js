import { defineConfig } from 'vitepress'
import { getSearchAliases } from './search-quality.mjs'

export default defineConfig({
  lang: 'zh-CN',
  base: '/Kb2Agent/',
  title: 'MKD Guide',
  titleTemplate: ':title · MKD Guide',
  description: '多模态知识蒸馏到智能体调用完整指南',
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,

  vite: {
    build: {
      // Search and Mermaid are lazy-only chunks; the explicit performance gate
      // below audits every HTML entry's initial graph against the 500 KB limit.
      chunkSizeWarningLimit: 1000
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/Kb2Agent/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#faf9f5' }],
    ['meta', { name: 'color-scheme', content: 'light' }]
  ],

  markdown: {
    theme: 'github-light-high-contrast',
    config(md) {
      const defaultFence = md.renderer.rules.fence
      md.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index]
        if (token.info.trim() === 'mermaid') {
          const encoded = Buffer.from(token.content, 'utf8').toString('base64')
          return `<MermaidDiagram encoded="${encoded}" />`
        }
        return defaultFence(tokens, index, options, env, self)
      }
    }
  },

  themeConfig: {
    logo: null,
    siteTitle: 'MKD Guide',
    sidebarMenuLabel: '知识库目录',
    returnToTopLabel: '返回顶部',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '基础篇',
        items: [
          { text: '导论与反直觉洞察', link: '/knowledge/00-introduction' },
          { text: '认知框架 DIKW', link: '/knowledge/01-framework' },
          { text: '产品形态决策矩阵', link: '/knowledge/02-decision-matrix' }
        ]
      },
      {
        text: '工程篇',
        items: [
          { text: '多模态数据采集', link: '/knowledge/21-data-collection' },
          { text: '10 种场景 SOP', link: '/knowledge/03-scene-sops' },
          { text: '全链路架构', link: '/knowledge/04-architecture' },
          { text: '安全合规（必读）', link: '/knowledge/05-security-compliance' },
          { text: 'GraphRAG 图谱构建', link: '/knowledge/05-graphrag' },
          { text: 'Agent + MCP 调用', link: '/knowledge/06-agent-call' },
          { text: '工具手册与决策树', link: '/knowledge/08-tools-appendix' }
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
          { text: 'Fine-tuning vs RAG 决策', link: '/knowledge/23-finetuning-vs-rag' }
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
          { text: 'Agent 设计与编排', link: '/knowledge/22-agent-design' }
        ]
      }
    ],

    sidebar: {
      '/knowledge/': [
        { text: '全部章节', link: '/#knowledge-catalog' },
        {
          text: '基础篇 · 认知重建',
          collapsed: true,
          items: [
            { text: '导论 · 反直觉洞察', link: '/knowledge/00-introduction' },
            { text: '认知框架 · DIKW', link: '/knowledge/01-framework' },
            { text: '产品形态 · 决策矩阵', link: '/knowledge/02-decision-matrix' }
          ]
        },
        {
          text: '工程篇 · 数据到知识库',
          collapsed: true,
          items: [
            { text: '多模态数据采集', link: '/knowledge/21-data-collection' },
            { text: '10 种场景 SOP', link: '/knowledge/03-scene-sops' },
            { text: '全链路架构', link: '/knowledge/04-architecture' },
            { text: '安全合规 · 必读', link: '/knowledge/05-security-compliance' },
            { text: 'GraphRAG 图谱构建', link: '/knowledge/05-graphrag' },
            { text: 'Agent + MCP 协议', link: '/knowledge/06-agent-call' },
            { text: '工具手册与决策树', link: '/knowledge/08-tools-appendix' }
          ]
        },
        {
          text: '进阶篇 · 架构与成本',
          collapsed: true,
          items: [
            { text: '架构选型 LoD', link: '/knowledge/07-advanced-theory' },
            { text: '推理模型新范式', link: '/knowledge/09-reasoning-models' },
            { text: '成本模型 ROI', link: '/knowledge/10-cost-model' },
            { text: 'Skill 蒸馏九仓库', link: '/knowledge/09-skill-distillation-deep-dive' },
            { text: '完整 Pipeline', link: '/knowledge/10-e2e-pipeline' },
            { text: '知识库自进化', link: '/knowledge/11-kb-evolution' },
            { text: 'Fine-tuning vs RAG', link: '/knowledge/23-finetuning-vs-rag' }
          ]
        },
        {
          text: '实战篇 · 工具与案例',
          collapsed: true,
          items: [
            { text: '评估 · 幻觉检测', link: '/knowledge/12-evaluation' },
            { text: 'Prompts 速查', link: '/knowledge/15-codex-prompts' },
            { text: 'VOC 实战案例', link: '/knowledge/16-voc-case-study' },
            { text: '三个失败案例', link: '/knowledge/17-failure-cases' },
            { text: '统一验证框架', link: '/knowledge/appendix-validation' },
            { text: '技术选型指南 2026', link: '/knowledge/18-tech-selection-2026' },
            { text: '技术选型指南（二）', link: '/knowledge/19-tech-selection-vol2' },
            { text: '生产运维 Runbook', link: '/knowledge/20-ops-runbook' },
            { text: 'Agent 设计与编排', link: '/knowledge/22-agent-design' }
          ]
        }
      ]
    },

    footer: {
      copyright: 'Copyright © 2026 Multimodal Knowledge Distillation Guide'
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            boost: { title: 5, titles: 3, text: 1 },
            fuzzy: 0.2,
            prefix: true,
            boostDocument(documentId, term) {
              const routeByIntentTerm = {
                '评估': '/knowledge/12-evaluation',
                '上线前检查': '/knowledge/20-ops-runbook',
                '知识库安全合规': '/knowledge/05-security-compliance',
                '知识库合规': '/knowledge/05-security-compliance',
                '数据安全合规': '/knowledge/05-security-compliance',
                '分块策略': '/knowledge/04-architecture',
                '切块策略': '/knowledge/04-architecture',
                'chunk': '/knowledge/04-architecture',
                '成本如何估算': '/knowledge/10-cost-model',
                '知识库成本估算': '/knowledge/10-cost-model',
                '失败案例': '/knowledge/17-failure-cases'
              }
              const intendedRoute = routeByIntentTerm[String(term).toLowerCase()]
              return intendedRoute && String(documentId).includes(intendedRoute) ? 12 : 1
            }
          }
        },
        _render(source, env, md) {
          const aliases = getSearchAliases(env.relativePath)
          let html = md.render(source, env)
          const title = env.frontmatter?.title
          if (!/<h1\b/i.test(html) && title) {
            html = md.render(`# ${title}\n\n${source}`, env)
          }
          if (!aliases.length) return html

          const aliasText = aliases
            .map((value) => String(value)
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;'))
            .join(' ')
          return html.replace(/<\/h1>/i, `</h1><p>${aliasText}</p>`)
        },
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
                displayDetails: '显示详细结果',
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
      level: 2,
      label: '本页目录'
    }
  }
})
