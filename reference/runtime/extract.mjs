import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FIXED_AS_OF,
  FIXED_NOW,
  decodeXml,
  hashFile,
  run,
  sha256,
  shortHash,
  stableId,
  xmlText
} from './utils.mjs'

export const MAX_INPUT_BYTES = 5 * 1024 * 1024
const OOXML_FORMATS = new Set(['docx', 'pptx', 'xlsx'])

export class ExtractionError extends Error {
  constructor(code, message, context = {}) {
    super(message)
    this.name = 'ExtractionError'
    this.code = code
    this.context = context
  }
}

async function unzipEntry(file, entry) {
  try {
    return await run('unzip', ['-p', file, entry])
  } catch (error) {
    throw new ExtractionError('ARCHIVE_INVALID', `Cannot read ${entry} from ${path.basename(file)}`, { cause: error.message })
  }
}

async function unzipList(file) {
  try {
    return (await run('unzip', ['-Z1', file])).split(/\r?\n/).filter(Boolean)
  } catch (error) {
    throw new ExtractionError('ARCHIVE_INVALID', `Cannot list ${path.basename(file)}`, { cause: error.message })
  }
}

function parseRelationships(xml) {
  const result = new Map()
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const id = match[1].match(/\bId="([^"]+)"/)?.[1]
    const target = match[1].match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) result.set(id, target)
  }
  return result
}

function maxRange(cellRefs) {
  if (!cellRefs.length) return 'A1:A1'
  return `${cellRefs[0]}:${cellRefs[cellRefs.length - 1]}`
}

function makeElement(revisionId, sourceSlug, elementType, locator, text) {
  const cleanText = String(text).replace(/\s+/g, ' ').trim()
  if (!cleanText) return null
  return {
    id: stableId('ELEM', sourceSlug, shortHash(`${locator}\n${cleanText}`)),
    objectType: 'StructuralElement',
    revision: 1,
    status: 'candidate',
    createdAt: FIXED_NOW,
    sourceRefs: [revisionId],
    sourceRevisionId: revisionId,
    elementType,
    locator,
    contentHash: sha256(cleanText),
    text: cleanText
  }
}

async function extractPdf(file, revisionId, sourceSlug) {
  const info = await run('pdfinfo', [file])
  const declaredPages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] || 0)
  const text = await run('pdftotext', ['-layout', file, '-'])
  if (!text.trim()) throw new ExtractionError('TEXT_MISSING', `${path.basename(file)} contains no extractable text`)
  const pages = text.split('\f').map((page) => page.trim()).filter(Boolean)
  if (declaredPages && pages.length > declaredPages) throw new ExtractionError('STRUCTURE_MISMATCH', 'Extracted page count exceeds declared page count')
  return pages.map((page, index) => makeElement(revisionId, sourceSlug, 'page', `page=${index + 1};block=body`, page)).filter(Boolean)
}

async function extractPptx(file, revisionId, sourceSlug) {
  const entries = (await unzipList(file)).filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
  if (!entries.length) throw new ExtractionError('STRUCTURE_MISMATCH', 'PPTX has no slide XML')
  const elements = []
  for (const entry of entries) {
    const slide = Number(entry.match(/slide(\d+)/)[1])
    const xml = await unzipEntry(file, entry)
    const shapes = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)]
    let emitted = 0
    for (const [index, shape] of shapes.entries()) {
      const text = xmlText(shape[0], 'a:t')
      const element = makeElement(revisionId, sourceSlug, 'slide', `slide=${slide};shape=${index + 1}`, text)
      if (element) {
        elements.push(element)
        emitted += 1
      }
    }
    if (!emitted) throw new ExtractionError('TEXT_MISSING', `slide ${slide} contains no extractable text`)
  }
  return elements
}

