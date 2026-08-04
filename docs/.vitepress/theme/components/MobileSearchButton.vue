<script setup>
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

function openSearch() {
  const trigger = document.querySelector('.VPNavBarSearch button, .DocSearch-Button')
  if (trigger instanceof HTMLElement) {
    trigger.click()
    return
  }

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
}
</script>

<template>
  <button
    class="mkd-mobile-search"
    type="button"
    aria-label="搜索文档"
    aria-haspopup="dialog"
    @click="openSearch"
  >
    <PhMagnifyingGlass :size="19" aria-hidden="true" />
    <span>搜索</span>
  </button>
</template>
