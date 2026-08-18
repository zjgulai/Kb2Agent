<script setup>
import { computed } from 'vue'
import { PhCheckCircle, PhCircleDashed, PhClock, PhProhibit, PhWarning } from '@phosphor-icons/vue'

const props = defineProps({
  run: { type: Object, default: null },
  runState: { type: String, required: true },
  activeStep: { type: Number, required: true }
})

const receipts = computed(() => new Map((props.run?.toolCallReceipts ?? []).map((item) => [item.planStepId, item])))

function stateFor(step, index) {
  if (props.runState === 'idle' || props.runState === 'loading') return 'pending'
  if (props.runState === 'running') return index < props.activeStep ? (receipts.value.get(step.stepId)?.status ?? 'completed') : index === props.activeStep ? 'active' : 'pending'
  const receipt = receipts.value.get(step.stepId)
  if (receipt) return receipt.status
  if (props.run?.executionReceipt.reasonCode === 'PLAN_TOOL_NOT_ALLOWED' && step.toolId.includes('UNKNOWN')) return 'failed'
  return 'skipped'
}
</script>

<template>
  <section class="agent-spine" aria-labelledby="agent-spine-title">
    <header>
      <p class="mkd-panel-index">02 / EXECUTION PLAN</p>
      <h2 id="agent-spine-title">工具调用脊柱</h2>
      <p>这里呈现构建产物中的真实 plan 与 receipts；动画只复放顺序。</p>
    </header>

    <ol v-if="run?.executionPlan.steps.length">
      <li v-for="(step, index) in run.executionPlan.steps" :key="step.stepId" :data-state="stateFor(step, index)">
        <span class="agent-spine-marker">
          <PhCheckCircle v-if="stateFor(step, index) === 'completed'" :size="18" weight="fill" aria-hidden="true" />
          <PhClock v-else-if="stateFor(step, index) === 'active'" :size="18" aria-hidden="true" />
          <PhProhibit v-else-if="['blocked', 'skipped'].includes(stateFor(step, index))" :size="18" aria-hidden="true" />
          <PhWarning v-else-if="stateFor(step, index) === 'failed'" :size="18" weight="fill" aria-hidden="true" />
          <PhCircleDashed v-else :size="18" aria-hidden="true" />
        </span>
        <span class="agent-spine-order">{{ String(step.order).padStart(2, '0') }}</span>
        <span><strong>{{ step.toolId.replace('TOOL-', '') }}</strong><small>{{ step.purpose }}</small></span>
        <code>{{ stateFor(step, index) }}</code>
      </li>
    </ol>
    <div v-else class="agent-schema-stop">
      <PhWarning :size="22" aria-hidden="true" />
      <div><strong>Schema gate 先于工具执行</strong><p>必要字段缺失，计划保持空数组，工具调用为 0。</p></div>
    </div>
  </section>
</template>

<style scoped>
.agent-spine { min-width: 0; padding: 24px 18px; border-block: 1px solid var(--mkd-line-strong); background: color-mix(in srgb, var(--mkd-paper-muted) 68%, transparent); }
.agent-spine header { padding: 0 8px 18px; }
.agent-spine h2 { margin: 7px 0 0; color: var(--mkd-ink); font: 500 25px/1.15 var(--mkd-font-display); }
.agent-spine header > p:last-child { margin: 8px 0 0; color: var(--mkd-muted); font-size: 11px; line-height: 1.55; }
.agent-spine ol { position: relative; display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.agent-spine ol::before { position: absolute; top: 24px; bottom: 24px; left: 18px; width: 1px; background: var(--mkd-line-strong); content: ''; }
.agent-spine li { position: relative; display: grid; min-height: 58px; grid-template-columns: 28px 24px 1fr; gap: 7px; align-items: center; padding: 8px; color: var(--mkd-muted); background: var(--mkd-paper); }
.agent-spine li > code { grid-column: 3; justify-self: start; padding: 2px 5px; color: inherit; background: var(--mkd-paper-muted); font-size: 8px; }
.agent-spine-marker { z-index: 1; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; color: var(--mkd-line-strong); background: var(--mkd-paper); }
.agent-spine-order { font: 700 9px var(--mkd-font-mono); }
.agent-spine strong, .agent-spine small { display: block; }
.agent-spine strong { color: var(--mkd-ink); font: 800 10px var(--mkd-font-mono); letter-spacing: .02em; }
.agent-spine small { margin-top: 3px; font-size: 10px; line-height: 1.35; }
.agent-spine li[data-state='completed'] .agent-spine-marker { color: var(--mkd-sage); }
.agent-spine li[data-state='active'] { background: var(--mkd-blue-soft); }
.agent-spine li[data-state='active'] .agent-spine-marker { color: var(--mkd-blue); }
.agent-spine li[data-state='blocked'] .agent-spine-marker, .agent-spine li[data-state='skipped'] .agent-spine-marker { color: var(--mkd-warning); }
.agent-spine li[data-state='failed'] .agent-spine-marker { color: var(--mkd-coral); }
.agent-schema-stop { display: flex; min-height: 170px; align-items: center; gap: 12px; padding: 20px; color: var(--mkd-coral); background: var(--mkd-coral-soft); }
.agent-schema-stop strong { color: var(--mkd-ink); }
.agent-schema-stop p { margin: 5px 0 0; color: var(--mkd-body); font-size: 12px; line-height: 1.55; }
</style>
