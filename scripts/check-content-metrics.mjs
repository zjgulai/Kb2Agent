#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { collectMarkdownAst } from './markdown-metrics.mjs'

const root = process.cwd()
const knowledgeDir = path.join(root, 'docs', 'knowledge')
const baselinePath = path.join(root, 'knowledge-system', 'audit-baseline.json')
const printOnly = process.argv.includes('--print')

function sortedObject(entries) {
  return Object.fromEntries(
    [...entries].sort((left, right) => {
      const countDifference = right[1] - left[1]
      return countDifference || left[0].localeCompare(right[0])
    })
  )
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1)
}

function classifyLink(url) {
  if (/^https?:\/\//i.test(url)) return 'external'
  if (/^(?:mailto|tel):/i.test(url)) return 'contact'
  if (url.startsWith('#')) return 'fragmentOnly'
  return 'internalPath'
}

async function collectMetrics() {
  const files = (await fs.readdir(knowledgeDir))
    .filter((name) => name.endsWith('.md'))
    .sort()
  const headingDepths = new Map()
  const languages = new Map()
  const linkKinds = new Map()
  const externalUrls = new Set()
  const documents = []
  let codeBlocks = 0
  let markdownLinks = 0

  for (const fileName of files) {
    const sourcePath = path.join(knowledgeDir, fileName)
    const parsed = matter(await fs.readFile(sourcePath, 'utf8'))
    const ast = collectMarkdownAst(parsed.content)
    const pageHeadings = new Map()

    for (const heading of ast.headings) {
      increment(headingDepths, `h${heading.depth}`)
      increment(pageHeadings, `h${heading.depth}`)
    }

    for (const block of ast.codeBlocks) {
      const language = (block.lang || 'plain').toLowerCase()
      increment(languages, language)
      codeBlocks += 1
    }

    for (const link of ast.links) {
      const kind = classifyLink(link.url)
      increment(linkKinds, kind)
      markdownLinks += 1
      if (kind === 'external') externalUrls.add(link.url)
    }

    documents.push({
      source: `docs/knowledge/${fileName}`,
      docId: parsed.data.docId || parsed.data.name || null,
      h1: pageHeadings.get('h1') || 0,
      h2: pageHeadings.get('h2') || 0,
      h3: pageHeadings.get('h3') || 0,
      codeBlocks: ast.codeBlocks.length,
      links: ast.links.length
    })
  }

  return {
    pageCount: files.length,
    headingDepths: Object.fromEntries(
      [...headingDepths.entries()].sort((left, right) => left[0].localeCompare(right[0]))
    ),
    codeBlocks,
    markdownLinks,
    linkKinds: {
      internalPath: linkKinds.get('internalPath') || 0,
      fragmentOnly: linkKinds.get('fragmentOnly') || 0,
      externalOccurrences: linkKinds.get('external') || 0,
      uniqueExternal: externalUrls.size,
      contact: linkKinds.get('contact') || 0
    },
    languages: sortedObject(languages.entries()),
    documents
  }
}

function findDifferences(expected, actual, currentPath = 'metrics') {
  if (Object.is(expected, actual)) return []
  if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null) {
    return [`${currentPath}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`]
  }

  const differences = []
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
  for (const key of [...keys].sort()) {
    differences.push(...findDifferences(expected[key], actual[key], `${currentPath}.${key}`))
  }
  return differences
}

async function main() {
  const metrics = await collectMetrics()

  if (printOnly) {
    console.log(JSON.stringify(metrics, null, 2))
    return
  }

  let baseline
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'))
  } catch (error) {
    console.error(`Content metrics baseline unavailable: ${path.relative(root, baselinePath)} (${error.message})`)
    process.exitCode = 1
    return
  }

  const differences = findDifferences(baseline.metrics, metrics)
  if (differences.length > 0) {
    console.error('Content metrics drifted from the reviewed baseline:')
    for (const difference of differences.slice(0, 30)) console.error(`  ${difference}`)
    if (differences.length > 30) console.error(`  ... ${differences.length - 30} more differences`)
    console.error('Review the content change, then update audit-baseline.json explicitly.')
    process.exitCode = 1
    return
  }

  console.log(
    `Content metrics match baseline v${baseline.baselineVersion}: ` +
      `${metrics.pageCount} pages, ${metrics.codeBlocks} code blocks, ` +
      `${metrics.markdownLinks} Markdown links, ${metrics.linkKinds.uniqueExternal} unique external URLs.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
