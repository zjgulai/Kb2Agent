import { expect, test } from '@playwright/test'

const articlePath = 'knowledge/05-security-compliance'
const lateArticlePath = 'knowledge/22-agent-design'

function captureRuntimeErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return errors
}

async function settleLayout(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function expectSingleCatalogFieldLabels(page) {
  const link = page.locator('.catalog-row').first()
  const expectedName = await link.evaluate((element) => element.innerText.replace(/\s+/g, ' ').trim())
  await expect(link).toHaveAccessibleName(expectedName)
  for (const label of ['验证状态', '示例代码', '适用阶段', '最近复核']) {
    expect(expectedName.match(new RegExp(label, 'g')) ?? []).toHaveLength(1)
  }
}

test('homepage uses compact non-scrolling catalog rows through 959px', async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('./')

  for (const width of [390, 767, 768, 959]) {
    await page.setViewportSize({ width, height: 900 })
    await settleLayout(page)

    await expect(page.locator('.evidence-summary')).toBeVisible()
    await expect(page.locator('.maturity-summary > li')).toHaveCount(4)
    await expect(page.locator('.recommended-summary > a')).toHaveCount(3)
    await expect(page.locator('.catalog-head')).toBeHidden()

    const geometry = await page.locator('.evidence-home').evaluate((home) => {
      const rect = home.getBoundingClientRect()
      const table = home.querySelector('.catalog-table')
      const group = home.querySelector('.catalog-group')
      const title = home.querySelector('.catalog-topic strong')
      const verifiedLabel = home.querySelector('.catalog-status[data-label="验证状态"] .catalog-field-label')
      return {
        centerOffset: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2),
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        tableOverflow: getComputedStyle(table).overflowX,
        tableOverflowAmount: table.scrollWidth - table.clientWidth,
        groupMinWidth: getComputedStyle(group).minWidth,
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        verifiedLabelPosition: getComputedStyle(verifiedLabel).position
      }
    })

    expect(geometry.centerOffset).toBeLessThanOrEqual(1)
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1)
    expect(geometry.tableOverflow).toBe('hidden')
    expect(geometry.tableOverflowAmount).toBeLessThanOrEqual(1)
    expect(geometry.groupMinWidth).toBe('0px')
    expect(geometry.titleFontSize).toBeGreaterThanOrEqual(13)
    expect(geometry.verifiedLabelPosition).toBe('static')
    await expectSingleCatalogFieldLabels(page)
  }

  await page.setViewportSize({ width: 960, height: 900 })
  await settleLayout(page)
  await expect(page.locator('.catalog-head')).toBeVisible()

  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1024 })
    await settleLayout(page)
    const home = await page.locator('.evidence-home').boundingBox()
    expect(Math.abs((home?.x ?? 0) + (home?.width ?? 0) / 2 - width / 2)).toBeLessThanOrEqual(1)
    expect(home?.width ?? 0).toBeLessThanOrEqual(1240)
    await expectSingleCatalogFieldLabels(page)
  }

  const visibleTitles = await page.locator('.catalog-topic strong').allTextContents()
  expect(visibleTitles.join('\n')).not.toMatch(/[—–]/)
  await expect(page.locator('.catalog-row')).toHaveCount(26)
  await expect(page.getByRole('link', { name: /章节 00 .*验证状态.*示例代码.*适用阶段.*最近复核/ })).toBeVisible()
  expect(await page.locator('.catalog-row').first().getAttribute('role')).toBeNull()
  expect(runtimeErrors).toEqual([])
})

test('1180 and 1440 boundaries implement the four reading shell modes', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 900 })
  await page.goto(articlePath)

  const samples = []
  for (const width of [767, 768, 1179, 1180, 1439, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await settleLayout(page)

    const sidebar = page.locator('.VPSidebar')
    const libraryMenu = page.locator('.VPLocalNav .menu')
    const localOutline = page.locator('.VPLocalNavOutlineDropdown')
    const desktopOutline = page.locator('.VPDocAsideOutline')
    const contentBox = await page.locator('.VPDoc .content-container').boundingBox()

    if (width < 1180) {
      await expect(sidebar).toBeHidden()
      await expect(libraryMenu).toBeVisible()
    } else {
      await expect(sidebar).toBeVisible()
      await expect(libraryMenu).toBeHidden()
    }

    if (width < 1440) {
      await expect(localOutline).toBeVisible()
      await expect(desktopOutline).toBeHidden()
    } else {
      await expect(localOutline).toBeHidden()
      await expect(desktopOutline).toBeVisible()
    }

    const expectedWidth = width <= 767 ? width - 40 : width < 1180 ? 720 : 736
    const articleWidth = contentBox?.width ?? 0
    const articleCenterOffset = Math.abs((contentBox?.x ?? 0) + articleWidth / 2 - width / 2)
    expect(Math.abs(articleWidth - expectedWidth)).toBeLessThanOrEqual(1)
    expect(articleCenterOffset).toBeLessThanOrEqual(width < 1180 ? 1 : 36)

    if (width >= 1180) {
      const sidebarBox = await sidebar.boundingBox()
      expect(Math.abs((sidebarBox?.width ?? 0) - (width < 1440 ? 232 : 240))).toBeLessThanOrEqual(1)
      expect((contentBox?.x ?? 0) - (sidebarBox?.x ?? 0) - (sidebarBox?.width ?? 0)).toBeGreaterThanOrEqual(23)
    }

    if (width >= 1440) {
      const asideBox = await page.locator('.VPDoc .aside').boundingBox()
      expect(Math.abs((asideBox?.width ?? 0) - 216)).toBeLessThanOrEqual(1)
      expect((asideBox?.x ?? 0) - (contentBox?.x ?? 0) - articleWidth).toBeGreaterThanOrEqual(23)
      expect((asideBox?.x ?? 0) + (asideBox?.width ?? 0)).toBeLessThanOrEqual(width)
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    samples.push({ width, x: contentBox?.x ?? 0, articleWidth })
  }

  for (const [leftWidth, rightWidth] of [[767, 768], [1179, 1180], [1439, 1440]]) {
    const left = samples.find((sample) => sample.width === leftWidth)
    const right = samples.find((sample) => sample.width === rightWidth)
    expect(Math.abs(right.x - left.x)).toBeLessThanOrEqual(32)
    expect(Math.abs(right.articleWidth - left.articleWidth)).toBeLessThanOrEqual(16)
  }
})

