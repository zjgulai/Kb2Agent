<script setup>
import { computed } from 'vue'
import { PhCheckCircle, PhInfo, PhProhibit, PhWarning } from '@phosphor-icons/vue'

const props = defineProps({
  run: { type: Object, default: null },
  runState: { type: String, required: true }
})

const terminal = computed(() => props.run?.executionReceipt.terminalState ?? 'idle')
const terminalCopy = computed(() => ({
  'needs-approval': ['待具名批准', '本地草案已形成，但尚无领域或产品签署。'],
  'needs-review': ['证据待复核', '证据门禁未关闭，精确行动结论保持阻断。'],
  refused: ['越权请求已拒绝', 'Agent 没有调用写工具、发送工具或外部平台。'],
  failed: ['失败关闭', '输入或执行计划合同错误，未伪造行动包。']
})[terminal.value] ?? ['等待 Replay', '选择案例并运行固定回放。'])
</script>

<template>
  <section class="agent-decision" aria-labelledby="agent-decision-title">
    <header class="agent-decision-header">
      <div>
        <p class="mkd-panel-index">03 / DECISION PACKAGE</p>
        <h2 id="agent-decision-title">{{ terminalCopy[0] }}</h2>
        <p>{{ terminalCopy[1] }}</p>
      </div>
      <span v-if="run" class="agent-terminal-seal" :data-state="terminal">{{ terminal }}</span>
    </header>

    <div v-if="runState !== 'completed'" class="agent-decision-waiting">
      <span>{{ runState === 'running' ? 'REPLAYING CONTRACT' : 'READY FOR LOCAL REPLAY' }}</span>
      <p>{{ runState === 'running' ? '正在依次复放 ExecutionPlan 与工具回执。' : '所有结果均来自预构建的本地合成 bundle。' }}</p>
    </div>

    <template v-else-if="run?.actionPackage">
      <section class="agent-recommendation">
        <p class="mkd-panel-index">RECOMMENDATION</p>
        <h3>{{ run.actionPackage.recommendation }}</h3>
        <p>{{ run.actionPackage.summary }}</p>
      </section>

      <div class="agent-reasoning-grid">
        <section>
          <p class="agent-reasoning-label is-fact"><PhCheckCircle :size="15" weight="fill" aria-hidden="true" /> FACTS</p>
          <ul><li v-for="item in run.actionPackage.facts" :key="item.text"><span>{{ item.text }}</span><code>{{ item.evidenceRefs.join(' · ') }}</code></li></ul>
        </section>
        <section>
          <p class="agent-reasoning-label is-inference"><PhInfo :size="15" aria-hidden="true" /> INFERENCES</p>
          <ul v-if="run.actionPackage.inferences.length"><li v-for="item in run.actionPackage.inferences" :key="item.text"><span>{{ item.text }}</span><code>{{ item.evidenceRefs.join(' · ') }}</code></li></ul>
          <p v-else class="agent-empty-reasoning">门禁未关闭，不生成因果推断。</p>
        </section>
        <section class="is-unknown">
          <p class="agent-reasoning-label"><PhWarning :size="15" aria-hidden="true" /> UNKNOWNS</p>
          <ul><li v-for="item in run.actionPackage.unknowns" :key="item.question"><span>{{ item.question }}</span><small>下一证据：{{ item.nextEvidence }}</small></li></ul>
        </section>
      </div>

      <section class="agent-stop-rule">
        <PhProhibit :size="20" aria-hidden="true" />
        <div><strong>STOP CONDITION</strong><p>{{ run.actionPackage.stopConditions[0] }}</p></div>
      </section>
    </template>

    <section v-else-if="run?.refusalReceipt && runState === 'completed'" class="agent-refusal-card">
      <PhProhibit :size="28" weight="fill" aria-hidden="true" />
      <div>
        <p class="mkd-panel-index">{{ run.refusalReceipt.reasonCode }}</p>
        <h3>{{ run.refusalReceipt.reason }}</h3>
        <p><strong>安全替代：</strong>{{ run.refusalReceipt.safeAlternative }}</p>
      </div>
    </section>

    <section v-else-if="run?.executionReceipt.error && runState === 'completed'" class="agent-failure-card">
      <PhWarning :size="28" weight="fill" aria-hidden="true" />
      <div>
        <p class="mkd-panel-index">{{ run.executionReceipt.error.code }}</p>
        <h3>合同在任何工具或行动生成前失败关闭。</h3>
        <p>{{ run.executionReceipt.error.message }}</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.agent-decision { min-width: 0; padding: clamp(24px, 3vw, 38px); border: 1px solid var(--mkd-line-strong); background: var(--mkd-paper-raised); }
