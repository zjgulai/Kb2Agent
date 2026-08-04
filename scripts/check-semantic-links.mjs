#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import {
  extractDisplayNumber,
  loadKnowledgeDocuments,
  normalizeDisplayNumber
} from './knowledge-registry.mjs'

const root = process.cwd()
const errors = []

function withoutQueryOrHash(url) {
  return url.split('#')[0].split('?')[0]
}

function normalizeRoute(url) {
  let route = withoutQueryOrHash(url)
  if (route.startsWith('/Kb2Agent/')) route = `/${route.slice('/Kb2Agent/'.length)}`
  route = route.replace(/\.md$/, '').replace(/\.html$/, '')
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1)
  return route
}

async function main() {
  const documents = await loadKnowledgeDocuments(root)
  const byRoute = new Map()
  const byAbsolutePath = new Map()

  for (const document of documents) {
    byRoute.set(document.frontmatter.route, document)
    byRoute.set(document.derivedRoute, document)
    byAbsolutePath.set(document.absolutePath, document)
  }

  let internalKnowledgeLinks = 0
  let labelledChapterLinks = 0

  for (const source of documents) {
    for (const link of source.ast.links) {
      if (/^(?:https?:\/\/|mailto:|tel:|#)/i.test(link.url)) continue

      const rawPath = withoutQueryOrHash(link.url)
      if (!rawPath) continue

      let target = null
      if (rawPath.startsWith('/')) {
        target = byRoute.get(normalizeRoute(rawPath)) || null
      } else {
        const resolved = path.resolve(path.dirname(source.absolutePath), decodeURIComponent(rawPath))
        const candidates = [resolved]
        if (!path.extname(resolved)) candidates.push(`${resolved}.md`, path.join(resolved, 'index.md'))
        target = candidates.map((candidate) => byAbsolutePath.get(candidate)).find(Boolean) || null
      }

      const pointsToKnowledge = rawPath.startsWith('/knowledge/') || rawPath.startsWith('/Kb2Agent/knowledge/') || rawPath.endsWith('.md')
      if (!target) {
        if (pointsToKnowledge) {
          errors.push(`${source.relativeSource}:${link.line} unresolved knowledge target ${link.url}`)
        }
        continue
      }

      internalKnowledgeLinks += 1
      const labelDisplay = extractDisplayNumber(link.text)
      if (labelDisplay === null) continue

      labelledChapterLinks += 1
      const targetDisplay = normalizeDisplayNumber(target.frontmatter.displayNumber)
      if (labelDisplay !== targetDisplay) {
        errors.push(
          `${source.relativeSource}:${link.line} label ${JSON.stringify(link.text)} says ${labelDisplay}, ` +
            `but ${target.frontmatter.docId} is ${targetDisplay} (${link.url})`
        )
      }
    }
  }

  if (errors.length > 0) {
    console.error('Semantic link contract failed:')
    for (const error of errors) console.error(`  ${error}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Semantic link contract passed: ${internalKnowledgeLinks} knowledge links resolved; ` +
      `${labelledChapterLinks} chapter-labelled links agree with target displayNumber.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
