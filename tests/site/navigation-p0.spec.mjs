import { expect, test } from '@playwright/test'

const articlePath = 'knowledge/05-security-compliance'

function captureRuntimeErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return errors
}

for (const width of [390, 1366]) {
  test(`global navigation is operable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    const runtimeErrors = captureRuntimeErrors(page)
    await page.goto(articlePath)

    const hamburger = page.locator('.VPNavBarHamburger')
    await expect(hamburger).toBeVisible()
    await expect(hamburger).toHaveAttribute('aria-label', '全局导航')
    await hamburger.click()
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')

    const screen = page.locator('.VPNavScreen')
    await expect(screen).toBeVisible()
    const screenBox = await screen.boundingBox()
    expect(screenBox?.height ?? 0).toBeGreaterThan(700)
    await expect(screen.getByRole('link', { name: '首页' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    await expect(screen).toBeHidden()
    await expect(hamburger).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
    expect(runtimeErrors).toEqual([])
  })
}

test('full desktop header fits at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(articlePath)

  await expect(page.locator('.VPNavBarHamburger')).toBeHidden()
  await expect(page.locator('.VPNavBarSearch')).toBeVisible()
  await expect(page.locator('.VPNavBarMenu')).toBeVisible()

  const headerFits = await page.locator('.VPNavBar .wrapper > .container').evaluate((container) => {
    const rect = container.getBoundingClientRect()
    return rect.left >= -1 && rect.right <= window.innerWidth + 1
  })
  expect(headerFits).toBeTruthy()
})

test('article and outline modes remain stable at critical boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 1179, height: 900 })
  await page.goto(articlePath)

  const samples = []
  for (const width of [1179, 1180, 1439, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    const contentBox = await page.locator('.VPDoc .content-container').boundingBox()
    expect(contentBox?.width ?? 0).toBeGreaterThanOrEqual(720)
    expect(contentBox?.width ?? 1000).toBeLessThanOrEqual(760)

    const desktopOutline = page.locator('.VPDocAsideOutline')
    const localOutline = page.locator('.VPLocalNavOutlineDropdown')
    if (width < 1440) {
      await expect(desktopOutline).toBeHidden()
      await expect(localOutline).toBeVisible()
    } else {
      await expect(desktopOutline).toBeVisible()
      await expect(localOutline).toBeHidden()

      const outlineBox = await desktopOutline.boundingBox()
      const articleRight = (contentBox?.x ?? 0) + (contentBox?.width ?? 0)
      expect((outlineBox?.x ?? 0) - articleRight).toBeGreaterThanOrEqual(16)
      expect((outlineBox?.x ?? 0) + (outlineBox?.width ?? 0)).toBeLessThanOrEqual(width)
    }

    samples.push({ width, x: contentBox?.x ?? 0, articleWidth: contentBox?.width ?? 0 })
  }

  for (const [left, right] of [[samples[0], samples[1]], [samples[2], samples[3]]]) {
    expect(Math.abs(right.x - left.x)).toBeLessThanOrEqual(32)
    expect(Math.abs(right.articleWidth - left.articleWidth)).toBeLessThanOrEqual(16)
  }
})

test('local outline exposes state, readable labels and touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articlePath)

  const trigger = page.locator('.VPLocalNavOutlineDropdown > button')
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  const triggerBox = await trigger.boundingBox()
  expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).toHaveAttribute('aria-controls', 'VPLocalNavOutlineItems')
  const items = page.locator('#VPLocalNavOutlineItems')
  await expect(items).toBeVisible()
  await expect(items.getByRole('link', { name: '返回顶部' })).toBeVisible()

  const linkContracts = await items.locator('.outline-link').evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect()
    const style = getComputedStyle(link)
    return {
      height: rect.height,
      readable: link.scrollWidth <= link.clientWidth + 1,
      wraps: style.whiteSpace !== 'nowrap'
    }
  }))
  expect(linkContracts.length).toBeGreaterThan(0)
  expect(
    linkContracts.every(({ height, readable, wraps }) => height >= 43.9 && readable && wraps),
    JSON.stringify(linkContracts)
  ).toBeTruthy()

  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(items).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('search returns focus to the opener on dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto(articlePath)
  const navTrigger = page.locator('.VPNavBarSearch button').first()
  await navTrigger.click()
  await expect(page.locator('.VPLocalSearchBox input[type="search"]')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.VPLocalSearchBox')).toBeHidden()
  await expect(navTrigger).toBeFocused()

  await page.goto('./')
  const homeTrigger = page.getByRole('button', { name: /搜索知识库/ })
  await homeTrigger.click()
  await expect(page.locator('.VPLocalSearchBox input[type="search"]')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.VPLocalSearchBox')).toBeHidden()
  await expect(homeTrigger).toBeFocused()
})

test('article search remains available when the full desktop header collapses', async ({ page }) => {
  for (const width of [390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(articlePath)

    const trigger = page.locator('.mkd-mobile-search')
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-label', '搜索文档')
    const triggerBox = await trigger.boundingBox()
    expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    await trigger.click()
    await expect(page.locator('.VPLocalSearchBox input[type="search"]')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('.VPLocalSearchBox')).toBeHidden()
    await expect(trigger).toBeFocused()
  }
})

test('warm white is the only appearance and native navigation labels are localized', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vitepress-theme-appearance', 'dark')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articlePath)

  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('.VPNavBarAppearance')).toHaveCount(0)
  await expect(page.locator('.VPLocalNav .menu')).toContainText('知识库目录')
  await page.locator('.VPNavBarHamburger').click()
  await expect(page.locator('.VPNavScreen')).not.toContainText('显示模式')

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('.VPNavBarAppearance')).toHaveCount(0)

  const palette = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return {
      scheme: root.colorScheme,
      page: root.getPropertyValue('--mkd-paper').trim(),
      raised: root.getPropertyValue('--mkd-paper-raised').trim(),
      nav: root.getPropertyValue('--mkd-paper-muted').trim()
    }
  })
  expect(palette).toEqual({
    scheme: 'light',
    page: '#faf9f5',
    raised: '#fffdf8',
    nav: '#f2efe7'
  })
})
