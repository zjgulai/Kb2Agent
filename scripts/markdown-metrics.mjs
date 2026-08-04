import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

export function markdownNodeText(node) {
  let value = ''

  visit(node, 'text', (child) => {
    value += child.value
  })
  visit(node, 'inlineCode', (child) => {
    value += child.value
  })

  return value.trim()
}

export function parseMarkdown(content) {
  return unified().use(remarkParse).use(remarkGfm).parse(content)
}

export function collectMarkdownAst(content) {
  const tree = parseMarkdown(content)
  const headings = []
  const links = []
  const codeBlocks = []
  let currentH2 = ''

  visit(tree, 'heading', (node) => {
    const text = markdownNodeText(node)
    if (node.depth === 2) currentH2 = text
    headings.push({
      depth: node.depth,
      text,
      parentH2: currentH2,
      line: node.position?.start.line || 1
    })
  })

  // Keep braces around these callbacks. Array#push returns a number, and
  // unist-util-visit interprets numeric callback returns as traversal control.
  visit(tree, 'link', (node) => {
    links.push({
      url: node.url,
      text: markdownNodeText(node),
      line: node.position?.start.line || 1
    })
  })

  visit(tree, 'code', (node) => {
    codeBlocks.push({
      lang: node.lang || null,
      meta: node.meta || null,
      value: node.value,
      line: node.position?.start.line || 1
    })
  })

  return { tree, headings, links, codeBlocks }
}

export function summarizeMarkdownAst(content) {
  const { headings, links, codeBlocks } = collectMarkdownAst(content)
  const languages = {}

  for (const block of codeBlocks) {
    const language = block.lang || 'plain'
    languages[language] = (languages[language] || 0) + 1
  }

  return {
    h1: headings.filter((heading) => heading.depth === 1).length,
    h2: headings.filter((heading) => heading.depth === 2).length,
    h3: headings.filter((heading) => heading.depth === 3).length,
    headings: headings.length,
    links: links.length,
    codeBlocks: codeBlocks.length,
    languages: Object.fromEntries(
      Object.entries(languages).sort((left, right) => {
        const countDifference = right[1] - left[1]
        return countDifference || left[0].localeCompare(right[0])
      })
    )
  }
}
