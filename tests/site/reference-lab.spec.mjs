import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { replayPresentation, replayResult } from '../../docs/reference-lab-fixture.mjs'

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
  { width: 768, height: 1024 },
  { width: 960, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 1024 }
]) {
  test(`Reference Lab contract at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const runtimeErrors = captureRuntimeErrors(page)
    await page.goto('lab/')

    await expect(page.locator('.mkd-lab-shell h1')).toContainText('Amazon Ads')
    await expect(page.getByRole('radio', { name: 'Live' })).toBeDisabled()
    await expect(page.locator('input[type="file"], input[type="text"], textarea')).toHaveCount(0)
    await expect(page.locator('.mkd-lab-pipeline li')).toHaveCount(7)
    await expect(page.locator('.mkd-lab-manifest li')).toHaveCount(6)
    await expect(page.locator('.mkd-lab-shell')).toContainText('no upload · no free text')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    if (viewport.width === 390) {
      const targets = await page.locator('button:visible, select:visible, a.mkd-button:visible').evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }))
      expect(targets.every(({ width, height }) => width >= 44 && height >= 44)).toBeTruthy()
    }
    expect(runtimeErrors).toEqual([])
  })
}

test('Replay completes with focus, evidence labels and zero-side-effect result', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('lab/')

  await page.getByRole('button', { name: '运行固定 Replay' }).click()
  const completion = page.locator('.mkd-lab-completion')
  await expect(completion).toBeVisible()
  await expect(completion).toBeFocused()
  await expect(page.locator('.mkd-lab-pipeline li[data-state="complete"]')).toHaveCount(7)
  await expect(completion).toContainText('LO-S SYNTHETIC')
  await expect(completion).toContainText('外部调用 0 · 外部副作用 0')
  await expect(completion.getByRole('heading', { level: 2 })).toHaveText(replayPresentation.headline)

  await completion.getByRole('link', { name: /审查完整行动包/ }).click()
  await expect(page).toHaveURL(/lab\/runs\/amazon-ads-replay-001$/)
  await expect(page.locator('.mkd-result-shell h1')).toHaveText(replayPresentation.headline)
  await expect(page.locator('.mkd-recommendation h2')).toHaveText(replayResult.recommendation)
  await expect(page.locator('.mkd-reasoning-grid')).toContainText(replayResult.facts[0].text)
  await expect(page.locator('.mkd-result-shell')).not.toContainText('Request the missing comparable evidence')
  await expect(page.locator('.mkd-result-shell')).not.toContainText('Synthetic ACOS rises')
  await expect(page.locator('.mkd-result-boundary')).toContainText('没有真实广告账户、模型调用、领域批准或外部写入')
  expect(runtimeErrors).toEqual([])
})

test('Result keeps action package primary and engineering evidence progressively disclosed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('lab/runs/amazon-ads-replay-001')

  await expect(page.locator('.mkd-result-shell h1')).toHaveText(replayPresentation.headline)
  await expect(page.locator('.mkd-recommendation h2')).toHaveText(replayResult.recommendation)
  await expect(page.locator('.mkd-recommendation')).toBeVisible()
  await expect(page.locator('.mkd-reasoning-grid')).toContainText('FACTS · 事实')
  await expect(page.locator('.mkd-reasoning-grid')).toContainText('INFERENCES · 推断')
  await expect(page.locator('.mkd-reasoning-grid')).toContainText('UNKNOWNS · 未知')
  await expect(page.locator('.mkd-result-rail')).toContainText('0 / 4 已接受')
  await expect(page.locator('.mkd-result-rail')).toContainText('M1-B 输出未携带具名签署回执。本结果不是 accepted。')
  await expect(page.locator('.mkd-result-rail')).not.toContainText('尚无具名 assignee')
  await expect(page.locator('.mkd-result-shell')).not.toContainText('Request the missing comparable evidence')
  await expect(page.locator('.mkd-result-shell')).not.toContainText('Did CPC, CVR, price, or availability change?')

  const details = page.locator('.mkd-engineering-evidence details')
  await expect(details).toHaveCount(4)
  await details.nth(0).locator('summary').click()
  await expect(details.nth(0)).toHaveAttribute('open', '')
  await expect(details.nth(0)).toContainText('sheet=Source Data;range=A1:J3')

  await expect(page.getByRole('link', { name: 'ActionPackage.json' })).toHaveAttribute('download', '')
  await expect(page.getByRole('link', { name: 'Receipt.json' })).toHaveAttribute('download', '')
  await expect(page.getByRole('link', { name: 'Report.md' })).toHaveAttribute('download', '')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const summaries = await page.locator('.mkd-engineering-evidence summary').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height))
  expect(summaries.every((height) => height >= 44)).toBeTruthy()
  expect(runtimeErrors).toEqual([])
})

test('Home leads with the flagship lab and keeps the Guide catalog secondary', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('./')
  const labCta = page.getByRole('link', { name: /运行 Amazon Ads Replay/ })
  const guideHeading = page.getByRole('heading', { name: /26 个知识模块/ })
  await expect(labCta).toBeVisible()
  await expect(guideHeading).toBeVisible()
  await expect(page.locator('.mkd-hero-brief h2')).toHaveText(replayPresentation.headline)
  const order = await page.evaluate(() => {
    const cta = document.querySelector('.mkd-product-hero')
    const guide = document.querySelector('.mkd-guide-section')
    return cta.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING
  })
  expect(order).toBeTruthy()
})

test('M1-B reference pages render build artifacts without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const expectations = [
    ['reference/evidence', '88', 'SOURCE INVENTORY'],
    ['reference/map', 'Concept', '晋升边界'],
    ['reference/cases', '20/20', 'adversarial'],
    ['reference/build', 'L2 本地 dry-run', 'canonical-dry-run.json'],
    ['reference/ops', 'stdio 工具面', '部署不是本门禁的一部分']
  ]
  for (const [target, primary, secondary] of expectations) {
    const runtimeErrors = captureRuntimeErrors(page)
    await page.goto(target)
    await expect(page.locator('.mkd-reference-page')).toContainText(primary)
    await expect(page.locator('.mkd-reference-page')).toContainText(secondary)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, target).toBeLessThanOrEqual(1)
    expect(runtimeErrors, target).toEqual([])
  }
})

test('Reference surfaces have no critical or serious axe findings', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  for (const target of ['lab/', 'lab/runs/amazon-ads-replay-001', 'reference/evidence', 'reference/map', 'reference/cases', 'reference/build', 'reference/ops']) {
    await page.goto(target)
    const result = await new AxeBuilder({ page }).analyze()
    const blocking = result.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  }
})
