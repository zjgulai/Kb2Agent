import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1024 }
]

function captureRuntimeErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return errors
}

for (const viewport of viewports) {
  test(`homepage contract at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const runtimeErrors = captureRuntimeErrors(page)
    await page.goto('./')

    await expect(page.locator('main.evidence-home h1')).toHaveText('MKD Guide')
    await expect(page.locator('.catalog-row')).toHaveCount(26)
    await expect(page.getByRole('button', { name: /搜索知识库/ })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    if (viewport.width < 640) {
      await expect(page.locator('.catalog-head')).toBeHidden()
      const targetSizes = await page.locator('.evidence-search, .catalog-row, .recommended-block a').evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        })
      )
      expect(targetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBeTruthy()
    }

    expect(runtimeErrors).toEqual([])
  })
}

test('search, warm-only appearance and 200% zoom remain operable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('./')

  await page.getByRole('button', { name: /搜索知识库/ }).click()
  const search = page.locator('.VPLocalSearchBox input[type="search"], .VPLocalSearchBox input').first()
  await expect(search).toBeFocused()
  await search.fill('成本模型')
  await expect(page.locator('.VPLocalSearchBox')).toContainText('成本')
  await page.keyboard.press('Escape')
  await expect(page.locator('.VPLocalSearchBox')).toBeHidden()

  await expect(page.locator('.VPNavBarAppearance')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')

  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(page.getByRole('button', { name: /搜索知识库/ })).toBeVisible()
  await page.getByRole('button', { name: /搜索知识库/ }).click()
  await expect(search).toBeFocused()
  await page.keyboard.press('Escape')
  expect(runtimeErrors).toEqual([])
})

test('long-form content, tables, code copy and Mermaid dialog are usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('knowledge/05-security-compliance')
  await expect(page.locator('.vp-doc h1')).toBeVisible()

  const table = page.locator('.vp-doc table').first()
  await table.scrollIntoViewIfNeeded()
  expect(await table.evaluate((element) => getComputedStyle(element).overflowX)).toMatch(/auto|scroll/)

  const copyButton = page.locator('button.copy').first()
  await copyButton.scrollIntoViewIfNeeded()
  await copyButton.click()
  await expect(copyButton).toHaveClass(/copied/)

  const diagrams = page.locator('.mermaid-diagram')
  expect(await diagrams.count()).toBeGreaterThan(0)
  const firstDiagram = diagrams.first()
  await firstDiagram.scrollIntoViewIfNeeded()
  await expect(firstDiagram.locator('.mermaid-canvas svg')).toBeVisible({ timeout: 20_000 })

  const trigger = firstDiagram.getByRole('button', { name: '放大查看流程图' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '流程图放大查看' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '200%' }).click()
  await expect(dialog.getByRole('button', { name: '200%' })).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(runtimeErrors).toEqual([])
})

test('claim ledgers expose evidence grades and role-mapped ownership on all three pilot pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  const pilots = [
    { path: 'knowledge/05-security-compliance', prefix: 'CLM-SEC-', sourceReviewed: 2, fixtureVerified: 2, pending: 0 },
    { path: 'knowledge/10-cost-model', prefix: 'CLM-COST-', sourceReviewed: 1, fixtureVerified: 3, pending: 0 },
    { path: 'knowledge/12-evaluation', prefix: 'CLM-EVAL-', sourceReviewed: 3, fixtureVerified: 1, pending: 0 }
  ]

  for (const pilot of pilots) {
    await page.goto(pilot.path)
    const ledger = page.locator('.claim-ledger')
    await expect(ledger).toBeVisible()
    await expect(ledger.locator('.claim-card')).toHaveCount(4)
    await expect(ledger.locator('.claim-id').first()).toContainText(pilot.prefix)
    await expect(ledger.locator('[data-status="source-reviewed"]')).toHaveCount(pilot.sourceReviewed)
    await expect(ledger.locator('[data-status="fixture-verified"]')).toHaveCount(pilot.fixtureVerified)
    await expect(ledger.locator('[data-status="pending"]')).toHaveCount(pilot.pending)
    await expect(ledger).toContainText('4/4 角色已映射 · 0/4 已接受')
    await expect(ledger).not.toContainText('未分配（阻断项）')

    const firstDetails = ledger.locator('details').first()
    await firstDetails.locator('summary').click()
    await expect(firstDetails).toHaveAttribute('open', '')
    await expect(firstDetails).toContainText('下一动作')
    await expect(firstDetails.locator('[data-owner-state="role-mapped"]')).toHaveCount(4)
    await expect(firstDetails).toContainText('角色映射只解决职责归属')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  for (const pilot of pilots) {
    await page.goto(`${pilot.path}#关键断言与证据`)
    const layout = await page.locator('.claim-ledger').evaluate((ledger) => {
      const statuses = [...ledger.querySelectorAll('.claim-status')]
        .map((element) => element.getBoundingClientRect())
      const summary = ledger.querySelector('summary')?.getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        statusInsideViewport: statuses.every((rect) => rect.left >= 0 && rect.right <= window.innerWidth + 1),
        summaryHeight: summary?.height || 0
      }
    })
    expect(layout.overflow).toBeLessThanOrEqual(1)
    expect(layout.statusInsideViewport).toBeTruthy()
    expect(layout.summaryHeight).toBeGreaterThanOrEqual(44)
  }

  expect(runtimeErrors).toEqual([])
})

