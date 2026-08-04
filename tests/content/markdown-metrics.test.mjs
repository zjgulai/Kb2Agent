import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectMarkdownAst,
  summarizeMarkdownAst
} from '../../scripts/markdown-metrics.mjs'

const fixture = `# Fixture

## First section

[first link](https://example.com/first)

\`\`\`js
console.log('first')
\`\`\`

### Nested section

[second link](./second.md)

\`\`\`python
print('second')
\`\`\`
`

test('Markdown AST metrics count nodes without altering visitor traversal', () => {
  const result = summarizeMarkdownAst(fixture)

  assert.deepEqual(result, {
    h1: 1,
    h2: 1,
    h3: 1,
    headings: 3,
    links: 2,
    codeBlocks: 2,
    languages: { js: 1, python: 1 }
  })
})

test('Markdown AST records preserve labels, lines and code languages', () => {
  const result = collectMarkdownAst(fixture)

  assert.deepEqual(result.links.map(({ text, url, line }) => ({ text, url, line })), [
    { text: 'first link', url: 'https://example.com/first', line: 5 },
    { text: 'second link', url: './second.md', line: 13 }
  ])
  assert.deepEqual(result.codeBlocks.map(({ lang, line }) => ({ lang, line })), [
    { lang: 'js', line: 7 },
    { lang: 'python', line: 15 }
  ])
})
