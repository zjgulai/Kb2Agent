<script setup>
import { PhCaretDown, PhFingerprint, PhLockKey, PhReceipt } from '@phosphor-icons/vue'

defineProps({
  run: { type: Object, default: null },
  bundle: { type: Object, default: null },
  bundleUrl: { type: String, required: true }
})

function shortHash(value) {
  return value ? `${value.slice(0, 17)}…${value.slice(-8)}` : '—'
}
</script>

<template>
  <section class="agent-evidence" aria-labelledby="agent-evidence-title">
    <header>
      <div><p class="mkd-panel-index">04 / EVIDENCE & RECEIPTS</p><h2 id="agent-evidence-title">审计抽屉</h2></div>
      <a :href="bundleUrl" download>下载完整 bundle</a>
    </header>

    <details open>
      <summary><span><PhReceipt :size="17" aria-hidden="true" /> Execution receipt</span><PhCaretDown :size="16" aria-hidden="true" /></summary>
      <dl v-if="run">
        <div><dt>RUN</dt><dd>{{ run.executionReceipt.runId }}</dd></div>
        <div><dt>TERMINAL</dt><dd>{{ run.executionReceipt.terminalState }}</dd></div>
        <div><dt>REASON</dt><dd>{{ run.executionReceipt.reasonCode }}</dd></div>
        <div><dt>TOOLS</dt><dd>{{ run.toolCallReceipts.length }} / 8</dd></div>
        <div><dt>CALLS</dt><dd>{{ run.executionReceipt.externalCalls }}</dd></div>
        <div><dt>EFFECTS</dt><dd>{{ run.executionReceipt.sideEffects }}</dd></div>
      </dl>
    </details>

    <details v-if="run?.approvalDecision" data-section="approval">
      <summary>
        <span><PhLockKey :size="17" aria-hidden="true" /> Approval decision</span>
        <span class="agent-summary-meta">accepted {{ run.approvalDecision.acceptedRoles.length }} / {{ run.approvalDecision.requiredRoles.length }}</span>
        <PhCaretDown :size="16" aria-hidden="true" />
      </summary>
      <div class="agent-decision-evidence">
        <div class="agent-evidence-id-row">
          <span :data-state="run.approvalDecision.state">{{ run.approvalDecision.state }}</span>
          <code>{{ run.approvalDecision.decisionId }}</code>
        </div>
        <p>{{ run.approvalDecision.reason }}</p>
        <div class="agent-role-columns">
          <section>
            <h3>Required roles</h3>
            <ul>
              <li v-for="role in run.approvalDecision.requiredRoles" :key="role"><code>{{ role }}</code></li>
            </ul>
          </section>
          <section>
            <h3>Accepted roles</h3>
            <p>{{ run.approvalDecision.acceptedRoles.length ? run.approvalDecision.acceptedRoles.join(' · ') : 'None — approval remains pending.' }}</p>
          </section>
        </div>
      </div>
    </details>

    <details v-if="run?.refusalReceipt" data-section="refusal">
      <summary><span><PhLockKey :size="17" aria-hidden="true" /> Refusal receipt</span><PhCaretDown :size="16" aria-hidden="true" /></summary>
      <div class="agent-decision-evidence agent-refusal-evidence">
        <div class="agent-evidence-id-row">
          <span data-state="refused">{{ run.refusalReceipt.reasonCode }}</span>
          <code>{{ run.refusalReceipt.refusalId }}</code>
        </div>
        <p>{{ run.refusalReceipt.reason }}</p>
        <p class="agent-full-hash"><span>requestHash</span><code>{{ run.refusalReceipt.requestHash }}</code></p>
        <p class="agent-safe-alternative"><span>安全替代</span>{{ run.refusalReceipt.safeAlternative }}</p>
      </div>
    </details>

    <details v-if="run?.toolCallReceipts?.length" data-section="tool-receipts">
      <summary>
        <span><PhReceipt :size="17" aria-hidden="true" /> Tool call receipts</span>
        <span class="agent-summary-meta">{{ run.toolCallReceipts.length }} receipts</span>
        <PhCaretDown :size="16" aria-hidden="true" />
      </summary>
      <ol class="agent-tool-receipts">
        <li v-for="(receipt, index) in run.toolCallReceipts" :key="receipt.callId">
          <details class="agent-tool-receipt" :open="index === 0">
            <summary>
              <span><code>{{ String(index + 1).padStart(2, '0') }}</code>{{ receipt.toolId }}</span>
              <span class="agent-tool-state" :data-state="receipt.status">{{ receipt.status }}</span>
              <PhCaretDown :size="14" aria-hidden="true" />
            </summary>
            <div class="agent-tool-receipt-body">
              <p><span>callId</span><code>{{ receipt.callId }}</code></p>
              <p><span>planStepId</span><code>{{ receipt.planStepId }}</code></p>
              <p><span>inputHash</span><code>{{ receipt.inputHash }}</code></p>
              <p><span>outputHash</span><code>{{ receipt.outputHash }}</code></p>
              <p v-if="receipt.errorCode"><span>errorCode</span><code>{{ receipt.errorCode }}</code></p>
              <small>effects {{ receipt.sideEffects }} · calls {{ receipt.externalCalls }}</small>
            </div>
          </details>
        </li>
      </ol>
    </details>

    <details>
      <summary><span><PhFingerprint :size="17" aria-hidden="true" /> Artifact hashes</span><PhCaretDown :size="16" aria-hidden="true" /></summary>
      <ul v-if="run" class="agent-hash-list">
        <li v-for="(value, key) in run.executionReceipt.artifactHashes" :key="key"><span>{{ key }}</span><code>{{ shortHash(value) }}</code></li>
      </ul>
    </details>

    <details>
      <summary><span><PhLockKey :size="17" aria-hidden="true" /> Capability boundary</span><PhCaretDown :size="16" aria-hidden="true" /></summary>
      <div v-if="bundle" class="agent-boundary-grid">
        <article><span>MODE</span><strong>{{ bundle.mode }}</strong></article>
        <article><span>TOOLS</span><strong>{{ bundle.capabilityManifest.tools.length }}</strong></article>
        <article><span>PROVIDER</span><strong>0</strong></article>
        <article><span>WRITES</span><strong>0</strong></article>
        <p>{{ bundle.capabilityManifest.prohibitedCapabilities.join(' · ') }}</p>
      </div>
    </details>
  </section>
