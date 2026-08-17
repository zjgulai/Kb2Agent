<script setup>
import { onMounted, shallowRef } from 'vue'
import { withBase } from 'vitepress'
import {
  PhArrowLeft,
  PhCaretDown,
  PhCheckCircle,
  PhCode,
  PhDownloadSimple,
  PhInfo,
  PhWarning
} from '@phosphor-icons/vue'
import {
  labManifest,
  localizeReplayActionPackage,
  replayPresentation,
  replayResult
} from '../../../reference-lab-fixture.mjs'

const actionPackage = shallowRef(localizeReplayActionPackage())
const receipt = shallowRef({ receiptId: replayResult.receiptId, externalCalls: 0, sideEffects: 0, model: { id: 'deterministic-rule-engine' } })
const traceEntries = shallowRef(replayResult.trace)
const artifactError = shallowRef('')
const artifactRoot = withBase('/reference/m1b/runs/RUN-AMZ-M1B-001')

onMounted(async () => {
  try {
    const response = await fetch(`${artifactRoot}/replay-bundle.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bundle = await response.json()
    actionPackage.value = localizeReplayActionPackage(bundle.actionPackage)
    receipt.value = bundle.receipt
    traceEntries.value = bundle.trace.events.map((item) => ({
      stage: item.stage,
      event: item.kind,
      duration: `${item.durationMs} ms`,
      output: item.outputRefs.join(', ') || item.status
    }))
  } catch (error) {
    artifactError.value = `导出读取失败：${error.message}`
  }
})
</script>

<template>
  <main class="mkd-result-shell">
    <a class="mkd-back-link" :href="withBase('/lab/')"><PhArrowLeft :size="16" aria-hidden="true" /> 返回 Reference Lab</a>

    <header class="mkd-result-header">
      <div>
        <p class="mkd-overline">DECISION ACTION PACKAGE · REPLAY</p>
        <h1>{{ replayPresentation.headlineLead }}<em>{{ replayPresentation.headlineEmphasis }}</em></h1>
        <p>{{ actionPackage.summary }}</p>
      </div>
      <dl>
        <div><dt>RUN</dt><dd>{{ replayResult.runId }}</dd></div>
        <div><dt>SNAPSHOT</dt><dd>{{ labManifest.snapshotVersion }}</dd></div>
        <div><dt>GRADE</dt><dd>LO-S</dd></div>
        <div><dt>SIDE EFFECTS</dt><dd>{{ receipt.sideEffects }}</dd></div>
      </dl>
    </header>

    <div class="mkd-result-boundary">
      <PhWarning :size="18" aria-hidden="true" />
      <p><strong>M1-B 本地参考实现</strong>本页读取构建产出的真实 JSON 回放；数据仍为合成 fixture，没有真实广告账户、模型调用、领域批准或外部写入。</p>
    </div>

    <div class="mkd-result-layout">
      <article class="mkd-action-package">
        <section class="mkd-recommendation">
          <p class="mkd-panel-index">RECOMMENDATION</p>
          <h2>{{ actionPackage.recommendation }}</h2>
          <p>状态：<strong>{{ actionPackage.status }}</strong> · 需要 Amazon Ads 领域复核与产品批准。</p>
        </section>

        <div class="mkd-reasoning-grid">
          <section>
            <p class="mkd-panel-index is-fact">FACTS · 事实</p>
            <ul><li v-for="item in actionPackage.facts" :key="item.text"><PhCheckCircle :size="17" weight="fill" aria-hidden="true" /><span>{{ item.text }}<code>{{ item.evidenceRefs.join(' · ') }}</code></span></li></ul>
          </section>
          <section>
            <p class="mkd-panel-index is-inference">INFERENCES · 推断</p>
            <ul><li v-for="item in actionPackage.inferences" :key="item.text"><PhInfo :size="17" aria-hidden="true" /><span>{{ item.text }}<code>{{ item.evidenceRefs.join(' · ') }}</code></span></li></ul>
          </section>
          <section class="is-unknown">
            <p class="mkd-panel-index">UNKNOWNS · 未知</p>
            <ul><li v-for="item in actionPackage.unknowns" :key="item.question"><PhWarning :size="17" aria-hidden="true" /><span>{{ item.question }}<small>下一证据：{{ item.nextEvidence }}</small></span></li></ul>
          </section>
        </div>

        <section class="mkd-stop-card">
          <p class="mkd-panel-index">STOP CONDITIONS</p>
          <h2>以下任一条件存在时，Agent 必须停止。</h2>
          <ol><li v-for="condition in actionPackage.stopConditions" :key="condition">{{ condition }}</li></ol>
        </section>
      </article>

      <aside class="mkd-result-rail">
        <section>
          <p class="mkd-panel-index">APPROVAL</p>
          <h2>0 / 4 已接受</h2>
          <p>M1-B 输出未携带具名签署回执。本结果不是 accepted。</p>
        </section>
        <section>
          <p class="mkd-panel-index">RECEIPT</p>
          <dl>
            <div><dt>ID</dt><dd>{{ receipt.receiptId }}</dd></div>
            <div><dt>MODEL</dt><dd>{{ receipt.model.id }}</dd></div>
            <div><dt>CALLS</dt><dd>{{ receipt.externalCalls }}</dd></div>
            <div><dt>EFFECTS</dt><dd>{{ receipt.sideEffects }}</dd></div>
          </dl>
        </section>
        <a class="mkd-button mkd-button-secondary" :href="`${artifactRoot}/action-package.json`" download><PhDownloadSimple :size="17" aria-hidden="true" /> ActionPackage.json</a>
        <a class="mkd-button mkd-button-secondary" :href="`${artifactRoot}/receipt.json`" download><PhDownloadSimple :size="17" aria-hidden="true" /> Receipt.json</a>
        <a class="mkd-button mkd-button-secondary" :href="`${artifactRoot}/report.md`" download><PhDownloadSimple :size="17" aria-hidden="true" /> Report.md</a>
        <p v-if="artifactError" class="mkd-export-note" role="alert">{{ artifactError }}</p>
      </aside>
    </div>

    <section class="mkd-engineering-evidence" aria-labelledby="engineering-title">
      <header><p class="mkd-overline">ENGINEERING EVIDENCE</p><h2 id="engineering-title">按需展开，不让 Trace 淹没决策。</h2></header>
      <details>
        <summary><span>Evidence & source locator</span><PhCaretDown :size="17" aria-hidden="true" /></summary>
        <div class="mkd-evidence-table" role="table" aria-label="证据定位">
          <div v-for="item in replayResult.evidence" :key="item.id" role="row">
            <code role="cell">{{ item.id }}</code><span role="cell">{{ item.source }}</span><span role="cell">{{ item.locator }}</span><strong role="cell">{{ item.grade }}</strong>
          </div>
        </div>
      </details>
      <details>
        <summary><span>Tool trace timeline</span><PhCaretDown :size="17" aria-hidden="true" /></summary>
        <ol class="mkd-trace-list"><li v-for="(item, index) in traceEntries" :key="`${item.stage}-${index}`"><code>{{ item.duration }}</code><div><strong>{{ item.stage }}</strong><span>{{ item.event }} → {{ item.output }}</span></div></li></ol>
      </details>
      <details>
        <summary><span>Evaluation result</span><PhCaretDown :size="17" aria-hidden="true" /></summary>
        <div class="mkd-eval-grid"><div v-for="item in replayResult.evaluation" :key="item.label" :data-state="item.state"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div></div>
      </details>
      <details>
        <summary><span>Object closure</span><PhCaretDown :size="17" aria-hidden="true" /></summary>
        <p class="mkd-closure-text"><PhCode :size="17" aria-hidden="true" /> Claim → Metric → DecisionModel → Playbook → Skill → TaskPackage，最大深度 3，最多 24 个对象。</p>
      </details>
    </section>
  </main>
</template>
