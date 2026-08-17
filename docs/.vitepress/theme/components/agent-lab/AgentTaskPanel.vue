<script setup>
import { computed, shallowRef } from 'vue'
import { PhLockKey, PhPlay, PhShieldCheck } from '@phosphor-icons/vue'

const props = defineProps({
  cases: { type: Array, required: true },
  selectedId: { type: String, required: true },
  runState: { type: String, required: true }
})
const emit = defineEmits(['selectCase', 'run'])
const category = shallowRef('all')

const categories = [
  ['all', '全部', 20],
  ['normal', '正常', 8],
  ['missing', '缺失', 4],
  ['conflict', '冲突', 3],
  ['unauthorized', '越权', 3],
  ['fault', '故障', 2]
]
const visibleCases = computed(() => category.value === 'all'
  ? props.cases
  : props.cases.filter((item) => item.fixture.category === category.value))
const selected = computed(() => props.cases.find((item) => item.fixture.fixtureId === props.selectedId))

function terminalLabel(state) {
  return ({
    'needs-approval': '待批准',
    'needs-review': '待复核',
    refused: '已拒绝',
    failed: '失败关闭'
  })[state] || state
}
</script>

<template>
  <section class="agent-task-panel" aria-labelledby="agent-task-title">
    <header class="agent-panel-heading">
      <div>
        <p class="mkd-panel-index">01 / TASK PACKAGE</p>
        <h2 id="agent-task-title">选择门禁案例</h2>
      </div>
      <span class="agent-local-stamp"><PhShieldCheck :size="14" weight="fill" aria-hidden="true" /> LOCAL</span>
    </header>

    <div class="agent-category-tabs" aria-label="案例分类">
      <button
        v-for="item in categories"
        :key="item[0]"
        type="button"
        :aria-pressed="category === item[0]"
        @click="category = item[0]"
      >
        {{ item[1] }} <span>{{ item[2] }}</span>
      </button>
    </div>

    <div class="agent-case-list" role="listbox" aria-label="G6 合成案例">
      <button
        v-for="item in visibleCases"
        :key="item.fixture.fixtureId"
        type="button"
        role="option"
        :aria-selected="selectedId === item.fixture.fixtureId"
        :disabled="runState === 'running'"
        @click="emit('selectCase', item.fixture.fixtureId)"
      >
        <span>{{ item.fixture.fixtureId.replace('G6-', '') }}</span>
        <strong>{{ item.fixture.label }}</strong>
        <small :data-state="item.executionReceipt.terminalState">{{ terminalLabel(item.executionReceipt.terminalState) }}</small>
      </button>
    </div>

    <div v-if="selected" class="agent-task-contract">
      <p>当前输入合同</p>
      <code>{{ selected.fixture.input.caseId || 'missing caseId' }}</code>
      <dl>
        <div><dt>WINDOW</dt><dd>{{ selected.fixture.input.comparisonWindow || 'missing' }}</dd></div>
        <div><dt>GRADE</dt><dd>LO-S</dd></div>
        <div><dt>MODE</dt><dd>Replay</dd></div>
      </dl>
    </div>

    <button class="mkd-button mkd-button-primary agent-run-button" type="button" :disabled="runState === 'running' || !selected" @click="emit('run')">
      <PhPlay :size="17" weight="fill" aria-hidden="true" />
      {{ runState === 'running' ? '正在回放合同…' : runState === 'completed' ? '重新运行 Replay' : '运行确定性 Replay' }}
    </button>
    <p class="agent-locked-note"><PhLockKey :size="14" aria-hidden="true" /> Live、自由文本、文件上传与外部写入均锁定。</p>
  </section>
</template>

<style scoped>
.agent-task-panel { min-width: 0; padding: 24px; border: 1px solid var(--mkd-line-strong); background: var(--mkd-paper-raised); }
.agent-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.agent-panel-heading h2 { margin: 7px 0 0; color: var(--mkd-ink); font: 500 26px/1.15 var(--mkd-font-display); }
.agent-local-stamp { display: inline-flex; min-height: 28px; align-items: center; gap: 5px; padding: 0 9px; border: 1px solid color-mix(in srgb, var(--mkd-sage) 45%, var(--mkd-line)); color: var(--mkd-sage); background: var(--mkd-sage-soft); font: 800 9px var(--mkd-font-mono); letter-spacing: .1em; }
.agent-category-tabs { display: flex; gap: 5px; margin: 22px 0 14px; overflow-x: auto; }
.agent-category-tabs button { min-height: 44px; flex: 0 0 auto; padding: 0 10px; border: 1px solid var(--mkd-line); color: var(--mkd-muted); background: transparent; font: 700 11px var(--mkd-font-sans); cursor: pointer; }
.agent-category-tabs button[aria-pressed='true'] { border-color: var(--mkd-blue); color: var(--mkd-blue); background: var(--mkd-blue-soft); }
.agent-category-tabs span { margin-left: 3px; font-family: var(--mkd-font-mono); }
.agent-case-list { display: grid; max-height: 336px; gap: 1px; overflow-y: auto; background: var(--mkd-line); }
.agent-case-list button { display: grid; min-height: 58px; grid-template-columns: 64px 1fr auto; gap: 9px; align-items: center; padding: 9px 11px; border: 0; color: var(--mkd-body); text-align: left; background: var(--mkd-paper); cursor: pointer; }
.agent-case-list button[aria-selected='true'] { color: var(--mkd-ink); background: color-mix(in srgb, var(--mkd-blue-soft) 58%, var(--mkd-paper)); box-shadow: inset 3px 0 var(--mkd-blue); }
.agent-case-list button > span { color: var(--mkd-muted); font: 700 9px var(--mkd-font-mono); }
.agent-case-list strong { font-size: 12px; line-height: 1.35; }
.agent-case-list small { padding: 4px 6px; color: var(--mkd-warning); background: var(--mkd-warning-soft); font: 700 9px var(--mkd-font-mono); }
.agent-case-list small[data-state='refused'], .agent-case-list small[data-state='failed'] { color: #8d3e2e; background: var(--mkd-coral-soft); }
.agent-task-contract { margin-top: 16px; padding: 14px; border-left: 2px solid var(--mkd-blue); background: var(--mkd-paper-muted); }
.agent-task-contract p { margin: 0 0 7px; color: var(--mkd-muted); font: 800 9px var(--mkd-font-mono); letter-spacing: .08em; }
.agent-task-contract code { display: block; overflow: hidden; color: var(--mkd-ink); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.agent-task-contract dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 0; }
.agent-task-contract dt { color: var(--mkd-muted); font: 700 8px var(--mkd-font-mono); }
.agent-task-contract dd { margin: 3px 0 0; color: var(--mkd-ink); font: 700 10px var(--mkd-font-mono); }
.agent-run-button { width: 100%; margin-top: 16px; }
.agent-locked-note { display: flex; gap: 6px; align-items: flex-start; margin: 11px 0 0; color: var(--mkd-muted); font-size: 11px; line-height: 1.5; }
@media (max-width: 520px) { .agent-task-panel { padding: 18px; } .agent-case-list button { grid-template-columns: 58px 1fr; } .agent-case-list small { grid-column: 2; justify-self: start; } }
</style>
