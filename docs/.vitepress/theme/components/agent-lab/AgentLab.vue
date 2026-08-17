<script setup>
import { nextTick, useTemplateRef, watch } from 'vue'
import { withBase } from 'vitepress'
import { PhArrowRight, PhLockKey, PhPulse, PhShieldCheck, PhWarning } from '@phosphor-icons/vue'
import { useAgentReplay } from '../../composables/useAgentReplay.mjs'
import AgentDecisionPanel from './AgentDecisionPanel.vue'
import AgentEvidenceDrawer from './AgentEvidenceDrawer.vue'
import AgentExecutionSpine from './AgentExecutionSpine.vue'
import AgentTaskPanel from './AgentTaskPanel.vue'

const bundleUrl = withBase('/reference/g6/agent-lab-bundle.json')
const resultPanel = useTemplateRef('resultPanel')
const {
  bundle,
  cases,
  selectedRun,
  evaluation,
  loadError,
  runState,
  selectedId,
  activeStep,
  announcement,
  selectCase,
  runReplay
} = useAgentReplay(bundleUrl)

watch(runState, async (state) => {
  if (state !== 'completed') return
  await nextTick()
  resultPanel.value?.focus()
})
</script>

<template>
  <main class="agent-lab-shell">
    <header class="agent-lab-hero">
      <div>
        <p class="mkd-overline">AGENT LAB · G6-A1 LOCAL REPLAY</p>
        <h1>Task to Agent,<br><em>every decision receipted.</em></h1>
        <p>选择二十个固定合成案例之一，复放 TaskPackage、确定性工具、决策行动包与最终回执。这里展示可审计执行合同，不是假装在线的聊天机器人。</p>
        <div class="agent-hero-links">
          <a href="#agent-workbench">进入工作台 <PhArrowRight :size="16" aria-hidden="true" /></a>
          <a :href="withBase('/reference/cases')">对照 M1-B 历史案例</a>
        </div>
      </div>
      <dl>
        <div><dt>AGENT</dt><dd>single E2</dd></div>
        <div><dt>MODE</dt><dd>Replay only</dd></div>
        <div><dt>CASES</dt><dd>{{ evaluation?.passed ?? 20 }} / 20</dd></div>
        <div><dt>EFFECTS</dt><dd>0</dd></div>
      </dl>
    </header>

    <section class="agent-lab-boundary" aria-label="G6 证据边界">
      <span><PhShieldCheck :size="16" weight="fill" aria-hidden="true" /> L2 fixture / dry-run</span>
      <span><PhPulse :size="16" aria-hidden="true" /> deterministic-rule-engine</span>
      <span><PhLockKey :size="16" aria-hidden="true" /> provider 0 · writes 0</span>
      <p>本页面尚未部署到公网；当前看到的是本地候选代码与构建产物。</p>
    </section>

    <p v-if="loadError" class="agent-load-error" role="alert"><PhWarning :size="18" aria-hidden="true" />{{ loadError }}</p>

    <section id="agent-workbench" class="agent-workbench" aria-label="G6 Agent Replay 工作台">
      <AgentTaskPanel
        :cases="cases"
        :selected-id="selectedId"
        :run-state="runState"
        @select-case="selectCase"
        @run="runReplay"
      />
      <AgentExecutionSpine :run="selectedRun" :run-state="runState" :active-step="activeStep" />
      <div ref="resultPanel" class="agent-result-focus" tabindex="-1">
        <AgentDecisionPanel :run="selectedRun" :run-state="runState" />
      </div>
    </section>

    <AgentEvidenceDrawer :run="selectedRun" :bundle="bundle" :bundle-url="bundleUrl" />
    <p class="mkd-visually-hidden" aria-live="polite">{{ announcement }}</p>

    <footer class="agent-lab-footer">
      <div><span>Source</span><span>Evidence</span><span>Decision</span><span>Skill</span><span>Task</span><strong>Agent</strong><span>Receipt</span></div>
      <p>G6-A1 只关闭本地 Replay 垂直切片。Provider canary、真实领域材料与生产 Agent 属于未来独立门禁。</p>
    </footer>
  </main>
</template>

