import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  base: '/Kb2Agent/',
  title: "MKD Guide",
  description: "多模态知识蒸馏完整指南",
  cleanUrls: true,
  lastUpdated: true,
  appearance: false, // 强制关闭深色模式切换

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    }]
  ],

  themeConfig: {
    logo: null,
    siteTitle: 'MKD Guide',

    nav: [
      { text: '认知框架', link: '/knowledge/01-framework' },
      { text: '工程实践', link: '/knowledge/03-scene-sops' },
      { text: '完整 Pipeline', link: '/knowledge/10-e2e-pipeline' },
      { text: '工具手册', link: '/knowledge/08-tools-appendix' },
    ],

    sidebar: {
      '/knowledge/': [
        {
          text: '认知基础',
          collapsed: false,
          items: [
            { text: '一、认知框架与全局地图', link: '/knowledge/01-framework' },
            { text: '二、输入 × 输出决策矩阵', link: '/knowledge/02-decision-matrix' },
          ]
        },
        {
          text: '工程实践',
          collapsed: false,
          items: [
            { text: '三、10 种输入场景完整 SOP', link: '/knowledge/03-scene-sops' },
            { text: '四、全链路技术架构', link: '/knowledge/04-architecture' },
            { text: '五、GraphRAG 知识库构建', link: '/knowledge/05-graphrag' },
            { text: '六、Agent 知识库调用', link: '/knowledge/06-agent-call' },
            { text: '七、Agentic 检索分层理论', link: '/knowledge/07-advanced-theory' },
            { text: '八、工具完整手册与选型决策树', link: '/knowledge/08-tools-appendix' },
            { text: '九、Skill 蒸馏 9 大仓库解构', link: '/knowledge/09-skill-distillation-deep-dive' },
          ]
        },
        {
          text: '端到端 Pipeline',
          collapsed: false,
          items: [
            { text: '十、完整可运行 Pipeline', link: '/knowledge/10-e2e-pipeline' },
            { text: '十一、知识库进化与闭环', link: '/knowledge/11-kb-evolution' },
            { text: '十二、Agent 调用质量评估', link: '/knowledge/12-evaluation' },
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
      primaryColor: '#eff6ff',
      primaryBorderColor: '#2563eb',
      primaryTextColor: '#1e3a8a',
      lineColor: '#64748b',
      secondaryColor: '#f0fdf4',
      tertiaryColor: '#fefce8',
      noteBkgColor: '#fefce8',
      noteTextColor: '#92400e',
      edgeLabelBackground: '#ffffff',
    }
  }
}))
