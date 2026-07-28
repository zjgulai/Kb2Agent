import DefaultTheme from 'vitepress/theme'
import { onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'

function createLightboxDOM() {
  if (document.getElementById('mkd-lightbox')) return

  const overlay = document.createElement('div')
  overlay.id = 'mkd-lightbox'
  overlay.className = 'mkd-lightbox'
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('role', 'dialog')

  const inner = document.createElement('div')
  inner.className = 'mkd-lightbox-inner'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'mkd-lightbox-close'
  closeBtn.setAttribute('aria-label', '关闭')
  closeBtn.textContent = '✕'

  const content = document.createElement('div')
  content.className = 'mkd-lightbox-content'
  content.id = 'mkd-lightbox-content'

  inner.appendChild(closeBtn)
  inner.appendChild(content)
  overlay.appendChild(inner)
  document.body.appendChild(overlay)

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox() })
  closeBtn.addEventListener('click', closeLightbox)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox() })
}

function openLightbox(contentNode) {
  createLightboxDOM()
  const overlay = document.getElementById('mkd-lightbox')
  const contentEl = document.getElementById('mkd-lightbox-content')
  if (!overlay || !contentEl) return
  contentEl.innerHTML = ''
  contentEl.appendChild(contentNode)
  overlay.classList.add('active')
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  const overlay = document.getElementById('mkd-lightbox')
  if (!overlay) return
  overlay.classList.remove('active')
  document.body.style.overflow = ''
}

function bindMermaidLightbox() {
  document.querySelectorAll('.vp-doc .mermaid:not([data-lightbox-bound])').forEach((el) => {
    el.setAttribute('data-lightbox-bound', '1')
    el.style.cursor = 'zoom-in'
    if (!el.querySelector('.mkd-zoom-hint')) {
      const hint = document.createElement('div')
      hint.className = 'mkd-zoom-hint'
      hint.textContent = '点击放大'
      el.appendChild(hint)
    }
    el.addEventListener('click', () => {
      const svg = el.querySelector('svg')
      if (!svg) return
      const clone = svg.cloneNode(true)
      clone.removeAttribute('width')
      clone.removeAttribute('height')
      clone.style.cssText = 'max-width:min(90vw,1400px);height:auto;display:block;'
      openLightbox(clone)
    })
  })
}

function bindImgLightbox() {
  document.querySelectorAll('.vp-doc img:not([data-lightbox-bound])').forEach((img) => {
    if (img.naturalWidth > 0 && img.naturalWidth < 100) return
    img.setAttribute('data-lightbox-bound', '1')
    img.addEventListener('click', () => {
      const clone = img.cloneNode(true)
      clone.style.cssText = 'max-width:100%;max-height:85vh;height:auto;display:block;margin:0 auto;cursor:default;'
      clone.removeAttribute('data-lightbox-bound')
      openLightbox(clone)
    })
  })
}

function bindSidebarTooltips() {
  document.querySelectorAll('.VPSidebarItem.level-1 .item .link .text').forEach((el) => {
    const full = el.textContent.trim()
    if (full) el.parentElement.setAttribute('title', full)
  })
}

function bindAll() {
  bindMermaidLightbox()
  bindImgLightbox()
  bindSidebarTooltips()
}

function scheduleBind() {
  nextTick(() => {
    bindAll()
    setTimeout(bindAll, 800)
    setTimeout(bindAll, 2200)
  })
}

export default {
  extends: DefaultTheme,

  enhanceApp({ app }) {},

  setup() {
    const route = useRoute()
    onMounted(() => { scheduleBind() })
    watch(() => route.path, () => {
      closeLightbox()
      scheduleBind()
    })
  }
}
