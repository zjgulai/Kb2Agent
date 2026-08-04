import path from 'node:path'
import process from 'node:process'
import { loadKnowledgeDocuments, readYamlRegistry } from './knowledge-registry.mjs'

const conceptIdPattern = /^CONCEPT-[A-Z0-9-]+$/
const documentIdPattern = /^KS-[A-Z0-9-]+$/
const definitionAnchorPattern = /^concept-[a-z0-9-]+$/
const usageIdPattern = /^USE-[A-Z0-9-]+-\d{3}$/
const usageAnchorPattern = /^concept-use-[a-z0-9-]+-\d{3}$/
const usageTypes = new Set(['applies', 'compares', 'depends-on', 'validates', 'implements', 'governs'])
const conflictKinds = new Set(['not-equivalent', 'boundary-conflict'])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizedTerm(value) {
  return String(value).normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

function requireString(record, key, context, errors, pattern = null) {
  const value = record?.[key]
  if (!hasText(value)) {
    errors.push(`${context}.${key} must be a non-empty string`)
    return
  }
  if (pattern && !pattern.test(value)) {
    errors.push(`${context}.${key} has invalid format: ${JSON.stringify(value)}`)
  }
}

function requireArray(record, key, context, errors) {
  if (!Array.isArray(record?.[key])) {
    errors.push(`${context}.${key} must be an array`)
    return []
  }
  return record[key]
}

function requireStringArray(record, key, context, errors) {
  const values = requireArray(record, key, context, errors)
  for (const [index, value] of values.entries()) {
    if (!hasText(value)) errors.push(`${context}.${key}[${index}] must be a non-empty string`)
  }
  const duplicates = duplicateValues(values)
  if (duplicates.length > 0) errors.push(`${context}.${key} contains duplicates: ${duplicates.join(', ')}`)
  return values
}

function expectedDefinitionAnchor(conceptId) {
  return `concept-${String(conceptId).replace(/^CONCEPT-/, '').toLowerCase()}`
}

function expectedUsageAnchor(usageId) {
  return `concept-use-${String(usageId).replace(/^USE-/, '').toLowerCase()}`
}

function findPrerequisiteCycles(concepts) {
  const edges = new Map(concepts.map((concept) => [concept.conceptId, concept.prerequisiteOf || []]))
  const state = new Map()
  const stack = []
  const cycles = []

  function visit(conceptId) {
    const currentState = state.get(conceptId) || 'new'
    if (currentState === 'done') return
    if (currentState === 'visiting') {
      const start = stack.indexOf(conceptId)
      cycles.push([...stack.slice(start), conceptId])
      return
    }

    state.set(conceptId, 'visiting')
    stack.push(conceptId)
    for (const target of edges.get(conceptId) || []) {
      if (edges.has(target)) visit(target)
    }
    stack.pop()
    state.set(conceptId, 'done')
  }

  for (const conceptId of edges.keys()) visit(conceptId)
  return cycles
}

export async function loadConceptRegistry(root = process.cwd()) {
  return readYamlRegistry(path.join(root, 'knowledge-system', 'concepts.yml'))
}

export function validateConceptRegistryStructure(registry, knownDocumentIds = null) {
  const errors = []
  const warnings = []

  if (!isRecord(registry)) return { errors: ['concept registry must be an object'], warnings }
  if (registry.schemaVersion !== 2) errors.push('schemaVersion must equal 2')
  if (registry.coverageMode !== 'reviewed-semantic-sample') {
    errors.push('coverageMode must equal reviewed-semantic-sample')
  }
  requireString(registry, 'registry', 'registry', errors)
  requireString(registry, 'reviewedAt', 'registry', errors, /^\d{4}-\d{2}-\d{2}$/)
  requireString(registry, 'scopeNote', 'registry', errors)

  if (!isRecord(registry.relationContract)) {
    errors.push('registry.relationContract must be an object')
  } else {
    for (const relation of ['definedIn', 'usedIn', 'prerequisiteOf', 'conflictsWith', 'related']) {
      requireString(registry.relationContract, relation, 'registry.relationContract', errors)
    }
  }

  const concepts = requireArray(registry, 'concepts', 'registry', errors)
  if (concepts.length === 0) errors.push('registry.concepts must contain at least one concept')

  const conceptIds = []
  const usageIds = []
  const anchors = []
  const termOwners = new Map()

  for (const [index, concept] of concepts.entries()) {
    const context = `concepts[${index}]`
    if (!isRecord(concept)) {
      errors.push(`${context} must be an object`)
      continue
    }

    requireString(concept, 'conceptId', context, errors, conceptIdPattern)
    requireString(concept, 'term', context, errors)
    requireString(concept, 'definition', context, errors)
    requireString(concept, 'canonicalDocument', context, errors, documentIdPattern)
    const aliases = requireStringArray(concept, 'aliases', context, errors)
    const prerequisites = requireStringArray(concept, 'prerequisiteOf', context, errors)
    const related = requireStringArray(concept, 'related', context, errors)
    const usages = requireArray(concept, 'usedIn', context, errors)
    const conflicts = requireArray(concept, 'conflictsWith', context, errors)

    conceptIds.push(concept.conceptId)
    for (const term of [concept.term, ...aliases]) {
      const normalized = normalizedTerm(term)
      const owner = termOwners.get(normalized)
      if (owner && owner !== concept.conceptId) {
        errors.push(`term or alias ${JSON.stringify(term)} is shared by ${owner} and ${concept.conceptId}`)
      } else {
        termOwners.set(normalized, concept.conceptId)
      }
    }

    if (knownDocumentIds && !knownDocumentIds.has(concept.canonicalDocument)) {
      errors.push(`${context}.canonicalDocument references unknown document ${concept.canonicalDocument}`)
    }

    if (!isRecord(concept.definedIn)) {
      errors.push(`${context}.definedIn must be an object`)
    } else {
      requireString(concept.definedIn, 'documentId', `${context}.definedIn`, errors, documentIdPattern)
      requireString(concept.definedIn, 'anchor', `${context}.definedIn`, errors, definitionAnchorPattern)
      requireString(concept.definedIn, 'locatorText', `${context}.definedIn`, errors)
      if (concept.definedIn.anchor !== expectedDefinitionAnchor(concept.conceptId)) {
        errors.push(`${context}.definedIn.anchor must equal ${expectedDefinitionAnchor(concept.conceptId)}`)
      }
      if (knownDocumentIds && !knownDocumentIds.has(concept.definedIn.documentId)) {
        errors.push(`${context}.definedIn.documentId references unknown document ${concept.definedIn.documentId}`)
      }
      anchors.push(concept.definedIn.anchor)
    }

    if (!usages.some((usage) => usage?.documentId !== concept.definedIn?.documentId)) {
      errors.push(`${context}.usedIn must contain at least one cross-document semantic use`)
    }
    for (const [usageIndex, usage] of usages.entries()) {
      const usageContext = `${context}.usedIn[${usageIndex}]`
      if (!isRecord(usage)) {
        errors.push(`${usageContext} must be an object`)
        continue
      }
      requireString(usage, 'usageId', usageContext, errors, usageIdPattern)
      requireString(usage, 'documentId', usageContext, errors, documentIdPattern)
      requireString(usage, 'anchor', usageContext, errors, usageAnchorPattern)
      requireString(usage, 'locatorText', usageContext, errors)
      if (!usageTypes.has(usage.usageType)) {
        errors.push(`${usageContext}.usageType is unsupported: ${usage.usageType}`)
      }
      if (usage.anchor !== expectedUsageAnchor(usage.usageId)) {
        errors.push(`${usageContext}.anchor must equal ${expectedUsageAnchor(usage.usageId)}`)
      }
      if (knownDocumentIds && !knownDocumentIds.has(usage.documentId)) {
        errors.push(`${usageContext}.documentId references unknown document ${usage.documentId}`)
      }
      usageIds.push(usage.usageId)
      anchors.push(usage.anchor)
    }

    for (const [conflictIndex, conflict] of conflicts.entries()) {
      const conflictContext = `${context}.conflictsWith[${conflictIndex}]`
      if (!isRecord(conflict)) {
        errors.push(`${conflictContext} must be an object`)
        continue
      }
      requireString(conflict, 'conceptId', conflictContext, errors, conceptIdPattern)
      requireString(conflict, 'reason', conflictContext, errors)
      if (!conflictKinds.has(conflict.kind)) {
        errors.push(`${conflictContext}.kind is unsupported: ${conflict.kind}`)
      }
    }

    for (const target of [...prerequisites, ...related]) {
      if (!conceptIdPattern.test(target)) errors.push(`${context} has invalid concept reference ${target}`)
    }
  }

  for (const duplicate of duplicateValues(conceptIds)) errors.push(`duplicate conceptId ${duplicate}`)
  for (const duplicate of duplicateValues(usageIds)) errors.push(`duplicate usageId ${duplicate}`)
  for (const duplicate of duplicateValues(anchors)) errors.push(`duplicate concept anchor ${duplicate}`)

  const conceptById = new Map(concepts.map((concept) => [concept.conceptId, concept]))
  for (const concept of concepts) {
    for (const target of concept.prerequisiteOf || []) {
      if (!conceptById.has(target)) errors.push(`${concept.conceptId} references unknown prerequisite target ${target}`)
      if (target === concept.conceptId) errors.push(`${concept.conceptId} must not be a prerequisite of itself`)
    }
    for (const target of concept.related || []) {
      if (!conceptById.has(target)) {
        errors.push(`${concept.conceptId} references unknown related concept ${target}`)
        continue
      }
      if (target === concept.conceptId) errors.push(`${concept.conceptId} must not relate to itself`)
      if (!(conceptById.get(target).related || []).includes(concept.conceptId)) {
        errors.push(`related relation must be symmetric: ${concept.conceptId} -> ${target}`)
      }
    }
    for (const conflict of concept.conflictsWith || []) {
      const target = conceptById.get(conflict.conceptId)
      if (!target) {
        errors.push(`${concept.conceptId} references unknown conflicting concept ${conflict.conceptId}`)
        continue
      }
      if (conflict.conceptId === concept.conceptId) {
        errors.push(`${concept.conceptId} must not conflict with itself`)
        continue
      }
      const reverse = (target.conflictsWith || []).find((candidate) => (
        candidate.conceptId === concept.conceptId && candidate.kind === conflict.kind
      ))
      if (!reverse) {
        errors.push(`conflictsWith relation must be symmetric with the same kind: ${concept.conceptId} -> ${conflict.conceptId}`)
      }
    }
  }

  for (const cycle of findPrerequisiteCycles(concepts)) {
    errors.push(`prerequisiteOf graph contains a cycle: ${cycle.join(' -> ')}`)
  }

  return { errors, warnings }
}

function locatorPosition(document, anchor, locatorText, context, errors) {
  const marker = `id="${anchor}"`
  const anchorPosition = document.content.indexOf(marker)
  if (anchorPosition < 0) {
    errors.push(`${context} anchor #${anchor} is missing from ${document.relativeSource}`)
    return null
  }
  if (document.content.indexOf(marker, anchorPosition + marker.length) >= 0) {
    errors.push(`${context} anchor #${anchor} appears more than once in ${document.relativeSource}`)
  }
  const locatorPosition = document.content.indexOf(locatorText, anchorPosition)
  if (locatorPosition < 0 || locatorPosition - anchorPosition > 1_200) {
    errors.push(`${context} locatorText is not within 1200 characters after #${anchor} in ${document.relativeSource}`)
    return null
  }
  return anchorPosition
}

function stripCodeForLexicalReview(content) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
}

