import { defineConfig } from 'vitepress'

export default defineConfig({
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
    
    // 极简导航
    nav: [
      { text: '指南', link: '/knowledge/01-framework', activeMatch: '/knowledge/' },
    ],

    // 自动侧边栏
    sidebar: {
      '/knowledge/': [
        {
          text: '多模态知识蒸馏',
          items: [
            { text: '一、认知框架', link: '/knowledge/01-framework' },
            { text: '二、决策矩阵', link: '/knowledge/02-decision-matrix' },
            { text: '三、九种场景SOP', link: '/knowledge/03-scene-sops' },
            { text: '四、全链路架构', link: '/knowledge/04-architecture' },
            { text: '五、GraphRAG构建', link: '/knowledge/05-graphrag' },
            { text: '六、Agent调用', link: '/knowledge/06-agent-call' },
            { text: '七、进阶分层理论', link: '/knowledge/07-advanced-theory' },
            { text: '附录：工具与生态', link: '/knowledge/08-tools-appendix' }
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
  }
})
