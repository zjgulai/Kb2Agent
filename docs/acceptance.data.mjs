import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import {
  evaluateAcceptanceContracts,
  loadAcceptanceRegistry
} from '../scripts/acceptance-registry.mjs'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..')

function readRegistry(source) {
  return matter(`---\n${source.trimEnd()}\n---\n`).data
}

export default {
  watch: [
    '../knowledge-system/acceptance.yml',
    '../knowledge-system/acceptance/**/*.json',
    '../knowledge-system/claims.yml',
    '../knowledge-system/documents.yml'
  ],
  async load() {
    const [registry, claimRegistry, documentRegistry] = await Promise.all([
      loadAcceptanceRegistry(projectRoot),
      fs.readFile(path.join(projectRoot, 'knowledge-system', 'claims.yml'), 'utf8').then(readRegistry),
      fs.readFile(path.join(projectRoot, 'knowledge-system', 'documents.yml'), 'utf8').then(readRegistry)
    ])
    const evaluation = await evaluateAcceptanceContracts(registry, projectRoot)
    if (evaluation.errors.length > 0) {
      throw new Error(`Acceptance data is invalid: ${evaluation.errors.join('; ')}`)
    }
    const resultById = new Map(evaluation.results.map((result) => [result.acceptanceId, result]))
    return {
      schemaVersion: registry.schemaVersion,
      reviewedAt: registry.reviewedAt,
      coverageMode: registry.coverageMode,
      acceptanceScope: registry.acceptanceScope,
      scopeNote: registry.scopeNote,
      contracts: registry.contracts.map((contract) => ({
        ...contract,
        result: resultById.get(contract.acceptanceId)
      })),
      ownerRoles: Object.fromEntries(claimRegistry.ownerRoles.map((role) => [role.roleId, role])),
      documents: Object.fromEntries(documentRegistry.documents.map((document) => [document.docId, {
        docId: document.docId,
        displayNumber: document.displayNumber,
        route: document.route,
        title: document.title,
        maturity: document.maturity
      }]))
    }
  }
}
