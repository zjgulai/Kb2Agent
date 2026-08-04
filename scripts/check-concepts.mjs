#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import {
  loadConceptRegistry,
  summarizeConcepts,
  validateConceptPages,
  validateConceptRegistryStructure
} from './concept-registry.mjs'
import { readYamlRegistry } from './knowledge-registry.mjs'

const root = process.cwd()

async function main() {
  const [registry, documentsRegistry] = await Promise.all([
    loadConceptRegistry(root),
    readYamlRegistry(path.join(root, 'knowledge-system', 'documents.yml'))
  ])
  const documentIds = new Set((documentsRegistry.documents || []).map((document) => document.docId))
  const structure = validateConceptRegistryStructure(registry, documentIds)
  const pages = await validateConceptPages(registry, root)
  const errors = [...structure.errors, ...pages.errors]
  const warnings = [...structure.warnings, ...pages.warnings]

  if (errors.length > 0) {
    console.error('Concept usage graph contract failed:')
    for (const error of errors) console.error(`  ${error}`)
    process.exitCode = 1
    return
  }

  const summary = summarizeConcepts(registry)
  const lexicalDocuments = pages.lexicalCoverage.reduce((total, item) => total + item.lexicalDocuments, 0)
  const unregisteredDocuments = pages.lexicalCoverage.reduce((total, item) => total + item.unregisteredDocuments, 0)
  const linkedPreDefinitionLeads = pages.lexicalCoverage.reduce((total, item) => total + item.linkedPreDefinitionDocuments.length, 0)
  const preDefinitionLeads = pages.lexicalCoverage.reduce((total, item) => total + item.preDefinitionDocuments.length, 0)

  console.log(
    `Concept usage graph passed: ${summary.concepts} concepts, ${summary.aliases} aliases, ` +
      `${summary.definitions} first definitions, ${summary.usages} reviewed cross-document uses, ` +
      `${summary.prerequisiteEdges} prerequisite edges, ${summary.conflictPairs} conflict pairs, ` +
      `${summary.relatedPairs} navigation pairs.`
  )
  console.log(
    `Coverage boundary: ${lexicalDocuments} concept/document lexical leads observed; ` +
      `${unregisteredDocuments} are outside the reviewed semantic sample. ` +
      `${linkedPreDefinitionLeads} earlier-learning-order leads backlink their definitions; ${preDefinitionLeads} unresolved early leads remain. ` +
      'Unregistered occurrences remain audit leads, not registered semantic uses.'
  )
  for (const warning of warnings) console.warn(`Concept warning: ${warning}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
