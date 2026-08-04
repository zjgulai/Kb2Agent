#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { collectMarkdownAst } from './markdown-metrics.mjs'

const projectRoot = process.cwd()
const knowledgeDir = path.join(projectRoot, 'docs', 'knowledge')
const shouldFixFences = process.argv.includes('--fix-fences')
const requireSchema = !process.argv.includes('--no-schema')

const schema = {
  section: new Set(['foundation', 'engineering', 'advanced', 'practice']),
  stage: new Set(['concept', 'design', 'build', 'operate']),
  maturity: new Set(['principle', 'solution', 'runnable', 'acceptance']),
  verification: new Set([
    'pending',
    'source-reviewed',
    'syntax-checked',
    'smoke-tested',
    'acceptance-tested'
  ]),
  codeStatus: new Set(['none', 'illustrative', 'syntax-checked', 'smoke-tested'])
}

function fenceToken(line) {
  const match = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/)
  if (!match) return null
  return {
    indent: match[1],
    marker: match[2],
    rest: match[3].trim()
  }
}

function repairLegacyFenceClosers(source) {
  const lines = source.split('\n')
  let open = null
  let changes = 0

  for (let index = 0; index < lines.length; index += 1) {
    const token = fenceToken(lines[index])
    if (!token) continue

    if (!open) {
      open = { marker: token.marker, line: index + 1 }
      continue
    }

    const sameMarker = token.marker[0] === open.marker[0]
    const longEnough = token.marker.length >= open.marker.length
    if (!sameMarker || !longEnough) continue

    if (token.rest === '') {
      open = null
      continue
    }

    if (token.rest === 'text' || token.rest === 'txt') {
      lines[index] = `${token.indent}${token.marker}`
      changes += 1
      open = null
    }
  }

  return { source: lines.join('\n'), changes }
}

function scanFences(source) {
  const errors = []
  const lines = source.split('\n')
  let open = null

  for (let index = 0; index < lines.length; index += 1) {
    const token = fenceToken(lines[index])
    if (!token) continue

    if (!open) {
      open = { marker: token.marker, line: index + 1, info: token.rest }
      continue
    }

    const sameMarker = token.marker[0] === open.marker[0]
    const longEnough = token.marker.length >= open.marker.length
    if (!sameMarker || !longEnough) continue

    if (token.rest === '') {
      open = null
    } else if (token.rest === 'text' || token.rest === 'txt') {
      errors.push(
        `line ${index + 1}: legacy closing fence \`${token.marker}${token.rest}\` must be bare`
      )
    }
  }

  if (open) {
    errors.push(`line ${open.line}: unclosed ${open.marker} fence (${open.info || 'plain'})`)
  }

  return errors
}

function validateFrontmatter(fileName, data) {
  const errors = []
  const requiredStrings = [
    'title',
    'description',
    'docId',
    'displayNumber',
    'route',
    'chapter'
  ]
  for (const key of requiredStrings) {
    if (typeof data[key] !== 'string' || !data[key].trim()) {
      errors.push(`frontmatter.${key} must be a non-empty string`)
    }
  }

  if (!Number.isInteger(data.order) || data.order < 0) {
    errors.push('frontmatter.order must be a non-negative integer')
  }
  if (!Number.isInteger(data.learningOrder) || data.learningOrder < 0) {
    errors.push('frontmatter.learningOrder must be a non-negative integer')
  }
  if (data.order !== data.learningOrder) {
    errors.push('frontmatter.order must mirror frontmatter.learningOrder during migration')
  }
  if (data.chapter !== data.displayNumber) {
    errors.push('frontmatter.chapter must mirror frontmatter.displayNumber during migration')
  }
  if (!/^KS-[A-Z0-9-]+$/.test(data.docId || '')) {
    errors.push('frontmatter.docId must match KS-[A-Z0-9-]+')
  }

  const expectedRoute = `/knowledge/${fileName.replace(/\.md$/, '')}`
  if (data.route !== expectedRoute) {
    errors.push(`frontmatter.route must preserve ${expectedRoute}`)
  }

  for (const [key, allowed] of Object.entries(schema)) {
    if (!allowed.has(data[key])) {
      errors.push(`frontmatter.${key} has unsupported value \`${data[key]}\``)
    }
  }

  if (data.reviewedAt !== null && data.reviewedAt !== undefined) {
    const value = data.reviewedAt instanceof Date
      ? data.reviewedAt.toISOString().slice(0, 10)
      : String(data.reviewedAt)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push('frontmatter.reviewedAt must be YYYY-MM-DD or null')
    }
  }

  if (!Array.isArray(data.testedWith)) {
    errors.push('frontmatter.testedWith must be an array')
  }
  if (!Array.isArray(data.evidence)) {
    errors.push('frontmatter.evidence must be an array')
  }
  if (data.verification !== 'pending' && (!Array.isArray(data.evidence) || data.evidence.length === 0)) {
    errors.push('verified content must provide at least one evidence entry')
  }

  if (fileName === 'appendix-validation.md' && data.chapter !== 'A') {
    errors.push('appendix-validation.md must use chapter A')
  }
  if (fileName === '08-tools-appendix.md' && data.chapter !== 'B') {
    errors.push('08-tools-appendix.md must use appendix identity B')
  }

  return errors
}