.agent-decision-header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 22px; border-bottom: 1px solid var(--mkd-line); }
.agent-decision-header h2 { margin: 9px 0 0; color: var(--mkd-ink); font: 500 clamp(32px, 4vw, 52px)/1 var(--mkd-font-display); letter-spacing: -.035em; }
.agent-decision-header > div > p:last-child { max-width: 620px; margin: 12px 0 0; color: var(--mkd-body); font-size: 13px; line-height: 1.65; }
.agent-terminal-seal { align-self: flex-start; padding: 8px 10px; border: 1px solid var(--mkd-warning); color: var(--mkd-warning); background: var(--mkd-warning-soft); font: 800 9px var(--mkd-font-mono); letter-spacing: .08em; text-transform: uppercase; }
.agent-terminal-seal[data-state='refused'], .agent-terminal-seal[data-state='failed'] { border-color: var(--mkd-coral); color: var(--mkd-coral); background: var(--mkd-coral-soft); }
.agent-decision-waiting { display: grid; min-height: 360px; place-content: center; text-align: center; }
.agent-decision-waiting span { color: var(--mkd-blue); font: 800 10px var(--mkd-font-mono); letter-spacing: .12em; }
.agent-decision-waiting p { margin: 12px 0 0; color: var(--mkd-muted); }
.agent-recommendation { padding: 30px 0; }
.agent-recommendation h3 { max-width: 780px; margin: 12px 0 0; color: var(--mkd-ink); font: 500 clamp(25px, 3vw, 38px)/1.2 var(--mkd-font-display); }
.agent-recommendation > p:last-child { max-width: 760px; margin: 13px 0 0; color: var(--mkd-body); font-size: 13px; line-height: 1.7; }
.agent-reasoning-grid { display: grid; grid-template-columns: 1fr 1fr; border-block: 1px solid var(--mkd-line); }
.agent-reasoning-grid > section { min-width: 0; padding: 22px 20px 22px 0; }
.agent-reasoning-grid > section:nth-child(2) { padding-left: 20px; border-left: 1px solid var(--mkd-line); }
.agent-reasoning-grid > section.is-unknown { grid-column: 1 / -1; padding-left: 0; border-top: 1px solid var(--mkd-line); }
.agent-reasoning-label { display: flex; gap: 6px; align-items: center; margin: 0; color: var(--mkd-warning); font: 800 9px var(--mkd-font-mono); letter-spacing: .08em; }
.agent-reasoning-label.is-fact { color: var(--mkd-sage); }
.agent-reasoning-label.is-inference { color: var(--mkd-blue); }
.agent-reasoning-grid ul { display: grid; gap: 12px; margin: 14px 0 0; padding: 0; list-style: none; }
.agent-reasoning-grid li span, .agent-reasoning-grid li code, .agent-reasoning-grid li small { display: block; }
.agent-reasoning-grid li span { color: var(--mkd-body); font-size: 12px; line-height: 1.6; }
.agent-reasoning-grid li code, .agent-reasoning-grid li small { margin-top: 5px; color: var(--mkd-muted); font-size: 9px; line-height: 1.45; }
.agent-empty-reasoning { margin: 14px 0 0; color: var(--mkd-muted); font-size: 12px; }
.agent-stop-rule { display: flex; gap: 12px; align-items: flex-start; margin-top: 24px; padding: 18px; color: var(--mkd-coral); background: var(--mkd-coral-soft); }
.agent-stop-rule strong { color: var(--mkd-coral); font: 800 9px var(--mkd-font-mono); letter-spacing: .08em; }
.agent-stop-rule p { margin: 5px 0 0; color: var(--mkd-body); font-size: 12px; line-height: 1.55; }
.agent-refusal-card, .agent-failure-card { display: flex; min-height: 360px; align-items: center; gap: 20px; padding: 36px; color: var(--mkd-coral); background: var(--mkd-coral-soft); }
.agent-refusal-card h3, .agent-failure-card h3 { max-width: 700px; margin: 10px 0 0; color: var(--mkd-ink); font: 500 30px/1.25 var(--mkd-font-display); }
.agent-refusal-card div > p:last-child, .agent-failure-card div > p:last-child { margin: 14px 0 0; color: var(--mkd-body); font-size: 13px; line-height: 1.7; }
@media (max-width: 700px) { .agent-decision-header { display: block; } .agent-terminal-seal { display: inline-block; margin-top: 16px; } .agent-reasoning-grid { grid-template-columns: 1fr; } .agent-reasoning-grid > section:nth-child(2) { padding-left: 0; border-top: 1px solid var(--mkd-line); border-left: 0; } }
</style>
