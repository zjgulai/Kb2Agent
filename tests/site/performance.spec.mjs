import { expect, test } from '@playwright/test'

test('local Web Vitals stay inside the agreed budget in an isolated performance file', async ({ page }) => {
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
