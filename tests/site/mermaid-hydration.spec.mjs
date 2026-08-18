import { expect, test } from '@playwright/test'

const routes = [
  { name: 'security compliance', path: 'knowledge/05-security-compliance', mermaid: true },
  { name: 'framework', path: 'knowledge/01-framework', mermaid: true },
  { name: 'cost model control', path: 'knowledge/10-cost-model', mermaid: false }
]

function captureBlockingRuntimeErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydration/i.test(message.text())) {
      errors.push(`console:${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown'}`)
  })
  return errors
}

test.describe('Mermaid SSR and client hydration stay identical', () => {
  for (const route of routes) {
    test(`${route.name} has no hydration, page or request errors`, async ({ page }) => {
      const runtimeErrors = captureBlockingRuntimeErrors(page)
      const response = await page.goto(route.path, { waitUntil: 'networkidle' })

      expect(response?.status()).toBe(200)
      await expect(page.locator('.vp-doc h1')).toBeVisible()

      const diagrams = page.locator('.mermaid-diagram')
      if (route.mermaid) {
        expect(await diagrams.count()).toBeGreaterThan(0)
        const firstDiagram = diagrams.first()
        await expect(firstDiagram.locator('.mermaid-source code')).not.toBeEmpty()
        await firstDiagram.scrollIntoViewIfNeeded()
        await expect(firstDiagram.locator('.mermaid-canvas svg')).toBeVisible({ timeout: 20_000 })
      } else {
        await expect(diagrams).toHaveCount(0)
      }

      expect(runtimeErrors).toEqual([])
    })
  }
})
