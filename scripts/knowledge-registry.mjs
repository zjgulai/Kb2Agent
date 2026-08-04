import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { collectMarkdownAst } from './markdown-metrics.mjs'

export async function readYamlRegistry(filePath) {
  const source = await fs.readFile(filePath, 'utf8')
  const wrapped = `---\n${source.trimEnd()}\n---\n`
  return matter(wrapped).data
}

export async function loadKnowledgeDocuments(root) {
  const knowledgeDir = path.join(root, 'docs', 'knowledge')
  const fileNames = (await fs.readdir(knowledgeDir))
    .filter((name) => name.endsWith('.md'))
    .sort()

  return Promise.all(fileNames.map(async (fileName) => {
    const absolutePath = path.join(knowledgeDir, fileName)
    const source = await fs.readFile(absolutePath, 'utf8')
    const parsed = matter(source)
    const ast = collectMarkdownAst(parsed.content)
    const relativeSource = `docs/knowledge/${fileName}`
    const derivedRoute = `/knowledge/${fileName.replace(/\.md$/, '')}`

    return {
      fileName,
      absolutePath,
      relativeSource,
      derivedRoute,
      source,
      content: parsed.content,
      frontmatter: parsed.data,
      ast,
      h1: ast.headings.find((heading) => heading.depth === 1)?.text || null
    }
  }))
}

export function normalizeDisplayNumber(value) {
  const text = String(value)
  if (/^\d+$/.test(text)) return text.padStart(2, '0')
  return text.toUpperCase()
}

function chineseNumberToInteger(value) {
  const digits = new Map([
    ['零', 0], ['〇', 0], ['一', 1], ['二', 2], ['两', 2], ['三', 3],
    ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8], ['九', 9]
  ])

  if (digits.has(value)) return digits.get(value)
  if (value.includes('十')) {
    const [tensText, onesText] = value.split('十')
    const tens = tensText ? digits.get(tensText) : 1
    const ones = onesText ? digits.get(onesText) : 0
    if (tens === undefined || ones === undefined) return null
    return tens * 10 + ones
  }

  return null
}

export function extractDisplayNumber(text) {
  const appendix = text.match(/附录\s*([A-Za-z])/i)
  if (appendix) return appendix[1].toUpperCase()

  const chapter = text.match(/第\s*([0-9零〇一二两三四五六七八九十]+)\s*章/)
  if (!chapter) return null
  if (/^\d+$/.test(chapter[1])) return chapter[1].padStart(2, '0')

  const parsed = chineseNumberToInteger(chapter[1])
  return parsed === null ? null : String(parsed).padStart(2, '0')
}
