#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import {
  extractDisplayNumber,
  loadKnowledgeDocuments,
  normalizeDisplayNumber,
  readYamlRegistry
} from './knowledge-registry.mjs'

const root = process.cwd()
const registryPath = path.join(root, 'knowledge-system', 'documents.yml')
const errors = []

function requireValue(object, key, context) {
  const value = object[key]
  if (value === undefined || value === null || value === '') {
    errors.push(`${context}.${key} is required`)
  }
}

function ensureUnique(items, key, context) {
  const owners = new Map()
  for (const item of items) {
    const value = item[key]
    if (owners.has(value)) {
      errors.push(`${context}.${key} ${JSON.stringify(value)} is shared by ${owners.get(value)} and ${item.docId || item.source}`)
    } else {
      owners.set(value, item.docId || item.source)
    }
  }
}

async function main() {
  const registry = await readYamlRegistry(registryPath)
  const documents = await loadKnowledgeDocuments(root)
  const entries = registry.documents

  if (registry.schemaVersion !== 1) errors.push('documents.yml schemaVersion must be 1')
  if (!Array.isArray(entries)) {
    errors.push('documents.yml documents must be an array')
  }
  if (documents.length !== 26) errors.push(`expected 26 Markdown documents, found ${documents.length}`)
  if (!Array.isArray(entries) || entries.length !== documents.length) {
    errors.push(`documents.yml must register ${documents.length} documents, found ${Array.isArray(entries) ? entries.length : 0}`)
  }

  if (!Array.isArray(entries)) {
    throw new Error(errors.join('\n'))
  }

  for (const entry of entries) {
    for (const key of ['docId', 'source', 'title', 'displayNumber', 'route', 'learningOrder', 'documentType', 'section', 'stage', 'maturity']) {
      requireValue(entry, key, `documents.yml:${entry.docId || entry.source || 'unknown'}`)
    }
    if (!Array.isArray(entry.prerequisites)) {
      errors.push(`documents.yml:${entry.docId}.prerequisites must be an array`)
    }
  }

  for (const key of ['docId', 'source', 'displayNumber', 'route', 'learningOrder']) {
    ensureUnique(entries, key, 'documents.yml')
  }

  const expectedDisplays = [
    ...Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')),
    'A',
    'B'
  ].sort()
  const actualDisplays = entries.map((entry) => normalizeDisplayNumber(entry.displayNumber)).sort()
  if (JSON.stringify(actualDisplays) !== JSON.stringify(expectedDisplays)) {
    errors.push(`displayNumber set must be 00-23 plus A/B; received ${actualDisplays.join(', ')}`)
  }

  const expectedOrders = Array.from({ length: documents.length }, (_, index) => index)
  const actualOrders = entries.map((entry) => entry.learningOrder).sort((left, right) => left - right)
  if (JSON.stringify(actualOrders) !== JSON.stringify(expectedOrders)) {
    errors.push(`learningOrder must be contiguous 0-${documents.length - 1}; received ${actualOrders.join(', ')}`)
  }

  const entriesBySource = new Map(entries.map((entry) => [entry.source, entry]))
  const entriesById = new Map(entries.map((entry) => [entry.docId, entry]))

  for (const entry of entries) {
    for (const prerequisite of entry.prerequisites || []) {
      const dependency = entriesById.get(prerequisite)
      if (!dependency) {
        errors.push(`${entry.docId} references unknown prerequisite ${prerequisite}`)
      } else if (dependency.learningOrder >= entry.learningOrder) {
        errors.push(`${entry.docId} prerequisite ${prerequisite} must appear earlier in learningOrder`)
      }
    }
  }

  for (const document of documents) {
    const entry = entriesBySource.get(document.relativeSource)
    if (!entry) {
      errors.push(`${document.relativeSource} is missing from documents.yml`)
      continue
    }

    const data = document.frontmatter
    const comparisons = {
      docId: entry.docId,
      title: entry.title,
      displayNumber: normalizeDisplayNumber(entry.displayNumber),
      route: entry.route,
      learningOrder: entry.learningOrder,
      section: entry.section,
      stage: entry.stage,
      maturity: entry.maturity
    }

    for (const [key, expected] of Object.entries(comparisons)) {
      const actual = key === 'displayNumber' ? normalizeDisplayNumber(data[key]) : data[key]
      if (actual !== expected) {
        errors.push(`${document.relativeSource} frontmatter.${key}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
      }
    }

    if (data.route !== document.derivedRoute) {
      errors.push(`${document.relativeSource} route must preserve ${document.derivedRoute}`)
    }
    if (normalizeDisplayNumber(data.chapter) !== normalizeDisplayNumber(data.displayNumber)) {
      errors.push(`${document.relativeSource} legacy chapter must mirror displayNumber during migration`)
    }
    if (data.order !== data.learningOrder) {
      errors.push(`${document.relativeSource} legacy order must mirror learningOrder during migration`)
    }
    if (document.h1 !== data.title) {
      errors.push(`${document.relativeSource} H1 must exactly match frontmatter.title`)
    }

    const titleDisplay = extractDisplayNumber(data.title)
    if (titleDisplay !== normalizeDisplayNumber(data.displayNumber)) {
      errors.push(`${document.relativeSource} title identity ${JSON.stringify(titleDisplay)} does not match displayNumber ${data.displayNumber}`)
    }
  }

  for (const entry of entries) {
    if (!documents.some((document) => document.relativeSource === entry.source)) {
      errors.push(`${entry.source} is registered but does not exist`)
    }
  }

  const tools = documents.find((document) => document.frontmatter.docId === 'KS-TOOLS-APPENDIX')
  if (!tools || tools.frontmatter.displayNumber !== 'B' || tools.frontmatter.route !== '/knowledge/08-tools-appendix') {
    errors.push('KS-TOOLS-APPENDIX must be Appendix B while preserving /knowledge/08-tools-appendix')
  } else if (!tools.source.includes('<a id="第八章-附录-工具完整手册与选型决策树"></a>')) {
    errors.push('KS-TOOLS-APPENDIX must preserve the legacy public H1 anchor')
  }

  if (errors.length > 0) {
    console.error('Document identity contract failed:')
    for (const error of errors) console.error(`  ${error}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Document identity contract passed: ${documents.length}/${entries.length} sources registered, ` +
      '26 unique identities, routes preserved, learningOrder 0-25, displayNumber 00-23 plus A/B.'
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
