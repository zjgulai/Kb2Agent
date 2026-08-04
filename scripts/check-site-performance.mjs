#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const distDir = path.join(root, 'docs', '.vitepress', 'dist')
const limit = 500 * 1024
const errors = []
const initialAssets = new Map()

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(target))
    if (entry.isFile()) files.push(target)
  }
  return files
}

let files
try {
  files = await walk(distDir)
} catch {
  console.error('Performance gate requires a completed docs build.')
  process.exit(1)
}

for (const file of files) {
  const extension = path.extname(file)
  if (!['.html', '.css', '.js'].includes(extension)) continue
  const source = await fs.readFile(file, 'utf8')
  if (/fonts\.(?:googleapis|gstatic)\.com/i.test(source)) {
    errors.push(`${path.relative(root, file)} requests an external Google font`)
  }
  if (extension !== '.html') continue
  const references = [
    ...source.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+\.js)"[^>]*>/g),
    ...source.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"[^>]*>/g)
  ].map((match) => match[1])

  for (const reference of references) {
    const normalized = reference.replace(/^\/Kb2Agent\//, '')
    const asset = path.join(distDir, normalized)
    try {
      const size = (await fs.stat(asset)).size
      initialAssets.set(normalized, size)
      if (size >= limit) {
        errors.push(`${path.relative(root, file)} initially loads ${normalized} at ${(size / 1024).toFixed(1)} KB`)
      }
    } catch {
      errors.push(`${path.relative(root, file)} references missing initial asset ${reference}`)
    }
  }
}

const sorted = [...initialAssets.entries()].sort((a, b) => b[1] - a[1])
const [largestName, largestSize = 0] = sorted[0] || []

if (errors.length > 0) {
  console.error(`Performance gate failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`  ${error}`)
  process.exitCode = 1
} else {
  console.log(`Performance gate passed: ${initialAssets.size} unique initial JS assets; largest ${largestName} at ${(largestSize / 1024).toFixed(1)} KB; no external Google fonts.`)
}