test('active chapter is positioned in both the tablet drawer and desktop rail', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 520 })
  await page.goto(lateArticlePath)

  const menu = page.locator('.VPLocalNav .menu')
  const sidebar = page.locator('.VPSidebar')
  await expect(menu).toBeVisible()
  await expect(sidebar).toBeHidden()
  await sidebar.evaluate((element) => { element.scrollTop = 0 })

  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(sidebar).toBeVisible()
  await expect(page.locator('#VPSidebarNav')).toBeFocused()
  await expect.poll(async () => sidebar.evaluate((element) => {
    const active = element.querySelector('.VPSidebarItem.is-active > .item')
    const sidebarRect = element.getBoundingClientRect()
    const activeRect = active?.getBoundingClientRect()
    return Boolean(activeRect && activeRect.top >= sidebarRect.top + 24 && activeRect.bottom <= sidebarRect.bottom - 24)
  })).toBe(true)

  await page.keyboard.press('Escape')
  await expect(sidebar).toBeHidden()
  await expect(menu).toBeFocused()

  await page.setViewportSize({ width: 1180, height: 520 })
  await settleLayout(page)
  await expect(sidebar).toBeVisible()
  await expect(menu).toBeHidden()
  await expect.poll(async () => sidebar.evaluate((element) => {
    const active = element.querySelector('.VPSidebarItem.is-active > .item')
    const sidebarRect = element.getBoundingClientRect()
    const activeRect = active?.getBoundingClientRect()
    return Boolean(activeRect && activeRect.top >= sidebarRect.top + 24 && activeRect.bottom <= sidebarRect.bottom - 24)
  })).toBe(true)

  const groups = page.locator('.VPSidebarItem.level-0.collapsible')
  await expect(groups).toHaveCount(4)
  await expect(groups.filter({ has: page.locator('.VPSidebarItem.is-active') })).toHaveCount(1)
  await expect(page.locator('.VPSidebarItem.level-0.collapsible.collapsed')).toHaveCount(3)

  const collapsedGroup = groups.filter({ hasText: '基础篇' })
  const groupTrigger = collapsedGroup.locator(':scope > .item[role="button"]')
  await expect(groupTrigger).toHaveAttribute('aria-expanded', 'false')
  await groupTrigger.focus()
  await page.keyboard.press('Space')
  await expect(groupTrigger).toHaveAttribute('aria-expanded', 'true')
})

test('responsive shell sweep has no overflow or unbounded geometry discontinuity', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto(articlePath)

  const widths = [...new Set([
    ...Array.from({ length: 53 }, (_, index) => 768 + index * 16),
    1179,
    1180,
    1439,
    1440,
    1600
  ])].sort((left, right) => left - right)

  const samples = []
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await settleLayout(page)
    const sample = await page.evaluate(() => {
      function isVisible(selector) {
        const element = document.querySelector(selector)
        if (!element) return false
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.right > 0 && rect.left < innerWidth
      }

      const content = document.querySelector('.VPDoc .content-container')?.getBoundingClientRect()
      return {
        viewport: innerWidth,
        overflow: document.documentElement.scrollWidth - innerWidth,
        x: content?.x ?? 0,
        articleWidth: content?.width ?? 0,
        sidebarVisible: isVisible('.VPSidebar'),
        libraryMenuVisible: isVisible('.VPLocalNav .menu'),
        localOutlineVisible: isVisible('.VPLocalNavOutlineDropdown'),
        desktopOutlineVisible: isVisible('.VPDoc .aside .VPDocAsideOutline')
      }
    })

    expect(sample.overflow).toBeLessThanOrEqual(1)
    expect(sample.sidebarVisible).toBe(width >= 1180)
    expect(sample.libraryMenuVisible).toBe(width < 1180)
    expect(sample.localOutlineVisible).toBe(width < 1440)
    expect(sample.desktopOutlineVisible).toBe(width >= 1440)
    samples.push(sample)
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    if (current.viewport - previous.viewport <= 16) {
      expect(Math.abs(current.x - previous.x)).toBeLessThanOrEqual(32)
      expect(Math.abs(current.articleWidth - previous.articleWidth)).toBeLessThanOrEqual(16)
    }
  }
})
