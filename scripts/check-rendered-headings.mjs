#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

const root = process.cwd()
const sourceDir = path.join(root, 'docs', 'knowledge')
const outputDir = path.join(root, 'docs', '.vitepress', 'dist', 'knowledge')

async function main() {
  const files = (await fs.readdir(sourceDir)).filter((name) => name.endsWith('.md')).sort()
  const failures = []

  for (const fileName of files) {
    const source = await fs.readFile(path.join(sourceDir, fileName), 'utf8')
    const tree = unified().use(remarkParse).use(remarkGfm).parse(matter(source).content)
    const expected = { 2: 0, 3: 0 }
    visit(tree, 'heading', (node) => {
      if (node.depth === 2 || node.depth === 3) expected[node.depth] += 1
    })

    const htmlPath = path.join(outputDir, fileName.replace(/\.md$/, '.html'))
    let html
    try {
      html = await fs.readFile(htmlPath, 'utf8')
    } catch {
      failures.push(`${fileName}: missing ${path.relative(root, htmlPath)}`)
      continue
    }

    const rendered = {
      2: (html.match(/<h2\s+id=/g) || []).length,
      3: (html.match(/<h3\s+id=/g) || []).length
    }

    if (expected[2] !== rendered[2] || expected[3] !== rendered[3]) {
      failures.push(
        `${fileName}: H2 ${rendered[2]}/${expected[2]}, H3 ${rendered[3]}/${expected[3]}`
      )
    }
  }

  if (failures.length > 0) {
    console.error('Rendered heading parity failed:')
    for (const failure of failures) console.error(`  ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(`Rendered heading parity passed for ${files.length}/${files.length} pages.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