</template>

<style scoped>
.agent-evidence { border: 1px solid var(--mkd-line-strong); background: var(--mkd-paper-raised); }
.agent-evidence > header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 24px 28px; }
.agent-evidence h2 { margin: 7px 0 0; color: var(--mkd-ink); font: 500 27px/1.1 var(--mkd-font-display); }
.agent-evidence > header a { color: var(--mkd-blue); font-size: 12px; font-weight: 750; }
.agent-evidence details { border-top: 1px solid var(--mkd-line); }
.agent-evidence summary { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 28px; color: var(--mkd-ink); cursor: pointer; list-style: none; }
.agent-evidence summary::-webkit-details-marker { display: none; }
.agent-evidence summary span { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 750; }
.agent-evidence summary .agent-summary-meta { margin-left: auto; color: var(--mkd-muted); font: 700 9px var(--mkd-font-mono); letter-spacing: .04em; }
.agent-evidence details[open] summary > svg { transform: rotate(180deg); }
.agent-evidence dl { display: grid; grid-template-columns: repeat(6, 1fr); margin: 0; border-top: 1px solid var(--mkd-line); }
.agent-evidence dl div { min-width: 0; padding: 16px; border-right: 1px solid var(--mkd-line); }
.agent-evidence dl div:last-child { border-right: 0; }
.agent-evidence dt, .agent-boundary-grid span { color: var(--mkd-muted); font: 700 8px var(--mkd-font-mono); letter-spacing: .08em; }
.agent-evidence dd { overflow: hidden; margin: 6px 0 0; color: var(--mkd-ink); font: 700 10px var(--mkd-font-mono); text-overflow: ellipsis; white-space: nowrap; }
.agent-hash-list { display: grid; margin: 0; padding: 0 28px 18px; list-style: none; }
.agent-hash-list li { display: flex; min-width: 0; justify-content: space-between; gap: 18px; padding: 10px 0; border-top: 1px dotted var(--mkd-line); }
.agent-hash-list span { color: var(--mkd-body); font-size: 11px; }
.agent-hash-list code { overflow: hidden; color: var(--mkd-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.agent-decision-evidence { padding: 0 28px 22px; border-top: 1px solid var(--mkd-line); }
.agent-evidence-id-row { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0 12px; }
.agent-evidence-id-row > span { flex: 0 0 auto; padding: 5px 7px; color: var(--mkd-warning); background: var(--mkd-warning-soft); font: 750 9px var(--mkd-font-mono); }
.agent-evidence-id-row > span[data-state='refused'] { color: #8d3e2e; background: var(--mkd-coral-soft); }
.agent-evidence-id-row > code { overflow-wrap: anywhere; color: var(--mkd-ink); font-size: 10px; }
.agent-decision-evidence > p { margin: 0; color: var(--mkd-body); font-size: 11px; line-height: 1.65; }
.agent-role-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.agent-role-columns section { min-width: 0; padding: 14px; border: 1px solid var(--mkd-line); background: var(--mkd-paper-muted); }
.agent-role-columns h3 { margin: 0 0 9px; color: var(--mkd-muted); font: 750 9px var(--mkd-font-mono); letter-spacing: .06em; text-transform: uppercase; }
.agent-role-columns ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.agent-role-columns code { overflow-wrap: anywhere; color: var(--mkd-ink); font-size: 10px; }
.agent-role-columns p { margin: 0; color: var(--mkd-muted); font-size: 10px; line-height: 1.55; }
.agent-refusal-evidence { border-left: 3px solid #8d3e2e; }
.agent-full-hash, .agent-safe-alternative { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 12px; margin-top: 14px !important; padding-top: 12px; border-top: 1px dotted var(--mkd-line); }
.agent-full-hash span, .agent-safe-alternative span { color: var(--mkd-muted); font: 750 9px var(--mkd-font-mono); }
.agent-full-hash code { overflow-wrap: anywhere; color: var(--mkd-ink); font-size: 9px; }
.agent-tool-receipts { display: grid; gap: 8px; margin: 0; padding: 0 28px 22px; border-top: 1px solid var(--mkd-line); list-style: none; }
.agent-tool-receipts > li:first-child { padding-top: 16px; }
.agent-evidence .agent-tool-receipt { border: 1px solid var(--mkd-line); background: var(--mkd-paper); }
.agent-evidence .agent-tool-receipt > summary { min-height: 48px; padding: 0 14px; }
.agent-evidence .agent-tool-receipt > summary > span:first-child { min-width: 0; overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.agent-evidence .agent-tool-receipt > summary code { color: var(--mkd-muted); font-size: 9px; }
.agent-tool-state { margin-left: auto; padding: 4px 6px; color: var(--mkd-sage); background: var(--mkd-sage-soft); font: 750 8px var(--mkd-font-mono) !important; }
.agent-tool-state[data-state='blocked'], .agent-tool-state[data-state='skipped'] { color: var(--mkd-warning); background: var(--mkd-warning-soft); }
.agent-tool-state[data-state='failed'] { color: #8d3e2e; background: var(--mkd-coral-soft); }
.agent-tool-receipt-body { display: grid; gap: 8px; padding: 12px 14px 14px; border-top: 1px dotted var(--mkd-line); }
.agent-tool-receipt-body p { display: grid; min-width: 0; grid-template-columns: 86px minmax(0, 1fr); gap: 10px; margin: 0; }
.agent-tool-receipt-body p > span { color: var(--mkd-muted); font: 700 8px var(--mkd-font-mono); }
.agent-tool-receipt-body p > code { overflow-wrap: anywhere; color: var(--mkd-ink); font-size: 9px; }
.agent-tool-receipt-body small { color: var(--mkd-muted); font: 700 9px var(--mkd-font-mono); text-align: right; }
.agent-boundary-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 0 28px 20px; }
.agent-boundary-grid article { padding: 16px; border: 1px solid var(--mkd-line); border-right: 0; }
.agent-boundary-grid article:nth-child(4) { border-right: 1px solid var(--mkd-line); }
.agent-boundary-grid strong { display: block; margin-top: 7px; color: var(--mkd-ink); font: 700 13px var(--mkd-font-mono); }
.agent-boundary-grid p { grid-column: 1 / -1; margin: 12px 0 0; color: var(--mkd-muted); font-size: 11px; line-height: 1.65; }
@media (max-width: 800px) { .agent-evidence dl { grid-template-columns: repeat(3, 1fr); } .agent-evidence dl div:nth-child(3) { border-right: 0; } }
@media (max-width: 520px) { .agent-evidence > header { display: block; padding: 20px; } .agent-evidence > header a { display: inline-block; margin-top: 14px; } .agent-evidence summary { padding-inline: 20px; } .agent-evidence summary .agent-summary-meta { display: none; } .agent-evidence dl { grid-template-columns: 1fr 1fr; } .agent-evidence dl div:nth-child(3) { border-right: 1px solid var(--mkd-line); } .agent-evidence dl div:nth-child(even) { border-right: 0; } .agent-decision-evidence, .agent-tool-receipts { padding-inline: 20px; } .agent-role-columns { grid-template-columns: 1fr; } .agent-evidence-id-row { align-items: flex-start; flex-direction: column; gap: 8px; } .agent-full-hash, .agent-safe-alternative, .agent-tool-receipt-body p { grid-template-columns: 1fr; gap: 5px; } .agent-boundary-grid { grid-template-columns: 1fr 1fr; padding-inline: 20px; } .agent-boundary-grid article:nth-child(2) { border-right: 1px solid var(--mkd-line); } }
</style>