export async function validateConceptPages(registry, root = process.cwd()) {
  const errors = []
  const warnings = []
  const documents = await loadKnowledgeDocuments(root)
  const byDocumentId = new Map(documents.map((document) => [document.frontmatter.docId, document]))
  const allRegisteredAnchors = new Map()
  const lexicalCoverage = []

  for (const concept of registry.concepts || []) {
    const definitionDocument = byDocumentId.get(concept.definedIn?.documentId)
    if (!definitionDocument) {
      errors.push(`${concept.conceptId} definition document does not exist: ${concept.definedIn?.documentId}`)
      continue
    }
    const definitionPosition = locatorPosition(
      definitionDocument,
      concept.definedIn.anchor,
      concept.definedIn.locatorText,
      `${concept.conceptId}.definedIn`,
      errors
    )
    allRegisteredAnchors.set(concept.definedIn.anchor, concept.definedIn.documentId)

    const canonical = byDocumentId.get(concept.canonicalDocument)
    if (canonical) {
      const canonicalText = normalizedTerm(stripCodeForLexicalReview(canonical.content))
      const terms = [concept.term, ...(concept.aliases || [])].map(normalizedTerm)
      if (!terms.some((term) => canonicalText.includes(term))) {
        errors.push(`${concept.conceptId} canonical document does not contain its term or an alias`)
      }
    }

    for (const usage of concept.usedIn || []) {
      const usageDocument = byDocumentId.get(usage.documentId)
      if (!usageDocument) {
        errors.push(`${usage.usageId} document does not exist: ${usage.documentId}`)
        continue
      }
      const usagePosition = locatorPosition(
        usageDocument,
        usage.anchor,
        usage.locatorText,
        `${concept.conceptId}.${usage.usageId}`,
        errors
      )
      allRegisteredAnchors.set(usage.anchor, usage.documentId)
      const definitionOrder = Number(definitionDocument.frontmatter.learningOrder)
      const usageOrder = Number(usageDocument.frontmatter.learningOrder)
      if (usageOrder < definitionOrder || (
        usageOrder === definitionOrder && definitionPosition !== null && usagePosition !== null && usagePosition <= definitionPosition
      )) {
        errors.push(`${usage.usageId} appears before ${concept.conceptId} first registered definition`)
      }
    }

    const terms = [concept.term, ...(concept.aliases || [])].map(normalizedTerm)
    const lexicalDocuments = documents.filter((document) => {
      const prose = normalizedTerm(stripCodeForLexicalReview(document.content))
      return terms.some((term) => prose.includes(term))
    })
    const registeredDocumentIds = new Set([
      concept.definedIn.documentId,
      ...(concept.usedIn || []).map((usage) => usage.documentId)
    ])
    const earlierLexicalDocuments = lexicalDocuments.filter((document) => (
      Number(document.frontmatter.learningOrder) < Number(definitionDocument.frontmatter.learningOrder)
    ))
    const linkedPreDefinitionDocuments = earlierLexicalDocuments.filter((document) => (
      document.content.includes(`#${concept.definedIn.anchor}`)
    ))
    const preDefinitionDocuments = earlierLexicalDocuments.filter((document) => (
      !document.content.includes(`#${concept.definedIn.anchor}`)
    ))
    if (preDefinitionDocuments.length > 0) {
      errors.push(
        `${concept.conceptId} has earlier lexical leads without a definition backlink: ` +
        preDefinitionDocuments.map((document) => document.frontmatter.docId).join(', ')
      )
    }
    lexicalCoverage.push({
      conceptId: concept.conceptId,
      lexicalDocuments: lexicalDocuments.length,
      registeredDocuments: lexicalDocuments.filter((document) => registeredDocumentIds.has(document.frontmatter.docId)).length,
      unregisteredDocuments: lexicalDocuments.filter((document) => !registeredDocumentIds.has(document.frontmatter.docId)).length,
      linkedPreDefinitionDocuments: linkedPreDefinitionDocuments.map((document) => document.frontmatter.docId),
      preDefinitionDocuments: preDefinitionDocuments.map((document) => document.frontmatter.docId)
    })
  }

  for (const [anchor, expectedDocumentId] of allRegisteredAnchors) {
    for (const document of documents) {
      if (document.frontmatter.docId === expectedDocumentId) continue
      if (document.content.includes(`id="${anchor}"`)) {
        errors.push(`concept anchor #${anchor} is duplicated in ${document.relativeSource}`)
      }
    }
  }

  return { errors, warnings, lexicalCoverage, documentCount: documents.length }
}

export function summarizeConcepts(registry) {
  const concepts = registry.concepts || []
  const conflictDirections = concepts.reduce((total, concept) => total + (concept.conflictsWith || []).length, 0)
  const relatedDirections = concepts.reduce((total, concept) => total + (concept.related || []).length, 0)
  return {
    concepts: concepts.length,
    aliases: concepts.reduce((total, concept) => total + (concept.aliases || []).length, 0),
    definitions: concepts.filter((concept) => isRecord(concept.definedIn)).length,
    usages: concepts.reduce((total, concept) => total + (concept.usedIn || []).length, 0),
    prerequisiteEdges: concepts.reduce((total, concept) => total + (concept.prerequisiteOf || []).length, 0),
    conflictPairs: conflictDirections / 2,
    relatedPairs: relatedDirections / 2
  }
}
