#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { createMarkdownRenderer } from 'vitepress'

const root = process.cwd()
const docsDir = path.join(root, 'docs')
const base = '/Kb2Agent/'
const attempts = 3
const timeoutMs = 8_000
const concurrency = 8
const errors = []
const warnings = []
const externalReferences = new Map()
const fileChecks = []
const claimRegistryPath = path.join(root, 'knowledge-system', 'claims.yml')

function normalizeRoute(filePath) {
  const relative = path.relative(docsDir, filePath).replaceAll(path.sep, '/')
  if (relative === 'index.md') return '/'
  return `/${relative.replace(/(?:\/index)?\.md$/, '')}`
}

function decodeFragment(fragment) {
  try {
    return decodeURIComponent(fragment)
  } catch {
    return fragment
  }
}

function describe(reference) {
  return `${path.relative(root, reference.file)}:${reference.line}`
}

async function collectMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(target))
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(target)
  }
  return files.sort()
}

function addExternal(url, reference) {
  const references = externalReferences.get(url) || []
  references.push(reference)
  externalReferences.set(url, references)
}

function normalizeInternalPath(urlPath, sourceRoute) {
  let value = urlPath
  if (value.startsWith(base)) value = `/${value.slice(base.length)}`
  if (value.startsWith('/')) return path.posix.normalize(value)
  const sourceDirectory = sourceRoute === '/' ? '/' : path.posix.dirname(sourceRoute)
  return path.posix.normalize(path.posix.join(sourceDirectory, value || '.'))
}

function candidateRoutes(rawPath, sourceRoute) {
  let normalized = normalizeInternalPath(rawPath, sourceRoute)
  normalized = normalized.replace(/\.html$/, '').replace(/\.md$/, '')
  if (normalized !== '/' && normalized.endsWith('/')) normalized = normalized.slice(0, -1)
  const candidates = new Set([normalized || '/'])
  if (normalized.endsWith('/index')) candidates.add(normalized.slice(0, -6) || '/')
  return candidates
}

async function requestExternal(url) {
  let lastResult
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'MKD-Guide-Link-Audit/1.0' }
      })
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            range: 'bytes=0-0',
            'user-agent': 'MKD-Guide-Link-Audit/1.0'
          }
        })
      }
      lastResult = { kind: 'http', status: response.status, finalUrl: response.url }
      if (![408, 425, 429].includes(response.status) && response.status < 500) return lastResult
    } catch (error) {
      lastResult = { kind: 'network', message: error.name === 'AbortError' ? 'timeout' : error.message }
    } finally {
      clearTimeout(timer)
    }
  }
  return lastResult
}

async function mapLimit(items, limit, worker) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

const files = await collectMarkdownFiles(docsDir)
const markdown = await createMarkdownRenderer(docsDir, {}, base)
const pages = new Map()

for (const file of files) {
  const raw = await fs.readFile(file, 'utf8')
  const parsed = matter(raw)
  const route = normalizeRoute(file)
  const rendered = await markdown.render(parsed.content, { path: file })
  const anchors = new Set([...rendered.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
  pages.set(route, { file, route, anchors, content: parsed.content })
}

let internalCount = 0
for (const page of pages.values()) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(page.content)
  visit(tree, 'link', (node) => {
    const reference = { file: page.file, line: node.position?.start.line || 1 }
    let url
    try {
      url = new URL(node.url, 'https://mkd.local')
    } catch {
      errors.push(`${describe(reference)} malformed URL: ${node.url}`)
      return
    }

    if (['mailto:', 'tel:'].includes(url.protocol)) return
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.hostname !== 'mkd.local') addExternal(node.url, reference)
      else validateInternal(node.url, page, reference)
      return
    }
    errors.push(`${describe(reference)} unsupported URL scheme: ${node.url}`)
  })
}

const claimRegistrySource = await fs.readFile(claimRegistryPath, 'utf8')
const claimRegistry = matter(`---\n${claimRegistrySource.trimEnd()}\n---\n`).data
const claimRegistryLines = claimRegistrySource.split('\n')
for (const source of claimRegistry.sources || []) {
  if (source.kind !== 'official-web' || typeof source.url !== 'string') continue
  const line = claimRegistryLines.findIndex((value) => value.includes(source.url)) + 1
  addExternal(source.url, { file: claimRegistryPath, line: line || 1 })
}

function validateInternal(rawUrl, sourcePage, reference) {
  internalCount += 1
  const hashIndex = rawUrl.indexOf('#')
  const queryIndex = rawUrl.indexOf('?')
  const boundary = [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? rawUrl.length
  const rawPath = rawUrl.slice(0, boundary)
  const fragment = hashIndex >= 0 ? rawUrl.slice(hashIndex + 1).split('?')[0] : ''
  const target = [...candidateRoutes(rawPath, sourcePage.route)]
    .map((candidate) => pages.get(candidate))
    .find(Boolean)

  if (!target) {
    const fileTarget = path.resolve(path.dirname(sourcePage.file), rawPath)
    fileChecks.push(fs.access(fileTarget).catch(() => {
      errors.push(`${describe(reference)} missing internal target: ${rawUrl}`)
    }))
    return
  }
  if (fragment && !target.anchors.has(decodeFragment(fragment))) {
    errors.push(`${describe(reference)} missing anchor ${fragment} in ${target.route}`)
  }
}

await Promise.all(fileChecks)

const externalUrls = [...externalReferences.keys()].sort()
await mapLimit(externalUrls, concurrency, async (url) => {
  const result = await requestExternal(url)
  const locations = externalReferences.get(url).map(describe).join(', ')
  if (result?.kind === 'http' && [400, 404, 410].includes(result.status)) {
    errors.push(`${locations} external HTTP ${result.status}: ${url}`)
  } else if (result?.kind === 'http' && [401, 403, 451].includes(result.status)) {
    warnings.push(`${locations} access-restricted (HTTP ${result.status}; existence observed, content not verified): ${url}`)
  } else if (result?.kind === 'http' && result.status < 400) {
    // A successful response is the only state counted as externally verified.
  } else if (result?.kind === 'http') {
    warnings.push(`${locations} temporarily unreachable (HTTP ${result.status} after ${attempts} attempts): ${url}`)
  } else {
    warnings.push(`${locations} network unreachable (${result?.message || 'unknown error'} after ${attempts} attempts): ${url}`)
  }
})

for (const warning of warnings) console.warn(`WARN ${warning}`)

if (errors.length > 0) {
  console.error(`Link audit failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`  ${error}`)
  process.exitCode = 1
} else {
  console.log(`Link audit passed: ${internalCount} internal references and ${externalUrls.length} external URLs; ${warnings.length} temporarily unreachable.`)
}
