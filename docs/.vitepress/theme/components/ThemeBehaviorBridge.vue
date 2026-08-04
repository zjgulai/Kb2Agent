<script setup>
import { useRoute } from 'vitepress'
import { nextTick, onMounted, onUnmounted, watch } from 'vue'

const route = useRoute()

const searchTriggerSelector = '.VPNavBarSearch button, .mkd-mobile-search, .evidence-search'

let observer
let sidebarResizeObserver
let observedSidebar
let searchOpener
let searchWasOpen = false
let restoreSearchFocus = false
let focusFrame = 0
let sidebarFocusFrame = 0
let sidebarPositionFrame = 0
let sidebarPositionSettleFrame = 0
let sidebarWasOpen = false

function closestElement(target, selector) {
  return target instanceof Element ? target.closest(selector) : null
}

function localizeGlobalNavigation() {
  const hamburger = document.querySelector('.VPNavBarHamburger')
  if (hamburger instanceof HTMLButtonElement) {
    hamburger.setAttribute('aria-label', '全局导航')
  }
}

function syncLocalOutlineState() {
  document.querySelectorAll('.VPLocalNavOutlineDropdown').forEach((dropdown) => {
    const trigger = dropdown.querySelector(':scope > button')
    if (!(trigger instanceof HTMLButtonElement) || !trigger.querySelector('.menu-text')) return

    const isOpen = trigger.classList.contains('open')
    trigger.setAttribute('aria-expanded', String(isOpen))
    trigger.setAttribute('aria-controls', 'VPLocalNavOutlineItems')

    const items = dropdown.querySelector(':scope > .items')
    if (items instanceof HTMLElement) {
      items.id = 'VPLocalNavOutlineItems'
    }
  })
}

function scheduleFocusRestore(opener) {
  window.cancelAnimationFrame(focusFrame)
  focusFrame = window.requestAnimationFrame(() => {
    const fallback = document.querySelector('.VPNavBarSearch button')
    const target = opener?.isConnected ? opener : fallback
    if (target instanceof HTMLElement) target.focus()
  })
}

function syncSearchSemantics() {
  const dialog = document.querySelector('.VPLocalSearchBox')
  if (!(dialog instanceof HTMLElement)) return

  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', '站内搜索')
  dialog.removeAttribute('aria-owns')
  dialog.removeAttribute('aria-expanded')
  dialog.removeAttribute('aria-haspopup')
  dialog.removeAttribute('aria-labelledby')

  const input = dialog.querySelector('input[type="search"]')
  if (input instanceof HTMLInputElement) {
    input.setAttribute('aria-label', input.placeholder || '搜索文档')
    input.removeAttribute('aria-activedescendant')
    input.removeAttribute('aria-autocomplete')
    input.removeAttribute('aria-controls')
    input.removeAttribute('aria-labelledby')
  }

  const results = dialog.querySelector('ul.results')
  if (!(results instanceof HTMLUListElement)) return

  results.removeAttribute('role')
  results.removeAttribute('aria-labelledby')
  results.setAttribute('aria-label', '搜索结果')
  results.querySelectorAll(':scope > li').forEach((item) => {
    item.removeAttribute('role')
    item.removeAttribute('aria-selected')
  })

  let status = dialog.querySelector('.mkd-search-status')
  if (!(status instanceof HTMLElement)) {
    status = document.createElement('p')
    status.className = 'mkd-search-status'
    status.setAttribute('role', 'status')
    status.setAttribute('aria-live', 'polite')
    status.setAttribute('aria-atomic', 'true')
    dialog.append(status)
  }
  const selected = results.querySelector('a.result.selected')
  const selectedName = selected?.getAttribute('aria-label') || selected?.textContent?.trim() || ''
  const announcement = selectedName ? `当前选择：${selectedName}` : ''
  if (status.textContent !== announcement) status.textContent = announcement

  dialog.querySelectorAll('kbd[aria-label]').forEach((key) => {
    if (key.textContent?.trim()) {
      key.removeAttribute('aria-label')
    } else {
      key.setAttribute('role', 'img')
    }
  })
}

function syncSearchState() {
  const searchIsOpen = Boolean(document.querySelector('.VPLocalSearchBox'))
  if (searchWasOpen && !searchIsOpen) {
    const opener = searchOpener
    const shouldRestore = restoreSearchFocus
    searchOpener = undefined
    restoreSearchFocus = false
    if (shouldRestore) scheduleFocusRestore(opener)
  }
  searchWasOpen = searchIsOpen
}

function syncSidebarFocus() {
  const sidebar = document.querySelector('.VPSidebar')
  const sidebarIsOpen = sidebar?.classList.contains('open') ?? false

  if (sidebarIsOpen && !sidebarWasOpen) {
    window.cancelAnimationFrame(sidebarFocusFrame)
    sidebarFocusFrame = window.requestAnimationFrame(() => {
      if (!sidebar?.classList.contains('open')) return
      const navigation = sidebar.querySelector('#VPSidebarNav')
      if (navigation instanceof HTMLElement) navigation.focus()
    })
  }

  sidebarWasOpen = sidebarIsOpen
}