<style scoped>
.agent-lab-shell { --agent-lab-max: 1380px; width: min(var(--agent-lab-max), calc(100% - 64px)); margin-inline: auto; padding: 28px 0 80px; }
.agent-lab-hero { position: relative; display: grid; min-height: 520px; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: clamp(44px, 8vw, 120px); align-items: end; padding: clamp(48px, 7vw, 96px) clamp(0px, 3vw, 38px) 64px; overflow: hidden; border-bottom: 1px solid var(--mkd-line-strong); }
.agent-lab-hero::before { position: absolute; top: 38px; right: 3%; width: 320px; height: 320px; border: 1px solid color-mix(in srgb, var(--mkd-blue) 16%, transparent); border-radius: 50%; background: repeating-radial-gradient(circle at center, transparent 0 22px, color-mix(in srgb, var(--mkd-blue) 8%, transparent) 23px 24px); content: ''; pointer-events: none; }
.agent-lab-hero > * { position: relative; z-index: 1; }
.agent-lab-hero h1 { margin: 20px 0 0; color: var(--mkd-ink); font: 500 clamp(54px, 7vw, 92px)/.96 var(--mkd-font-display); letter-spacing: -.055em; }
.agent-lab-hero h1 em { color: var(--mkd-blue); font-weight: 400; }
.agent-lab-hero > div > p:last-of-type { max-width: 760px; margin: 28px 0 0; color: var(--mkd-body); font-size: clamp(15px, 1.8vw, 19px); line-height: 1.75; }
.agent-hero-links { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 28px; }
.agent-hero-links a { display: inline-flex; min-height: 44px; align-items: center; gap: 7px; color: var(--mkd-blue); font-size: 13px; font-weight: 800; text-decoration: none; }
.agent-hero-links a:first-child { padding: 0 16px; color: #fff; background: var(--mkd-blue); }
.agent-lab-hero dl { margin: 0; border-top: 1px solid var(--mkd-line-strong); }
.agent-lab-hero dl div { display: grid; grid-template-columns: 90px 1fr; padding: 13px 0; border-bottom: 1px solid var(--mkd-line); }
.agent-lab-hero dt { color: var(--mkd-muted); font: 700 9px var(--mkd-font-mono); letter-spacing: .09em; }
.agent-lab-hero dd { margin: 0; color: var(--mkd-ink); font: 700 12px var(--mkd-font-mono); text-align: right; }
.agent-lab-boundary { display: flex; min-height: 48px; align-items: center; gap: 20px; padding: 10px 16px; border-bottom: 1px solid var(--mkd-line-strong); color: var(--mkd-muted); background: var(--mkd-paper-muted); }
.agent-lab-boundary span { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; color: var(--mkd-sage); font: 700 10px var(--mkd-font-mono); }
.agent-lab-boundary p { margin: 0 0 0 auto; font-size: 10px; }
.agent-load-error { display: flex; gap: 8px; align-items: center; padding: 16px; color: var(--mkd-coral); background: var(--mkd-coral-soft); }
.agent-workbench { display: grid; grid-template-columns: minmax(300px, .78fr) minmax(250px, .62fr) minmax(520px, 1.6fr); gap: 14px; align-items: stretch; margin: 28px 0 14px; scroll-margin-top: 84px; }
.agent-result-focus { min-width: 0; outline: none; }
.agent-result-focus:focus-visible { outline: 3px solid color-mix(in srgb, var(--mkd-blue) 55%, transparent); outline-offset: 3px; }
.agent-lab-footer { display: grid; grid-template-columns: 1.2fr .8fr; gap: 36px; align-items: center; margin-top: 46px; padding-top: 24px; border-top: 1px solid var(--mkd-line-strong); }
.agent-lab-footer div { display: flex; flex-wrap: wrap; gap: 5px; }
.agent-lab-footer span, .agent-lab-footer strong { padding: 6px 8px; border: 1px solid var(--mkd-line); color: var(--mkd-muted); font: 700 9px var(--mkd-font-mono); }
.agent-lab-footer strong { color: #fff; background: var(--mkd-blue); }
.agent-lab-footer p { margin: 0; color: var(--mkd-muted); font-size: 11px; line-height: 1.6; }
@media (max-width: 1180px) { .agent-workbench { grid-template-columns: minmax(300px, .85fr) minmax(0, 1.15fr); } .agent-workbench > :nth-child(2) { grid-row: 2; } .agent-workbench > :nth-child(3) { grid-column: 2; grid-row: 1 / span 2; } }
@media (max-width: 900px) { .agent-lab-hero { grid-template-columns: 1fr; min-height: 0; } .agent-lab-hero dl { max-width: 500px; } .agent-lab-boundary { flex-wrap: wrap; } .agent-lab-boundary p { width: 100%; margin-left: 0; } .agent-workbench { grid-template-columns: 1fr; } .agent-workbench > :nth-child(2), .agent-workbench > :nth-child(3) { grid-column: 1; grid-row: auto; } .agent-lab-footer { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .agent-lab-shell { width: min(100% - 28px, var(--agent-lab-max)); padding-top: 16px; } .agent-lab-hero { padding: 46px 0 42px; } .agent-lab-hero h1 { font-size: clamp(45px, 14vw, 64px); } .agent-lab-boundary { margin-inline: -14px; padding-inline: 14px; } .agent-workbench { margin-top: 18px; } }
</style>