test('concept workbench exposes definitions, cross-document uses and mobile-safe disclosures', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('knowledge/appendix-validation#概念使用图')

  const workbench = page.locator('.concept-workbench')
  await expect(workbench).toBeVisible()
  await expect(workbench.locator('.concept-card')).toHaveCount(13)
  await expect(workbench.locator('.concept-totals')).toContainText('13')

  const ragCard = workbench.locator('[data-concept-id="CONCEPT-RAG"]')
  await ragCard.locator('summary').click()
  await expect(ragCard).toHaveAttribute('open', '')
  await expect(ragCard).toContainText('首次定义 · 02')
  await expect(ragCard).toContainText('06 · 比较')
  await expect(ragCard).toContainText('不可混同')

  await ragCard.getByRole('link', { name: '06 · 比较' }).click()
  await expect(page).toHaveURL(/knowledge\/05-graphrag#concept-use-rag-001$/)
  await expect(page.locator('#concept-use-rag-001')).toBeAttached()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('knowledge/appendix-validation#概念使用图')
  const mobileLayout = await page.locator('.concept-workbench').evaluate((element) => {
    const summaries = [...element.querySelectorAll('summary')].map((summary) => summary.getBoundingClientRect())
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      summariesTouchable: summaries.every((rect) => rect.width >= 44 && rect.height >= 44)
    }
  })
  expect(mobileLayout.overflow).toBeLessThanOrEqual(1)
  expect(mobileLayout.summariesTouchable).toBeTruthy()
  expect(runtimeErrors).toEqual([])
})

test('acceptance workbench separates local replay from approval and blocks false maturity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  const runtimeErrors = captureRuntimeErrors(page)
  await page.goto('knowledge/appendix-validation#机器可验收契约')

  const workbench = page.locator('.acceptance-workbench')
  await expect(workbench).toBeVisible()
  await expect(workbench.locator('.acceptance-card')).toHaveCount(3)
  await expect(workbench.locator('[data-state="approval-blocked"]')).toHaveCount(6)
  await expect(workbench.locator('.acceptance-totals')).toContainText('3/3')
  await expect(workbench.locator('.acceptance-totals')).toContainText('0/3')

  const evaluationCard = workbench.locator('[data-acceptance-id="ACC-EVALUATION-001"]')
  await evaluationCard.locator('summary').click()
  await expect(evaluationCard).toHaveAttribute('open', '')
  await expect(evaluationCard).toContainText('3 例')
  await expect(evaluationCard).toContainText('2 个负例')
  await expect(evaluationCard).toContainText('100%')
  await expect(evaluationCard).toContainText('0.0 pp')
  await expect(evaluationCard).toContainText('0/4')
  await expect(evaluationCard.locator('.acceptance-blockers li')).toHaveCount(4)
  await expect(evaluationCard.locator('[data-threshold-status="illustrative"]')).toHaveCount(3)

  await evaluationCard.getByRole('link', { name: /查看 14 章验收上下文/ }).click()
  await expect.poll(() => decodeURI(page.url())).toMatch(/knowledge\/12-evaluation#验收契约$/)
  await expect(page.locator('.acceptance-workbench .acceptance-card')).toHaveCount(1)
  await expect(page.locator('.acceptance-workbench')).toContainText('0/1')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('knowledge/appendix-validation#机器可验收契约')
  const mobileLayout = await page.locator('.acceptance-workbench').evaluate((element) => {
    const summaries = [...element.querySelectorAll('summary')].map((summary) => summary.getBoundingClientRect())
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      summariesTouchable: summaries.every((rect) => rect.width >= 44 && rect.height >= 44)
    }
  })
  expect(mobileLayout.overflow).toBeLessThanOrEqual(1)
  expect(mobileLayout.summariesTouchable).toBeTruthy()
  expect(runtimeErrors).toEqual([])
})

test('axe has no critical or serious findings on key surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  for (const target of [
    './',
    'knowledge/05-security-compliance',
    'knowledge/appendix-validation#概念使用图',
    'knowledge/appendix-validation#机器可验收契约'
  ]) {
    await page.goto(target)
    if (target.includes('security')) {
      const diagram = page.locator('.mermaid-diagram').first()
      await diagram.scrollIntoViewIfNeeded()
      await expect(diagram.locator('.mermaid-canvas svg')).toBeVisible({ timeout: 20_000 })
    }
    const result = await new AxeBuilder({ page }).analyze()
    const blocking = result.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  }
})

test('local Web Vitals stay inside the agreed budget', async ({ page }) => {
  const inpTargetMs = 200
  const inpMeasurementToleranceMs = 25

  await page.addInitScript(() => {
    window.__mkdMetrics = { cls: 0, lcp: 0, events: [] }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__mkdMetrics.lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__mkdMetrics.cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) window.__mkdMetrics.events.push(entry.duration)
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
    } catch {
      // Event Timing may be unavailable in older browser builds; click latency below is the fallback.
    }
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.waitForTimeout(1_000)

  const started = Date.now()
  await page.getByRole('button', { name: /搜索知识库/ }).click()
  await expect(page.locator('.VPLocalSearchBox')).toBeVisible()
  const clickLatency = Date.now() - started
  await page.waitForTimeout(250)

  const metrics = await page.evaluate(() => window.__mkdMetrics)
  const inpProxy = metrics.events.length ? Math.max(...metrics.events) : clickLatency
  expect(metrics.lcp).toBeLessThan(2_500)
  expect(metrics.cls).toBeLessThan(0.1)
  // Browser automation samples an INP proxy, not field INP. Preserve the
  // 200ms target while allowing a small scheduler/measurement guard band.
  expect(inpProxy).toBeLessThanOrEqual(inpTargetMs + inpMeasurementToleranceMs)
})
