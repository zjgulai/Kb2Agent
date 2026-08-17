<script setup>
import { computed, nextTick, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { withBase } from 'vitepress'
import {
  PhArrowRight,
  PhCheckCircle,
  PhCircleDashed,
  PhClock,
  PhFileText,
  PhLockKey,
  PhPlay,
  PhShieldCheck,
  PhWarning
} from '@phosphor-icons/vue'
import { labManifest, pipelineStages, replayPresentation, replayResult } from '../../../reference-lab-fixture.mjs'

const runState = shallowRef('idle')
const activeStage = shallowRef(-1)
const comparisonWindow = shallowRef('7d-vs-7d')
const announcement = shallowRef('固定 Replay 已就绪。')
const completion = useTemplateRef('completion')
const replayBundle = shallowRef(null)
const loadError = shallowRef('')
const timers = []

const completedCount = computed(() => runState.value === 'completed' ? pipelineStages.length : Math.max(0, activeStage.value))

function stageState(index) {
  if (runState.value === 'completed' || index < activeStage.value) return 'complete'
  if (index === activeStage.value) return 'active'
  return 'pending'
}

async function runReplay() {
  if (runState.value === 'running') return
  loadError.value = ''
  try {
    const response = await fetch(withBase('/reference/m1b/runs/RUN-AMZ-M1B-001/replay-bundle.json'))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    replayBundle.value = await response.json()
  } catch (error) {
    loadError.value = `无法读取本地 replay bundle：${error.message}`
    announcement.value = loadError.value
    return
  }
  runState.value = 'running'
  activeStage.value = 0
  announcement.value = `Replay 开始：${pipelineStages[0].label}`
  pipelineStages.forEach((stage, index) => {
    const timer = window.setTimeout(async () => {
      if (index < pipelineStages.length - 1) {
        activeStage.value = index + 1
        announcement.value = `已完成 ${stage.label}，正在执行 ${pipelineStages[index + 1].label}`
      } else {
        runState.value = 'completed'
        activeStage.value = pipelineStages.length
        announcement.value = 'Replay 已完成：外部调用 0，外部副作用 0。'
        await nextTick()
        completion.value?.focus()
      }
    }, 260 + index * 180)
    timers.push(timer)
  })
}

onBeforeUnmount(() => timers.forEach((timer) => window.clearTimeout(timer)))
</script>

<template>
  <main class="mkd-lab-shell">
    <header class="mkd-lab-header">
      <div>
        <p class="mkd-overline">REFERENCE LAB · M1-B LOCAL REFERENCE</p>
        <h1>Amazon Ads<br><em>Knowledge Compiler</em></h1>
        <p>读取本地构建导出的真实 replay bundle，复放从来源到行动包的完整合同。无模型、平台或外部 API 调用。</p>
      </div>
      <dl class="mkd-lab-identity">
        <div><dt>CASE</dt><dd>{{ labManifest.caseId }}</dd></div>
        <div><dt>SNAPSHOT</dt><dd>{{ labManifest.snapshotVersion }}</dd></div>
        <div><dt>EVIDENCE</dt><dd>{{ labManifest.evidenceGrade }}</dd></div>
      </dl>
    </header>

    <div class="mkd-lab-statusbar" aria-label="原型状态">
      <span><PhShieldCheck :size="15" weight="fill" aria-hidden="true" /> Replay baseline</span>
      <span><PhWarning :size="15" aria-hidden="true" /> synthetic only</span>
      <span><PhLockKey :size="15" aria-hidden="true" /> no upload · no free text</span>
    </div>

    <div class="mkd-lab-grid">
      <section class="mkd-lab-control" aria-labelledby="lab-control-title">
        <p class="mkd-panel-index">01 / TASK CONTRACT</p>
        <h2 id="lab-control-title">选择固定任务</h2>

        <label class="mkd-field">
          <span>案例</span>
          <select disabled>
            <option>{{ labManifest.caseLabel }}</option>
          </select>
        </label>

        <label class="mkd-field">
          <span>比较窗口</span>
          <select v-model="comparisonWindow" :disabled="runState === 'running'">
            <option value="7d-vs-7d">相邻 7 日窗口</option>
          </select>
        </label>

        <fieldset class="mkd-mode-switch">
          <legend>运行模式</legend>
          <label><input type="radio" checked name="mode" /> Replay</label>
          <label class="is-locked"><input type="radio" disabled name="mode" /> Live <PhLockKey :size="13" aria-hidden="true" /></label>
        </fieldset>
        <p class="mkd-field-help">Live 仍被锁定；负例与越权回放请前往 Cases 页面。</p>

        <p v-if="loadError" class="mkd-export-note" role="alert">{{ loadError }}</p>

        <button class="mkd-button mkd-button-primary mkd-run-button" type="button" :disabled="runState === 'running'" @click="runReplay">
          <PhPlay :size="17" weight="fill" aria-hidden="true" />
          {{ runState === 'running' ? '正在复放…' : runState === 'completed' ? '重新运行 Replay' : '运行固定 Replay' }}
        </button>
      </section>

      <section class="mkd-lab-pipeline" aria-labelledby="lab-pipeline-title">
        <div class="mkd-panel-heading">
          <div><p class="mkd-panel-index">02 / EVIDENCE SPINE</p><h2 id="lab-pipeline-title">编译与调用轨迹</h2></div>
          <code>{{ completedCount }}/7</code>
        </div>
        <ol>
          <li v-for="(stage, index) in pipelineStages" :key="stage.id" :data-state="stageState(index)">
            <span class="mkd-stage-state">
              <PhCheckCircle v-if="stageState(index) === 'complete'" :size="19" weight="fill" aria-hidden="true" />
              <PhClock v-else-if="stageState(index) === 'active'" :size="19" aria-hidden="true" />
              <PhCircleDashed v-else :size="19" aria-hidden="true" />
            </span>
            <span class="mkd-stage-number">{{ stage.number }}</span>
            <span><strong>{{ stage.label }}</strong><small>{{ stage.detail }}</small></span>
          </li>
        </ol>
        <p class="mkd-visually-hidden" aria-live="polite">{{ announcement }}</p>
      </section>

      <aside class="mkd-lab-manifest" aria-labelledby="manifest-title">
        <p class="mkd-panel-index">03 / CORPUS MANIFEST</p>
        <h2 id="manifest-title">固定多格式样本</h2>
        <ul>
          <li v-for="file in labManifest.files" :key="file.name">
            <span><PhFileText :size="17" aria-hidden="true" />{{ file.type }}</span>
            <div><strong>{{ file.name }}</strong><small>{{ file.role }}</small></div>
          </li>
        </ul>
        <dl>
          <div><dt>FILES</dt><dd>6</dd></div>
          <div><dt>UPLOADS</dt><dd>0</dd></div>
          <div><dt>CALLS</dt><dd>0</dd></div>
        </dl>
      </aside>
    </div>

    <section v-if="runState === 'completed'" ref="completion" class="mkd-lab-completion" tabindex="-1" aria-labelledby="completion-title">
      <div>
        <p class="mkd-overline">REPLAY COMPLETE · LO-S SYNTHETIC</p>
        <h2 id="completion-title">{{ replayPresentation.headline }}</h2>
        <p>{{ replayResult.summary }}</p>
        <p class="mkd-completion-receipt">外部调用 {{ replayBundle?.receipt.externalCalls ?? 0 }} · 外部副作用 {{ replayBundle?.receipt.sideEffects ?? 0 }} · deterministic-rule-engine</p>
      </div>
      <a class="mkd-button mkd-button-primary" :href="withBase('/lab/runs/amazon-ads-replay-001')">
        审查完整行动包 <PhArrowRight :size="17" aria-hidden="true" />
      </a>
      <a class="mkd-button mkd-button-secondary" :href="withBase('/reference/cases')">查看 20 条门禁案例</a>
    </section>
  </main>
</template>
