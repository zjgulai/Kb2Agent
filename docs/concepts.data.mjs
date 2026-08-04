import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const knowledgeSystemDirectory = path.resolve(currentDirectory, '..', 'knowledge-system')

function readRegistry(source) {
  return matter(`---\n${source.trimEnd()}\n---\n`).data
}

export default {
  watch: ['../knowledge-system/concepts.yml', '../knowledge-system/documents.yml'],
  async load() {
    const [conceptRegistry, documentRegistry] = await Promise.all([
      fs.readFile(path.join(knowledgeSystemDirectory, 'concepts.yml'), 'utf8').then(readRegistry),
      fs.readFile(path.join(knowledgeSystemDirectory, 'documents.yml'), 'utf8').then(readRegistry)
    ])

    return {
      schemaVersion: conceptRegistry.schemaVersion,
      reviewedAt: conceptRegistry.reviewedAt,
      coverageMode: conceptRegistry.coverageMode,
      scopeNote: conceptRegistry.scopeNote,
      concepts: conceptRegistry.concepts,
      documents: Object.fromEntries(documentRegistry.documents.map((document) => [document.docId, {
        docId: document.docId,
        displayNumber: document.displayNumber,
        learningOrder: document.learningOrder,
        route: document.route,
        title: document.title
      }]))
    }
  }
}