async function extractDocx(file, revisionId, sourceSlug) {
  const entries = await unzipList(file)
  if (!entries.includes('word/document.xml')) throw new ExtractionError('STRUCTURE_MISMATCH', 'DOCX is missing word/document.xml')
  const xml = await unzipEntry(file, 'word/document.xml')
  const elements = []
  let currentHeading = 'document-start'
  let paragraphIndex = 0
  for (const match of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const paragraph = match[0]
    const text = xmlText(paragraph, 'w:t')
    if (!text) continue
    paragraphIndex += 1
    const style = paragraph.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1] || ''
    const heading = /Heading|Title/i.test(style)
    if (heading) currentHeading = text
    const locator = heading
      ? `heading=${text};paragraph=${paragraphIndex}`
      : `heading=${currentHeading};paragraph=${paragraphIndex}`
    elements.push(makeElement(revisionId, sourceSlug, heading ? 'heading' : 'paragraph', locator, text))
  }
  let tableIndex = 0
  for (const tableMatch of xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)) {
    tableIndex += 1
    let rowIndex = 0
    for (const rowMatch of tableMatch[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
      rowIndex += 1
      const cells = [...rowMatch[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((cell) => xmlText(cell[0], 'w:t')).filter(Boolean)
      const element = makeElement(revisionId, sourceSlug, 'table', `table=${tableIndex};row=${rowIndex}`, cells.join(' | '))
      if (element) elements.push(element)
    }
  }
  if (!elements.length) throw new ExtractionError('TEXT_MISSING', 'DOCX contains no extractable text')
  return elements
}

async function extractXlsx(file, revisionId, sourceSlug) {
  const entries = await unzipList(file)
  if (!entries.includes('xl/workbook.xml')) throw new ExtractionError('STRUCTURE_MISMATCH', 'XLSX is missing xl/workbook.xml')
  const workbook = await unzipEntry(file, 'xl/workbook.xml')
  const rels = parseRelationships(await unzipEntry(file, 'xl/_rels/workbook.xml.rels'))
  let sharedStrings = []
  if (entries.includes('xl/sharedStrings.xml')) {
    const sharedXml = await unzipEntry(file, 'xl/sharedStrings.xml')
    sharedStrings = [...sharedXml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => xmlText(match[0], '(?:t|[a-zA-Z0-9]+:t)'))
  }
  const elements = []
  for (const sheetMatch of workbook.matchAll(/<(?:[a-zA-Z0-9]+:)?sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?\s*>/g)) {
    const name = decodeXml(sheetMatch[1])
    const target = rels.get(sheetMatch[2])
    if (!target) throw new ExtractionError('STRUCTURE_MISMATCH', `No relationship target for sheet ${name}`)
    const entry = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    const xml = await unzipEntry(file, entry)
    const rows = []
    const refs = []
    for (const cellMatch of xml.matchAll(/<(?:[a-zA-Z0-9]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?c>/g)) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const ref = attrs.match(/\br="([^"]+)"/)?.[1]
      if (!ref) continue
      refs.push(ref)
      const type = attrs.match(/\bt="([^"]+)"/)?.[1]
      const formula = body.match(/<(?:[a-zA-Z0-9]+:)?f(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?f>/)?.[1]
      let value = body.match(/<(?:[a-zA-Z0-9]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?v>/)?.[1]
      if (type === 'inlineStr') value = xmlText(body, 't')
      else if (type === 's' && value !== undefined) value = sharedStrings[Number(value)]
      const rendered = formula ? `${ref}=FORMULA(${decodeXml(formula)})=>${decodeXml(value || '')}` : `${ref}=${decodeXml(value || '')}`
      rows.push(rendered)
    }
    const element = makeElement(revisionId, sourceSlug, 'cell-range', `sheet=${name};range=${maxRange(refs)}`, rows.join(' | '))
    if (element) elements.push(element)
  }
  if (!elements.length) throw new ExtractionError('TEXT_MISSING', 'XLSX contains no extractable cells')
  return elements
}

async function extractMarkdown(file, revisionId, sourceSlug) {
  const text = await fs.readFile(file, 'utf8')
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  let heading = 'document-start'
  return blocks.map((block, index) => {
    const match = block.match(/^#{1,6}\s+(.+)$/m)
    if (match) heading = match[1].trim()
    return makeElement(revisionId, sourceSlug, match ? 'heading' : 'paragraph', `heading=${heading};block=${index + 1}`, block)
  }).filter(Boolean)
}

async function extractJson(file, revisionId, sourceSlug) {
  let value
  try {
    value = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    throw new ExtractionError('JSON_INVALID', `${path.basename(file)} is invalid JSON`, { cause: error.message })
  }
  const entries = Object.entries(value)
  if (!entries.length) throw new ExtractionError('TEXT_MISSING', 'JSON has no top-level values')
  return entries.map(([key, item]) => makeElement(revisionId, sourceSlug, 'paragraph', `jsonpath=$.${key}`, `${key}: ${JSON.stringify(item)}`)).filter(Boolean)
}

export async function extractFile(file, manifestEntry, options = {}) {
  const stat = await fs.stat(file)
  const maxBytes = options.maxBytes || MAX_INPUT_BYTES
  if (stat.size > maxBytes) throw new ExtractionError('INPUT_TOO_LARGE', `${path.basename(file)} exceeds ${maxBytes} bytes`, { bytes: stat.size })
  const format = manifestEntry.format || path.extname(file).slice(1).toLowerCase()
  if (OOXML_FORMATS.has(format)) await unzipList(file)
  const fileHash = await hashFile(file)
  if (manifestEntry.sha256 && manifestEntry.sha256 !== fileHash) {
    throw new ExtractionError('HASH_MISMATCH', `${path.basename(file)} does not match manifest hash`, { expected: manifestEntry.sha256, actual: fileHash })
  }
  const slug = path.basename(file).replace(/\.[^.]+$/, '')
  const artifactId = stableId('SRC', slug)
  const revisionId = stableId('SRCREV', slug, 'V1')
  let elements
  if (format === 'pdf') elements = await extractPdf(file, revisionId, slug)
  else if (format === 'pptx') elements = await extractPptx(file, revisionId, slug)
  else if (format === 'docx') elements = await extractDocx(file, revisionId, slug)
  else if (format === 'xlsx') elements = await extractXlsx(file, revisionId, slug)
  else if (format === 'markdown') elements = await extractMarkdown(file, revisionId, slug)
  else if (format === 'json') elements = await extractJson(file, revisionId, slug)
  else throw new ExtractionError('FORMAT_UNSUPPORTED', `Unsupported format: ${format}`)

  if (manifestEntry.expected?.minElements && elements.length < manifestEntry.expected.minElements) {
    throw new ExtractionError('STRUCTURE_MISMATCH', `${path.basename(file)} emitted ${elements.length} elements; expected at least ${manifestEntry.expected.minElements}`)
  }
  for (const required of manifestEntry.expected?.locatorIncludes || []) {
    if (!elements.some((element) => element.locator.includes(required))) {
      throw new ExtractionError('STRUCTURE_MISMATCH', `${path.basename(file)} is missing locator fragment ${required}`)
    }
  }

  return {
    source: {
      id: artifactId,
      objectType: 'SourceArtifact',
      revision: 1,
      status: 'candidate',
      createdAt: FIXED_NOW,
      sourceRefs: [],
      title: manifestEntry.title,
      format,
      language: manifestEntry.language || 'en-US',
      contentHash: fileHash,
      license: {
        state: 'synthetic',
        redistribution: true,
        note: 'Project-authored synthetic fixture; no customer, account, or platform export data.'
      }
    },
    revision: {
      id: revisionId,
      objectType: 'SourceRevision',
      revision: 1,
      status: 'candidate',
      createdAt: FIXED_NOW,
      sourceRefs: [artifactId],
      sourceArtifactId: artifactId,
      asOf: manifestEntry.asOf || FIXED_AS_OF,
      contentHash: fileHash
    },
    elements,
    receipt: {
      sourceId: artifactId,
      revisionId,
      file: manifestEntry.path,
      format,
      bytes: stat.size,
      sha256: fileHash,
      elementCount: elements.length,
      locatorsHash: sha256(elements.map((element) => element.locator).sort().join('\n')),
      status: 'passed',
      externalCalls: 0,
      sideEffects: 0
    }
  }
}

export async function extractCorpus(root, manifest) {
  const results = []
  for (const entry of manifest.sources.filter((source) => source.corpusClass === 'normal')) {
    results.push(await extractFile(path.join(root, entry.path), entry))
  }
  return {
    sources: results.flatMap((result) => [result.source, result.revision, ...result.elements]),
    receipts: results.map((result) => result.receipt),
    elements: results.flatMap((result) => result.elements)
  }
}
