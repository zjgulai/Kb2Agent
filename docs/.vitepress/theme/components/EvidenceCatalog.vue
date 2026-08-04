<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import {
  PhArrowRight,
  PhBookOpen,
  PhCalendarBlank,
  PhChartLineUp,
  PhCheckCircle,
  PhCircleDashed,
  PhCode,
  PhInfo,
  PhTarget,
  PhWrench
} from '@phosphor-icons/vue'
import { data as chapters } from '../../../knowledge.data.mjs'

const sectionOrder = ['foundation', 'engineering', 'advanced', 'practice']
const sectionLabels = {
  foundation: '基础篇 · 认知与原理',
  engineering: '工程篇 · 数据与实现',
  advanced: '进阶篇 · 优化与实践',
  practice: '实战篇 · 落地与验收'
}
const sectionIcons = {
  foundation: PhBookOpen,
  engineering: PhWrench,
  advanced: PhChartLineUp,
  practice: PhTarget
}
const stageLabels = {
  concept: '概念界定',
  design: '方案设计',
  build: '工程构建',
  operate: '运行治理'
}
const maturityLabels = {
  principle: '原理',
  solution: '方案',
  runnable: '可运行',
  acceptance: '可验收'
}
const codeLabels = {
  none: '无代码',
  illustrative: '示意代码',
  'syntax-checked': '语法校验',
  'smoke-tested': '烟测通过'
}
const verificationLabels = {
  pending: '待复核',
  'source-reviewed': '来源复核',
  'syntax-checked': '语法校验',
  'smoke-tested': '烟测通过',
  'acceptance-tested': '验收通过'
}

const groups = computed(() => sectionOrder.map((section) => ({
  section,
  label: sectionLabels[section],
  pages: chapters.filter((page) => page.section === section)
})))

function displayDate(value) {
  if (!value) return '待定'
  return String(value).slice(0, 10)
}

function displayTitle(value) {
  return String(value)
    .replace(/^第.+?章[：:]?\s*/, '')
    .replace(/^附录 [AB][：:]?\s*/, '')
    .replace(/[—–]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

</script>

<template>
  <section id="knowledge-catalog" class="catalog-panel" aria-labelledby="catalog-title">
    <div class="panel-heading">
      <h2 id="catalog-title">知识库目录</h2>
      <p>事实状态来自页面证据契约</p>
    </div>

    <div class="catalog-table" aria-label="知识模块目录">
      <div class="catalog-head" aria-hidden="true">
        <span>章节与主题</span>
        <span>已验证</span>
        <span>示例代码</span>
        <span>适用阶段</span>
        <span>最近复核</span>
      </div>

      <template v-for="group in groups" :key="group.section">
        <div class="catalog-group">
          <div class="catalog-group-title" role="heading" aria-level="3">
            <component :is="sectionIcons[group.section]" :size="15" aria-hidden="true" />
            {{ group.label }}
          </div>
          <a
            v-for="page in group.pages"
            :key="page.docId"
            class="catalog-row"
            :href="withBase(page.url)"
          >
            <span class="catalog-topic">
              <span class="chapter-id"><span class="mkd-visually-hidden">章节 </span>{{ page.displayNumber }}</span>
              <span>
                <strong>{{ displayTitle(page.title) }}</strong>
                <small><span class="mkd-visually-hidden">成熟度 </span>{{ maturityLabels[page.maturity] }}</small>
              </span>
            </span>
            <span class="catalog-status" :class="`is-${page.verification}`" data-label="验证状态">
              <PhCheckCircle v-if="page.verification !== 'pending'" :size="17" weight="fill" aria-hidden="true" />
              <PhCircleDashed v-else :size="17" aria-hidden="true" />
              <span class="mkd-visually-hidden catalog-field-label">验证状态 </span>
              {{ verificationLabels[page.verification] }}
            </span>
            <span class="catalog-status" data-label="示例代码">
              <PhCode :size="17" aria-hidden="true" />
              <span class="mkd-visually-hidden catalog-field-label">示例代码 </span>
              {{ codeLabels[page.codeStatus] }}
            </span>
            <span class="catalog-stage" data-label="适用阶段"><span class="mkd-visually-hidden catalog-field-label">适用阶段 </span>{{ stageLabels[page.stage] }}</span>
            <span class="catalog-date" data-label="最近复核">
              <PhCalendarBlank :size="16" aria-hidden="true" />
              <span class="mkd-visually-hidden catalog-field-label">最近复核 </span>
              {{ displayDate(page.reviewedAt) }}
            </span>
            <PhArrowRight class="catalog-arrow" :size="17" aria-hidden="true" />
          </a>
        </div>
      </template>
    </div>
    <p class="catalog-footnote">
      <PhInfo :size="15" aria-hidden="true" />
      内容持续更新与复核；“可运行”仅表示列出的本地证据范围，不代表生产上线。
    </p>
  </section>
</template>