function positionActiveSidebarItem() {
  const sidebar = document.querySelector('.VPSidebar')
  const activeItem = sidebar?.querySelector('.VPSidebarItem.is-active > .item')
  if (!(sidebar instanceof HTMLElement) || !(activeItem instanceof HTMLElement)) return

  const sidebarStyle = getComputedStyle(sidebar)
  const sidebarRect = sidebar.getBoundingClientRect()
  if (
    sidebarStyle.display === 'none' ||
    sidebarStyle.visibility === 'hidden' ||
    Number(sidebarStyle.opacity) === 0 ||
    sidebarRect.width === 0 ||
    sidebarRect.height === 0
  ) return

  const activeRect = activeItem.getBoundingClientRect()
  const safeTop = sidebarRect.top + 24
  const safeBottom = sidebarRect.bottom - 24
  if (activeRect.top >= safeTop && activeRect.bottom <= safeBottom) return

  const centeredOffset = activeRect.top - sidebarRect.top - (sidebar.clientHeight - activeRect.height) / 2
  sidebar.scrollTo({ top: Math.max(0, sidebar.scrollTop + centeredOffset), behavior: 'auto' })
}

function scheduleActiveSidebarPosition() {
  window.cancelAnimationFrame(sidebarPositionFrame)
  window.cancelAnimationFrame(sidebarPositionSettleFrame)
  sidebarPositionFrame = window.requestAnimationFrame(() => {
    sidebarPositionSettleFrame = window.requestAnimationFrame(positionActiveSidebarItem)
  })
}

function syncSidebarResizeObserver() {
  const sidebar = document.querySelector('.VPSidebar')
  if (sidebar === observedSidebar) return

  sidebarResizeObserver?.disconnect()
  observedSidebar = sidebar instanceof HTMLElement ? sidebar : undefined
  if (observedSidebar) {
    sidebarResizeObserver = new ResizeObserver(scheduleActiveSidebarPosition)
    sidebarResizeObserver.observe(observedSidebar)
  }
}

function syncSidebarGroupContracts() {
  document.querySelectorAll('.VPSidebarItem.collapsible').forEach((group, index) => {
    const trigger = group.querySelector(':scope > .item[role="button"]')
    const items = group.querySelector(':scope > .items')
    const caret = trigger?.querySelector(':scope > .caret')
    if (!(trigger instanceof HTMLElement)) return

    trigger.setAttribute('aria-expanded', String(!group.classList.contains('collapsed')))
    if (items instanceof HTMLElement) {
      items.id = `VPSidebarGroup-${index + 1}`
      trigger.setAttribute('aria-controls', items.id)
    }

    if (caret instanceof HTMLElement) {
      caret.removeAttribute('role')
      caret.removeAttribute('tabindex')
      caret.removeAttribute('aria-label')
      caret.setAttribute('aria-hidden', 'true')
    }
  })
}

function syncContracts() {
  localizeGlobalNavigation()
  syncLocalOutlineState()
  syncSearchSemantics()
  syncSearchState()
  syncSidebarFocus()
  syncSidebarGroupContracts()
  syncSidebarResizeObserver()
  scheduleActiveSidebarPosition()
}

function rememberKeyboardSearchOpener(event) {
  const isShortcut = (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || event.key === '/'
  if (!isShortcut || document.querySelector('.VPLocalSearchBox')) return

  const active = document.activeElement
  searchOpener = active instanceof HTMLElement && active !== document.body
    ? active
    : document.querySelector('.VPNavBarSearch button')
}

function onDocumentClick(event) {
  const opener = closestElement(event.target, searchTriggerSelector)
  if (opener instanceof HTMLElement && (event.isTrusted || !searchOpener)) {
    searchOpener = opener
    restoreSearchFocus = false
  }

  if (document.querySelector('.VPLocalSearchBox') && closestElement(event.target, '.backdrop, .back-button')) {
    restoreSearchFocus = true
  }
}

function onDocumentKeydown(event) {
  rememberKeyboardSearchOpener(event)

  const sidebarGroup = closestElement(event.target, '.VPSidebarItem.collapsible > .item[role="button"]')
  if (event.key === ' ' && sidebarGroup instanceof HTMLElement) {
    event.preventDefault()
    sidebarGroup.click()
    return
  }

  if (event.key !== 'Escape') return

  if (document.querySelector('.VPLocalSearchBox')) {
    restoreSearchFocus = true
    return
  }

  const hamburger = document.querySelector('.VPNavBarHamburger[aria-expanded="true"]')
  if (hamburger instanceof HTMLButtonElement) {
    event.preventDefault()
    hamburger.click()
    scheduleFocusRestore(hamburger)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeydown, true)

  observer = new MutationObserver(syncContracts)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true
  })
  syncContracts()
})

watch(() => route.path, async () => {
  await nextTick()
  scheduleActiveSidebarPosition()
})

onUnmounted(() => {
  observer?.disconnect()
  sidebarResizeObserver?.disconnect()
  document.removeEventListener('click', onDocumentClick, true)
  document.removeEventListener('keydown', onDocumentKeydown, true)
  window.cancelAnimationFrame(focusFrame)
  window.cancelAnimationFrame(sidebarFocusFrame)
  window.cancelAnimationFrame(sidebarPositionFrame)
  window.cancelAnimationFrame(sidebarPositionSettleFrame)
})
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
