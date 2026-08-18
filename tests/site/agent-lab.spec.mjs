import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

function captureRuntimeErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return errors
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 960, height: 900 },
  { width: 1440, height: 1024 }
]) {
  test(`G6 Agent Lab is responsive and evidence-bounded at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const runtimeErrors = captureRuntimeErrors(page)
    const requests = []
    page.on('request', (request) => requests.push(request.url()))
    await page.goto('agent-lab/')

    await expect(page.locator('.agent-lab-shell h1')).toContainText('Task to Agent')
    await expect(page.locator('.agent-lab-boundary')).toContainText('L2 fixture / dry-run')
    await expect(page.locator('.agent-lab-boundary')).toContainText('provider 0 · writes 0')
    await expect(page.getByRole('option')).toHaveCount(20)
    await expect(page.locator('input[type="file"], input[type="text"], textarea')).toHaveCount(0)
    await expect(page.locator('.agent-spine li')).toHaveCount(8)
    await expect(page.getByRole('button', { name: /运行确定性 Replay/ })).toBeEnabled()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4174')).toBeTruthy()

    if (viewport.width === 390) {
      const mainTargets = await page.locator('.agent-category-tabs button:visible, .agent-case-list button:visible, .agent-run-button:visible, .agent-hero-links a:visible').evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }))
      expect(mainTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBeTruthy()
    }
    expect(runtimeErrors).toEqual([])
  })
}

test('normal Replay reaches pending approval, moves focus and exposes zero-effect receipts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('agent-lab/')

  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-result-focus')).toBeFocused()
  await expect(page.locator('.agent-terminal-seal')).toHaveText('needs-approval')
  await expect(page.locator('.agent-recommendation')).toContainText('human-reviewed manual draft')
  await expect(page.locator('.agent-reasoning-label.is-fact')).toHaveText(/FACTS/)
  await expect(page.locator('.agent-spine li[data-state="completed"]')).toHaveCount(8)
  await expect(page.locator('.agent-evidence details').first()).toContainText('needs-approval')
  await expect(page.locator('.agent-evidence details').first()).toContainText('0')
  const approvalEvidence = page.locator('.agent-evidence details[data-section="approval"]')
  await approvalEvidence.locator('summary').click()
  await expect(approvalEvidence).toContainText('ROLE-AMAZON-ADS-DOMAIN')
  await expect(approvalEvidence).toContainText('ROLE-PRODUCT-CONTENT')
  await expect(approvalEvidence).toContainText('accepted 0 / 2')

  const toolEvidence = page.locator('.agent-evidence details[data-section="tool-receipts"]')
  await toolEvidence.locator(':scope > summary').click()
  await expect(toolEvidence.locator('.agent-tool-receipt')).toHaveCount(8)
  await expect(toolEvidence.locator('.agent-tool-receipt').first()).toContainText('CALL-STEP-G6-001-01')
  await expect(toolEvidence.locator('.agent-tool-receipt').first()).toContainText('inputHash')
  await expect(toolEvidence.locator('.agent-tool-receipt').first()).toContainText('outputHash')
  await expect(toolEvidence.locator('.agent-tool-receipt').first()).toContainText('effects 0 · calls 0')
  expect(runtimeErrors).toEqual([])
})

test('unauthorized Replay refuses the request without drafting an action', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('agent-lab/')

  await page.getByRole('button', { name: /越权 3/ }).click()
  await page.getByRole('option', { name: /请求修改预算/ }).click()
  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-terminal-seal')).toHaveText('refused')
  await expect(page.locator('.agent-refusal-card')).toContainText('EXTERNAL_WRITE_FORBIDDEN')
  await expect(page.locator('.agent-refusal-card')).toContainText('安全替代')
  await expect(page.locator('.agent-recommendation')).toHaveCount(0)
  await expect(page.locator('.agent-spine li[data-state="blocked"]')).toHaveCount(1)
  await expect(page.locator('.agent-spine li[data-state="skipped"]')).toHaveCount(2)
  const refusalEvidence = page.locator('.agent-evidence details[data-section="refusal"]')
  await refusalEvidence.locator('summary').click()
  await expect(refusalEvidence).toContainText('REFUSAL-G6-')
  await expect(refusalEvidence).toContainText('requestHash')
  await expect(refusalEvidence).toContainText('安全替代')
  expect(runtimeErrors).toEqual([])
})

test('schema fault fails before any tool call and unknown plan tool fails closed', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('agent-lab/')

  await page.getByRole('button', { name: /故障 2/ }).click()
  await page.getByRole('option', { name: /任务输入缺失必要字段/ }).click()
  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-terminal-seal')).toHaveText('failed')
  await expect(page.locator('.agent-schema-stop')).toContainText('工具调用为 0')
  await expect(page.locator('.agent-failure-card')).toContainText('INPUT_SCHEMA_INVALID')

  await page.getByRole('option', { name: /执行计划注入未知工具/ }).click()
  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-failure-card')).toContainText('PLAN_TOOL_NOT_ALLOWED')
  await expect(page.locator('.agent-spine li[data-state="failed"]')).toContainText('UNKNOWN-PLUGIN')
  expect(runtimeErrors).toEqual([])
})

test('Agent Lab has no critical or serious axe findings', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1024 }]) {
    await page.setViewportSize(viewport)
    await page.goto('agent-lab/')
    const result = await new AxeBuilder({ page }).analyze()
    const blocking = result.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  }
})

test('Agent Lab freezes fresh desktop and mobile evidence screenshots', async ({ page }) => {
  const outputDir = path.join(process.cwd(), 'output/playwright/g6-a2-r1')
  await fs.mkdir(outputDir, { recursive: true })

  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('agent-lab/')
  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-terminal-seal')).toHaveText('needs-approval')
  await expect(page.locator('.agent-spine li[data-state="completed"]')).toHaveCount(8)
  await page.locator('.agent-evidence details[data-section="approval"] > summary').click()
  await page.locator('.agent-evidence details[data-section="tool-receipts"] > summary').click()
  await page.screenshot({ path: path.join(outputDir, 'agent-lab-desktop-evidence.png'), fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: /运行确定性 Replay/ }).click()
  await expect(page.locator('.agent-terminal-seal')).toHaveText('needs-approval')
  await expect(page.locator('.agent-spine li[data-state="completed"]')).toHaveCount(8)
  await page.locator('.agent-evidence details[data-section="approval"] > summary').click()
  await page.screenshot({ path: path.join(outputDir, 'agent-lab-mobile-evidence.png'), fullPage: true })
})
