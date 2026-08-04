<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import {
  PhArrowsOutSimple,
  PhCornersOut,
  PhMagnifyingGlassPlus,
  PhX
} from '@phosphor-icons/vue'

const props = defineProps({
  encoded: { type: String, required: true }
})

const { isDark } = useData()
const host = ref(null)
const dialog = ref(null)
const renderedSvg = ref('')
const errorMessage = ref('')
const isVisible = ref(false)
const isOpen = ref(false)
const zoom = ref('fit')
let observer
let triggerElement
let renderVersion = 0

const source = computed(() => {
  if (typeof window === 'undefined') return ''
  const bytes = Uint8Array.from(atob(props.encoded), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
})

const zoomStyle = computed(() => {
  if (zoom.value === 'fit') return { width: '100%' }
  return { width: `${Number(zoom.value) * 100}%` }
})

async function renderDiagram() {
  if (!isVisible.value || !source.value) return
  const version = ++renderVersion
  errorMessage.value = ''
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark.value ? 'dark' : 'base',
      themeVariables: isDark.value
        ? { background: '#171a1f', primaryColor: '#243448', primaryTextColor: '#f0eee7', lineColor: '#9baec4' }
        : { background: '#f5f2e9', primaryColor: '#dbe4ec', primaryTextColor: '#20252b', lineColor: '#637a92' }
    })
    const id = `mkd-mermaid-${Math.abs(hash(source.value))}-${version}`
    const result = await mermaid.render(id, source.value)
    if (version === renderVersion) renderedSvg.value = result.svg
  } catch (error) {
    if (version === renderVersion) {
      renderedSvg.value = ''
      errorMessage.value = error instanceof Error ? error.message : '图表渲染失败'
    }
  }
}

function hash(value) {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) - result + value.charCodeAt(index)) | 0
  }
  return result
}

async function openDialog(event) {
  triggerElement = event.currentTarget
  isOpen.value = true
  zoom.value = 'fit'
  document.documentElement.classList.add('has-modal')
  await nextTick()
  dialog.value?.querySelector('button')?.focus()
}

function closeDialog() {
  isOpen.value = false
  document.documentElement.classList.remove('has-modal')
  triggerElement?.focus()
}

function handleDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDialog()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = [...dialog.value.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    isVisible.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      isVisible.value = true
      observer?.disconnect()
    }
  }, { rootMargin: '240px 0px' })
  if (host.value) observer.observe(host.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.documentElement.classList.remove('has-modal')
})

watch([isVisible, isDark], renderDiagram, { immediate: true })
</script>

<template>
  <figure ref="host" class="mermaid-diagram">
    <figcaption class="mermaid-toolbar">
      <span>流程图</span>
      <button type="button" :disabled="!renderedSvg" aria-label="放大查看流程图" @click="openDialog">
        <PhMagnifyingGlassPlus :size="18" aria-hidden="true" />
        放大查看
      </button>
    </figcaption>
    <div v-if="renderedSvg" class="mermaid-canvas" v-html="renderedSvg" />
    <div v-else-if="errorMessage" class="mermaid-error" role="status">
      图表渲染失败：{{ errorMessage }}
    </div>
    <div v-else class="mermaid-loading" role="status">图表接近视口时加载…</div>
    <details class="mermaid-source">
      <summary>查看 Mermaid 源码</summary>
      <pre><code>{{ source }}</code></pre>
    </details>
  </figure>

  <Teleport to="body">
    <div v-if="isOpen" class="mermaid-modal-backdrop" @mousedown.self="closeDialog">
      <section
        ref="dialog"
        class="mermaid-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mermaid-dialog-title"
        @keydown="handleDialogKeydown"
      >
        <header>
          <div>
            <p>Diagram viewer</p>
            <h2 id="mermaid-dialog-title">流程图放大查看</h2>
          </div>
          <button type="button" aria-label="关闭流程图" @click="closeDialog">
            <PhX :size="20" aria-hidden="true" />
          </button>
        </header>
        <div class="mermaid-zoom-controls" aria-label="缩放控制">
          <button type="button" :aria-pressed="zoom === 'fit'" @click="zoom = 'fit'">
            <PhCornersOut :size="17" aria-hidden="true" />适应窗口
          </button>
          <button v-for="value in [1, 1.5, 2]" :key="value" type="button" :aria-pressed="zoom === value" @click="zoom = value">
            {{ Math.round(value * 100) }}%
          </button>
        </div>
        <div class="mermaid-modal-scroll" tabindex="0" aria-label="可滚动的流程图画布">
          <div class="mermaid-modal-canvas" :style="zoomStyle" v-html="renderedSvg" />
        </div>
        <footer>
          <PhArrowsOutSimple :size="17" aria-hidden="true" />
          可用滚动查看超出窗口的内容，按 Escape 关闭。
        </footer>
      </section>
    </div>
  </Teleport>
</template>
