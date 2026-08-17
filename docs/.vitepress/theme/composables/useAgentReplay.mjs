import { computed, onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue'

export function useAgentReplay(bundleUrl) {
  const bundle = shallowRef(null)
  const loadError = shallowRef('')
  const runState = shallowRef('loading')
  const selectedId = shallowRef('')
  const activeStep = shallowRef(-1)
  const announcement = shallowRef('正在读取本地 G6 Replay bundle。')
  const timers = []

  const cases = computed(() => bundle.value?.cases ?? [])
  const selectedRun = computed(() => cases.value.find((item) => item.fixture.fixtureId === selectedId.value) ?? null)
  const evaluation = computed(() => bundle.value?.evaluation ?? null)

  function clearTimers() {
    while (timers.length) window.clearTimeout(timers.pop())
  }

  function selectCase(fixtureId) {
    if (runState.value === 'running' || !cases.value.some((item) => item.fixture.fixtureId === fixtureId)) return
    clearTimers()
    selectedId.value = fixtureId
    activeStep.value = -1
    runState.value = 'idle'
    announcement.value = `已选择 ${fixtureId}，等待 Replay。`
  }

  function completeReplay() {
    runState.value = 'completed'
    activeStep.value = selectedRun.value?.executionPlan.steps.length ?? 0
    const terminal = selectedRun.value?.executionReceipt.terminalState ?? 'failed'
    announcement.value = `Replay 完成，终态 ${terminal}；外部调用 0，外部副作用 0。`
  }

  function runReplay() {
    if (runState.value === 'running' || !selectedRun.value) return
    clearTimers()
    runState.value = 'running'
    activeStep.value = 0
    const steps = selectedRun.value.executionPlan.steps
    announcement.value = steps.length ? `Replay 开始：${steps[0].toolId}` : '输入合同未通过，正在生成失败关闭回执。'
    if (!steps.length) {
      timers.push(window.setTimeout(completeReplay, 260))
      return
    }
    steps.forEach((step, index) => {
      timers.push(window.setTimeout(() => {
        if (index < steps.length - 1) {
          activeStep.value = index + 1
          announcement.value = `已完成 ${step.toolId}，正在回放 ${steps[index + 1].toolId}。`
        } else {
          completeReplay()
        }
      }, 220 + index * 135))
    })
  }

  async function loadBundle() {
    loadError.value = ''
    try {
      const response = await fetch(bundleUrl, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const value = await response.json()
      if (!Array.isArray(value.cases) || value.cases.length !== 20) throw new Error('bundle case count is not 20')
      bundle.value = value
      selectedId.value = value.cases[0].fixture.fixtureId
      runState.value = 'idle'
      announcement.value = 'G6 Replay bundle 已就绪；20 个合成案例可供审查。'
    } catch (error) {
      loadError.value = `无法读取本地 Agent bundle：${error.message}`
      runState.value = 'error'
      announcement.value = loadError.value
    }
  }

  onMounted(loadBundle)
  onBeforeUnmount(clearTimers)

  return {
    bundle: readonly(bundle),
    cases,
    selectedRun,
    evaluation,
    loadError: readonly(loadError),
    runState: readonly(runState),
    selectedId: readonly(selectedId),
    activeStep: readonly(activeStep),
    announcement: readonly(announcement),
    selectCase,
    runReplay
  }
}