async function listMarkdownFiles() {
  return (await fs.readdir(knowledgeDir))
    .filter((name) => name.endsWith('.md'))
    .sort()
}

async function main() {
  const files = await listMarkdownFiles()
  const reports = []
  const uniqueOwners = {
    docId: new Map(),
    displayNumber: new Map(),
    route: new Map(),
    learningOrder: new Map()
  }
  let fixedFenceCount = 0

  for (const fileName of files) {
    const filePath = path.join(knowledgeDir, fileName)
    let source = await fs.readFile(filePath, 'utf8')

    if (shouldFixFences) {
      const repaired = repairLegacyFenceClosers(source)
      if (repaired.changes > 0) {
        await fs.writeFile(filePath, repaired.source)
        source = repaired.source
        fixedFenceCount += repaired.changes
      }
    }

    const errors = scanFences(source)
    const warnings = []
    const parsed = matter(source)

    if (requireSchema) {
      errors.push(...validateFrontmatter(fileName, parsed.data))
    }

    for (const [key, owners] of Object.entries(uniqueOwners)) {
      const value = parsed.data[key]
      if (value === undefined || value === null) continue
      const owner = owners.get(value)
      if (owner) {
        errors.push(`frontmatter.${key} ${JSON.stringify(value)} is also used by ${owner}`)
      } else {
        owners.set(value, fileName)
      }
    }

    let ast
    try {
      ast = collectMarkdownAst(parsed.content)
    } catch (error) {
      errors.push(`Markdown parse failed: ${error.message}`)
    }

    const headings = ast?.headings || []
    const links = (ast?.links || []).map((link) => link.url)
    const codeBlocks = ast?.codeBlocks || []

    const h1 = headings.filter((heading) => heading.depth === 1)
    if (h1.length !== 1) {
      errors.push(`expected exactly one H1, found ${h1.length}`)
    }

    let previousDepth = 0
    for (const heading of headings) {
      if (previousDepth > 0 && heading.depth > previousDepth + 1) {
        warnings.push(
          `heading jump H${previousDepth} → H${heading.depth}: ${heading.text}`
        )
      }
      previousDepth = heading.depth
    }

    const duplicateHeadings = headings
      .map((heading) => {
        const scope = heading.depth >= 3 ? heading.parentH2.toLocaleLowerCase() : 'document'
        return `${heading.depth}:${scope}:${heading.text.toLocaleLowerCase()}`
      })
      .filter((key, index, all) => all.indexOf(key) !== index)
    if (duplicateHeadings.length > 0) {
      warnings.push(`duplicate headings: ${[...new Set(duplicateHeadings)].join(', ')}`)
    }

    const explicitAnchors = [...source.matchAll(/<a\s+id=["']([^"']+)["']/g)].map((match) => match[1])
    const duplicateAnchors = explicitAnchors.filter((anchor, index, all) => all.indexOf(anchor) !== index)
    if (duplicateAnchors.length > 0) {
      errors.push(`duplicate explicit anchors: ${[...new Set(duplicateAnchors)].join(', ')}`)
    }

    const placeholderLinks = links.filter((url) => /github\.com\/\.\.\.|example\.com\/\.\.\./i.test(url))
    if (placeholderLinks.length > 0) {
      errors.push(`placeholder links: ${placeholderLinks.join(', ')}`)
    }

    const runnableClaim = /(可直接运行|完整可运行|可运行代码|直接跑起来)/.test(parsed.content)
    if (runnableClaim && parsed.data.codeStatus !== 'smoke-tested') {
      warnings.push('runnable claim exists without codeStatus=smoke-tested')
    }

    reports.push({
      fileName,
      errors,
      warnings,
      h1: h1.length,
      h2: headings.filter((heading) => heading.depth === 2).length,
      h3: headings.filter((heading) => heading.depth === 3).length,
      codeBlocks: codeBlocks.length,
      links: links.length
    })
  }

  if (shouldFixFences) {
    console.log(`Repaired ${fixedFenceCount} legacy closing fences across ${files.length} files.`)
  }

  let errorCount = 0
  let warningCount = 0
  for (const report of reports) {
    if (report.errors.length === 0 && report.warnings.length === 0) continue
    console.log(`\n${report.fileName}`)
    for (const error of report.errors) {
      console.log(`  ERROR ${error}`)
      errorCount += 1
    }
    for (const warning of report.warnings) {
      console.log(`  WARN  ${warning}`)
      warningCount += 1
    }
  }

  const totals = reports.reduce(
    (acc, report) => {
      acc.h2 += report.h2
      acc.h3 += report.h3
      acc.codeBlocks += report.codeBlocks
      acc.links += report.links
      return acc
    },
    { h2: 0, h3: 0, codeBlocks: 0, links: 0 }
  )

  console.log(
    `\nAudited ${reports.length} pages: ${totals.h2} H2, ${totals.h3} H3, ` +
      `${totals.codeBlocks} code blocks, ${totals.links} links, ` +
      `${errorCount} errors, ${warningCount} warnings.`
  )

  if (errorCount > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
