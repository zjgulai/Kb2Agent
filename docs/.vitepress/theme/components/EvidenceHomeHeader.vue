<script setup>
import { withBase } from 'vitepress'
import {
  PhArrowRight,
  PhMagnifyingGlass
} from '@phosphor-icons/vue'

function openSearch() {
  const trigger = document.querySelector('.VPNavBarSearch button, .DocSearch-Button')
  if (trigger instanceof HTMLElement) {
    trigger.click()
    return
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
}
</script>

<template>
  <header class="evidence-intro">
    <div class="evidence-intro-copy">
      <p class="section-label">多模态知识蒸馏指南</p>
      <h1>MKD Guide</h1>
      <p class="evidence-tagline">从碎片到智能，从知识到行动</p>
      <p class="evidence-description">
        面向系统学习者与工程实践者的知识库，把分散经验沉淀为可追溯、可复用、可验收的 AI Agent 构建指南。
      </p>
      <button
        class="evidence-search"
        type="button"
        @click="openSearch"
      >
        <PhMagnifyingGlass :size="21" aria-hidden="true" />
        <span>搜索知识库，例如：如何评估 RAG、Agent 上线前检查、向量数据库选型</span>
        <span class="evidence-search-action">搜索</span>
      </button>
      <nav class="evidence-quick-links" aria-label="常见搜索">
        <span>常见搜索</span>
        <a :href="withBase('/knowledge/12-evaluation')">如何评估 RAG</a>
        <a :href="withBase('/knowledge/20-ops-runbook')">Agent 上线前检查</a>
        <a :href="withBase('/knowledge/05-security-compliance')">知识库安全合规</a>
        <a :href="withBase('/knowledge/04-architecture')">分块策略怎么选</a>
        <a :href="withBase('/knowledge/10-cost-model')">成本如何估算</a>
      </nav>
    </div>

    <section class="evidence-summary" aria-label="学习成熟度与推荐入口">
      <div class="summary-maturity">
        <p class="section-label">从概念到验收</p>
        <ol class="maturity-summary">
          <li><span>01</span><div><strong>原理</strong><small>定义问题、术语与边界</small></div></li>
          <li><span>02</span><div><strong>方案</strong><small>给出输入、输出与取舍</small></div></li>
          <li><span>03</span><div><strong>可运行</strong><small>fixture 与 smoke 回执齐全</small></div></li>
          <li><span>04</span><div><strong>可验收</strong><small>阈值、负例与门禁齐全</small></div></li>
        </ol>
      </div>

      <nav class="recommended-summary recommended-block" aria-label="推荐入口">
        <p class="section-label">推荐入口</p>
        <a :href="withBase('/knowledge/00-introduction')">
          <span>先建立边界</span><strong>从导论开始</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
        <a :href="withBase('/knowledge/04-architecture')">
          <span>再连接接口</span><strong>看全链路架构</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
        <a :href="withBase('/knowledge/appendix-validation')">
          <span>最后定义回执</span><strong>使用验证框架</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
      </nav>
    </section>
  </header>
</template>
