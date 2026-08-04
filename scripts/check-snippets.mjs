#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

const root = process.cwd()
const knowledgeDir = path.join(root, 'docs', 'knowledge')
const errors = []
let annotatedBlocks = 0

function run(command, args) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'pipe' })
  } catch (error) {
    errors.push(`${command} ${args.join(' ')}: ${error.stderr?.toString().trim() || error.message}`)
  }
}

async function checkAnnotatedBlocks() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mkd-snippets-'))
  try {
    const files = (await fs.readdir(knowledgeDir)).filter((name) => name.endsWith('.md')).sort()
    for (const fileName of files) {
      const source = matter(await fs.readFile(path.join(knowledgeDir, fileName), 'utf8')).content
      const tree = unified().use(remarkParse).use(remarkGfm).parse(source)
      const checks = []
      visit(tree, 'code', (node) => {
        if (!/verify=syntax/.test(node.meta || '')) return
        annotatedBlocks += 1
        const extension = { python: 'py', py: 'py', javascript: 'mjs', js: 'mjs', bash: 'sh', sh: 'sh' }[node.lang]
        if (!extension) {
          errors.push(`${fileName}:${node.position.start.line}: unsupported verified language ${node.lang}`)
          return
        }
        const snippet = path.join(tempDir, `${fileName}-${node.position.start.line}.${extension}`)
        checks.push(fs.writeFile(snippet, `${node.value}\n`).then(() => {
          if (extension === 'py') run('python3', ['-m', 'py_compile', snippet])
          if (extension === 'mjs') run('node', ['--check', snippet])
          if (extension === 'sh') run('bash', ['-n', snippet])
        }))
      })
      await Promise.all(checks)
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function checkKnownFixtures() {
  run('node', ['--check', 'fixtures/cost-model.mjs'])
  run('node', ['--check', 'fixtures/mock-pipeline.mjs'])
  run('node', ['--check', 'fixtures/security-governance.mjs'])
  run('node', ['--check', 'fixtures/evaluation-regression.mjs'])
  run('node', ['--check', 'fixtures/acceptance-harness.mjs'])
  run('python3', ['-m', 'py_compile', 'fixtures/response-contract.py'])
  run('bash', ['-n', 'fixtures/safe-delete.sh'])
}

async function checkApiAndSafetyClaims() {
  const files = (await fs.readdir(knowledgeDir)).filter((name) => name.endsWith('.md')).sort()
  for (const fileName of files) {
    const source = await fs.readFile(path.join(knowledgeDir, fileName), 'utf8')
    if (/\b(?:client|qdrant|self\.qdrant)\.search\(/.test(source)) {
      errors.push(`${fileName}: legacy Qdrant search call remains`)
    }
    if (fileName !== '19-tech-selection-vol2.md' && /chat\.completions\.create\(/.test(source)) {
      errors.push(`${fileName}: OpenAI service example must use Responses API`)
    }
    if (fileName === '19-tech-selection-vol2.md' && /chat\.completions\.create\(/.test(source) && !/base_url="http:\/\/localhost/.test(source)) {
      errors.push(`${fileName}: Chat Completions exception must be scoped to a local compatibility endpoint`)
    }
    for (const match of source.matchAll(/delete_collection\(/g)) {
      const window = source.slice(Math.max(0, match.index - 1800), match.index + 2200).toLocaleLowerCase()
      const required = ['snapshot', 'dry run', 'confirm_delete', '回滚']
      const missing = required.filter((token) => !window.includes(token))
      if (missing.length > 0) errors.push(`${fileName}: dangerous deletion misses ${missing.join(', ')}`)
    }
  }
}

await checkAnnotatedBlocks()
await checkKnownFixtures()
await checkApiAndSafetyClaims()

if (errors.length > 0) {
  console.error('Snippet and safety checks failed:')
  for (const error of errors) console.error(`  ${error}`)
  process.exitCode = 1
} else {
  console.log(`Snippet checks passed: 7 fixtures and ${annotatedBlocks} annotated Markdown blocks.`)
}
