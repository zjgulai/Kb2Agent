import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  loadConceptRegistry,
  summarizeConcepts,
  validateConceptPages,
  validateConceptRegistryStructure
} from '../../scripts/concept-registry.mjs'
import { readYamlRegistry } from '../../scripts/knowledge-registry.mjs'

const root = process.cwd()

async function documentIds() {
  const registry = await readYamlRegistry(path.join(root, 'knowledge-system', 'documents.yml'))
  return new Set(registry.documents.map((document) => document.docId))
}

test('concept schema v2 and the reviewed semantic graph keep their declared boundary', async () => {
  const schema = JSON.parse(await fs.readFile(
    path.join(root, 'knowledge-system', 'schemas', 'concept.schema.json'),
    'utf8'
  ))
  const registry = await loadConceptRegistry(root)
  const structure = validateConceptRegistryStructure(registry, await documentIds())

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.properties.schemaVersion.const, 2)
  assert.deepEqual(schema.required, [
    'schemaVersion',
    'registry',
    'reviewedAt',
    'coverageMode',
    'scopeNote',
    'relationContract',
    'concepts'
  ])
  assert.equal(registry.coverageMode, 'reviewed-semantic-sample')
  assert.deepEqual(structure.errors, [])
  assert.deepEqual(summarizeConcepts(registry), {
    concepts: 13,
    aliases: 22,
    definitions: 13,
    usages: 13,
    prerequisiteEdges: 26,
    conflictPairs: 8,
    relatedPairs: 31
  })
})

test('every concept has a resolvable first definition and a later cross-document semantic use', async () => {
  const registry = await loadConceptRegistry(root)
  const pages = await validateConceptPages(registry, root)

  assert.deepEqual(pages.errors, [])
  assert.equal(pages.documentCount, 26)
  assert.equal(pages.lexicalCoverage.length, 13)
  assert.equal(pages.lexicalCoverage.reduce((total, item) => total + item.lexicalDocuments, 0), 97)
  assert.equal(pages.lexicalCoverage.reduce((total, item) => total + item.unregisteredDocuments, 0), 71)
  assert.equal(pages.lexicalCoverage.reduce((total, item) => total + item.linkedPreDefinitionDocuments.length, 0), 7)
  assert.equal(pages.lexicalCoverage.reduce((total, item) => total + item.preDefinitionDocuments.length, 0), 0)
})

test('prerequisite cycles, asymmetric conflicts and pre-definition uses fail closed', async () => {
  const registry = await loadConceptRegistry(root)
  const ids = await documentIds()

  const cyclic = structuredClone(registry)
  cyclic.concepts
    .find((concept) => concept.conceptId === 'CONCEPT-KNOWLEDGE-EVOLUTION')
    .prerequisiteOf.push('CONCEPT-KNOWLEDGE-SYSTEM')
  assert.ok(
    validateConceptRegistryStructure(cyclic, ids).errors
      .some((error) => error.includes('prerequisiteOf graph contains a cycle'))
  )

  const asymmetric = structuredClone(registry)
  asymmetric.concepts
    .find((concept) => concept.conceptId === 'CONCEPT-RAG')
    .conflictsWith = asymmetric.concepts
      .find((concept) => concept.conceptId === 'CONCEPT-RAG')
      .conflictsWith.filter((conflict) => conflict.conceptId !== 'CONCEPT-GRAPHRAG')
  assert.ok(
    validateConceptRegistryStructure(asymmetric, ids).errors
      .some((error) => error.includes('conflictsWith relation must be symmetric'))
  )

  const preDefinition = structuredClone(registry)
  preDefinition.concepts
    .find((concept) => concept.conceptId === 'CONCEPT-RAG')
    .usedIn[0].documentId = 'KS-INTRO'
  const pages = await validateConceptPages(preDefinition, root)
  assert.ok(pages.errors.some((error) => error.includes('appears before CONCEPT-RAG first registered definition')))
})
