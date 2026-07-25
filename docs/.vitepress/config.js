import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  base: '/Kb2Agent/',
  title: "MKD",
  description: "Multimodal Knowledge Distillation",
  cleanUrls: true,
  lastUpdated: true,
  
  head: [
    ['style', {}, `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    `]
  ],

  themeConfig: {
    logo: null,
    siteTitle: 'MKD.Guide',
    
    nav: [
      { text: '指南', link: '/knowledge/01-framework', activeMatch: '/knowledge/' },
    ],

    sidebar: {
      '/knowledge/': [
        {
          text: '🧭 认知基础',
          collapsed: false,
          items: [
            { text: '一、认知框架与全局地图', link: '/knowledge/01-framework' },
            { text: '二、输入×输出决策矩阵', link: '/knowledge/02-decision-matrix' },
          ]
        },
        {
          text: '⚙️ 工程实践',
          collapsed: false,
          items: [
            { text: '三、10种输入场景完整SOP', link: '/knowledge/03-scene-sops' },
            { text: '四、全链路技术架构', link: '/knowledge/04-architecture' },
            { text: '五、GraphRAG知识库构建', link: '/knowledge/05-graphrag' },
            { text: '六、Agent知识库调用', link: '/knowledge/06-agent-call' },
          ]
        },
        {
          text: '🚀 端到端Pipeline',
          collapsed: false,
          items: [
            { text: '十、完整可运行Pipeline', link: '/knowledge/10-e2e-pipeline' },
            { text: '十一、知识库进化与闭环', link: '/knowledge/11-kb-evolution' },
            { text: '十二、Agent调用质量评估', link: '/knowledge/12-evaluation' },
          ]
        },
        {
          text: '🔬 深度理论',
          collapsed: false,
          items: [
            { text: '七、Agentic检索分层理论', link: '/knowledge/07-advanced-theory' },
            { text: '八、Skill蒸馏9大仓库解构', link: '/knowledge/09-skill-distillation-deep-dive' },
          ]
        },
        {
          text: '📦 工具手册',
          collapsed: true,
          items: [
            { text: '工具选型与完整安装指引', link: '/knowledge/08-tools-appendix' },
          ]
        }
      ]
    },

    socialLinks: [],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Multimodal Knowledge Distillation'
    },
    
    search: {
      provider: 'local'
    },
    
    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  },
  
  // Mermaid 自定义配置，使其适配极简极客风
  mermaid: {
    theme: 'base',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryBorderColor: '#334155',
      primaryTextColor: '#111111',
      lineColor: '#64748b',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#f1f5f9'
    }
  }
}))
