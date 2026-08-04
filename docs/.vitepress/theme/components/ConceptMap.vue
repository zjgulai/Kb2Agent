<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { PhCaretDown } from '@phosphor-icons/vue'
import { data as registry } from '../../../concepts.data.mjs'

const usageLabels = {
  applies: '应用',
  compares: '比较',
  'depends-on': '依赖',
  validates: '验证',
  implements: '实现',
  governs: '治理'
}

const conflictLabels = {
  'not-equivalent': '不可等同',
  'boundary-conflict': '边界冲突'
}

const conceptById = computed(() => Object.fromEntries(
  registry.concepts.map((concept) => [concept.conceptId, concept])
))

const concepts = computed(() => [...registry.concepts])

const usageCount = computed(() => registry.concepts.reduce(
  (total, concept) => total + concept.usedIn.length,
  0
))

function documentFor(documentId) {
  return registry.documents[documentId]
}

function locationHref(documentId, anchor) {
  return `${withBase(documentFor(documentId).route)}#${anchor}`
}

function conceptTerm(conceptId) {
  return conceptById.value[conceptId]?.term || conceptId
}
</script>

<template>
  <section class="concept-workbench" aria-label="核心概念使用图">
    <header class="concept-workbench-intro">
      <div>
        <p class="concept-eyebrow">Concept graph · schema v{{ registry.schemaVersion }}</p>
        <p class="concept-workbench-title">定义先行，跨章使用可追踪</p>
      </div>
      <dl class="concept-totals" aria-label="概念图统计">
        <div><dt>概念</dt><dd>{{ concepts.length }}</dd></div>
        <div><dt>语义用法</dt><dd>{{ usageCount }}</dd></div>
      </dl>
    </header>

    <p class="concept-boundary">
      当前为已复核语义样本；普通词面出现不自动计为已审查用法。复核日期 {{ registry.reviewedAt }}。
    </p>

    <div class="concept-grid">
      <details
        v-for="concept in concepts"
        :key="concept.conceptId"
        class="concept-card"
        :data-concept-id="concept.conceptId"
      >
        <summary>
          <span>
            <strong>{{ concept.term }}</strong>
            <small>{{ concept.aliases.join(' · ') }}</small>
          </span>
          <span class="concept-summary-meta">
            <span class="concept-use-count">{{ concept.usedIn.length }} 个跨章用法</span>
            <PhCaretDown :size="16" weight="bold" class="concept-disclosure-icon" aria-hidden="true" />
          </span>
        </summary>

        <div class="concept-card-body">
          <p class="concept-definition">{{ concept.definition }}</p>

          <div class="concept-location-links">
            <a :href="locationHref(concept.definedIn.documentId, concept.definedIn.anchor)">
              首次定义 · {{ documentFor(concept.definedIn.documentId).displayNumber }}
            </a>
            <a
              v-if="concept.canonicalDocument !== concept.definedIn.documentId"
              :href="withBase(documentFor(concept.canonicalDocument).route)"
            >
              专题页 · {{ documentFor(concept.canonicalDocument).displayNumber }}
            </a>
          </div>

          <div class="concept-relation-block">
            <p class="concept-section-label">已复核使用</p>
            <ul class="concept-usage-list">
              <li v-for="usage in concept.usedIn" :key="usage.usageId">
                <a :href="locationHref(usage.documentId, usage.anchor)">
                  {{ documentFor(usage.documentId).displayNumber }} · {{ usageLabels[usage.usageType] }}
                </a>
                <span>{{ usage.locatorText }}</span>
              </li>
            </ul>
          </div>

          <div v-if="concept.prerequisiteOf.length" class="concept-relation-block">
            <p class="concept-section-label">学习后续</p>
            <p class="concept-chips">
              <span v-for="target in concept.prerequisiteOf" :key="target">{{ conceptTerm(target) }}</span>
            </p>
          </div>

          <div v-if="concept.conflictsWith.length" class="concept-relation-block">
            <p class="concept-section-label">不可混同</p>
            <ul class="concept-conflict-list">
              <li v-for="conflict in concept.conflictsWith" :key="conflict.conceptId">
                <strong>{{ conceptTerm(conflict.conceptId) }} · {{ conflictLabels[conflict.kind] }}</strong>
                <span>{{ conflict.reason }}</span>
              </li>
            </ul>
          </div>

          <div class="concept-relation-block">
            <p class="concept-section-label">相关导航</p>
            <p class="concept-related">{{ concept.related.map(conceptTerm).join(' · ') }}</p>
          </div>
        </div>
      </details>
    </div>
  </section>
</template>
