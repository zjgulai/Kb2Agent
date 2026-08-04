import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { SEARCH_GOLDEN_QUERIES } from '../../docs/.vitepress/search-quality.mjs'

function routeFromResult(href) {
  const url = new URL(href, 'http://127.0.0.1:4174')
  return url.pathname.replace(/^\/Kb2Agent/, '')
}

test('golden search queries prioritize the intended destination', async ({ page }) => {
  expect(SEARCH_GOLDEN_QUERIES).toHaveLength(15)
  for (const intent of SEARCH_GOLDEN_QUERIES) {
    expect(intent.expectedTop3Routes).toHaveLength(3)
    expect(new Set(intent.expectedTop3Routes).size).toBe(3)
    expect(intent.expectedTop3Routes[0]).toMatch(/^\/knowledge\//)
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')
  await page.getByRole('button', { name: /搜索知识库/ }).click()

  const input = page.locator('.VPLocalSearchBox input[type="search"]')
  const directResults = page.locator('.VPLocalSearchBox .results > li > a.result')
  await expect(input).toBeFocused()

  const observed = []
  for (const intent of SEARCH_GOLDEN_QUERIES) {
    await input.fill(intent.query)
    await expect.poll(async () => {
      const href = await directResults.first().getAttribute('href')
      return href ? routeFromResult(href) : null
    }, { message: `fresh primary result for ${intent.query}` })
      .toBe(intent.expectedTop3Routes[0])

    const topThree = (await directResults.evaluateAll((links) =>
      links.slice(0, 3).map((link) => link.getAttribute('href'))
    )).map(routeFromResult)

    observed.push({
      query: intent.query,
      expected: intent.expectedTop3Routes[0],
      actual: topThree[0] ?? null,
      topThree
    })
  }

  expect(observed, JSON.stringify(observed, null, 2)).toEqual(
    SEARCH_GOLDEN_QUERIES.map((intent) => expect.objectContaining({
      query: intent.query,
      expected: intent.expectedTop3Routes[0],
      actual: intent.expectedTop3Routes[0],
      topThree: expect.arrayContaining([intent.expectedTop3Routes[0]])
    }))
  )
})

test('search handles empty, keyboard, navigation and local-only preference states', async ({ page }) => {
  const requests = []
  page.on('request', (request) => {
    requests.push({ method: request.method(), url: request.url() })
  })

  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('./')

  await page.waitForTimeout(750)
  expect(
    requests.filter(({ url }) => /VPLocalSearchBox|@localSearchIndexroot/.test(url))
  ).toEqual([])

  const homeOpener = page.getByRole('button', { name: /搜索知识库/ })
  await homeOpener.click()
  const modal = page.locator('.VPLocalSearchBox')
  const input = modal.locator('input[type="search"]')
  await expect(input).toBeFocused()
  await expect(modal).toHaveAttribute('role', 'dialog')
  await expect(modal).toHaveAttribute('aria-modal', 'true')

  await input.fill('qzxvbnm987654321')
  const noResults = modal.locator('.no-results')
  await expect(noResults).toContainText('未找到相关内容')
  await expect(input).toBeFocused()
  const emptyUrl = page.url()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(emptyUrl)
  await expect(modal).toBeVisible()

  await modal.getByRole('button', { name: '清空搜索' }).click()
  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
  await expect(noResults).toBeHidden()

  await input.fill('RAG 评估')
  const firstResult = modal.locator('.results > li > a.result').first()
  const selectedStatus = modal.locator('.mkd-search-status')
  await expect(firstResult).toHaveAttribute('href', /\/knowledge\/12-evaluation/)
  // Detailed search publishes raw results before async excerpts; start keyboard input after the final publication.
  await expect(firstResult.locator('.excerpt')).toBeVisible()
  await expect(firstResult).toHaveClass(/selected/)
  await expect(selectedStatus).toHaveAttribute('role', 'status')
  await expect(selectedStatus).toHaveAttribute('aria-live', 'polite')
  const firstAnnouncement = await selectedStatus.textContent()
  expect(firstAnnouncement).toContain('当前选择：')
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => selectedStatus.textContent()).not.toBe(firstAnnouncement)
  await page.keyboard.press('ArrowUp')
  await expect(selectedStatus).toHaveText(firstAnnouncement || '')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/Kb2Agent\/knowledge\/12-evaluation/)
  await expect(modal).toBeHidden()

  const articleOpener = page.locator('.mkd-mobile-search')
  await expect(articleOpener).toBeVisible()
  await articleOpener.click()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('RAG 评估')
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(articleOpener).toBeFocused()

  const storage = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage))
  }))
  expect(storage.session['vitepress:local-search-filter']).toBe('RAG 评估')
  expect(storage.local['vitepress:local-search-detailed-list']).toBe('true')
  expect(
    Object.keys({ ...storage.local, ...storage.session })
      .filter((key) => /analytics|telemetry|sidebar|mkd:/i.test(key))
  ).toEqual([])

  const externalRequests = requests.filter(({ url }) => {
    const parsed = new URL(url)
    return parsed.origin !== 'http://127.0.0.1:4174'
  })
  expect(externalRequests).toEqual([])
  expect(requests.filter(({ method }) => method !== 'GET')).toEqual([])
})

async function expectNoBlockingAxe(page, state) {
  const result = await new AxeBuilder({ page }).analyze()
  const blocking = result.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))
  expect(blocking, `${state}: ${JSON.stringify(blocking, null, 2)}`).toEqual([])
}

test('search and all three navigation scopes remain accessible while open', async ({ page }) => {
  // This covers six full Axe analyses across three viewport modes, so it needs
  // a budget independent from the lightweight interaction contracts above.
  test.setTimeout(90_000)

  const articlePath = 'knowledge/05-security-compliance'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articlePath)

  const hamburger = page.locator('.VPNavBarHamburger')
  await hamburger.click()
  await expect(page.locator('.VPNavScreen')).toBeVisible()
  await expectNoBlockingAxe(page, 'mobile global navigation')
  await page.keyboard.press('Escape')

  const libraryMenu = page.locator('.VPLocalNav .menu')
  await libraryMenu.click()
  await expect(page.locator('.VPSidebar')).toBeVisible()
  await expectNoBlockingAxe(page, 'mobile library drawer')
  await page.keyboard.press('Escape')

  const outlineMenu = page.locator('.VPLocalNavOutlineDropdown > button')
  await outlineMenu.click()
  await expect(page.locator('#VPLocalNavOutlineItems')).toBeVisible()
  await expectNoBlockingAxe(page, 'mobile page outline')
  await page.keyboard.press('Escape')

  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(articlePath)
    const opener = width < 1440
      ? page.locator('.mkd-mobile-search')
      : page.locator('.VPNavBarSearch button').first()
    await opener.click()
    const input = page.locator('.VPLocalSearchBox input[type="search"]')
    await input.fill('RAG 评估')
    await expect(page.locator('.VPLocalSearchBox .results > li > a.result').first())
      .toHaveAttribute('href', /\/knowledge\/12-evaluation/)
    await expectNoBlockingAxe(page, `${width}px search modal`)
    await page.keyboard.press('Escape')
    await expect(opener).toBeFocused()
  }
})
