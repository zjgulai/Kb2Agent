import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const registryPath = path.resolve(currentDirectory, '..', 'knowledge-system', 'claims.yml')

function readRegistry(source) {
  return matter(`---\n${source.trimEnd()}\n---\n`).data
}

export default {
  watch: ['../knowledge-system/claims.yml'],
  async load() {
    const registry = readRegistry(await fs.readFile(registryPath, 'utf8'))
    return {
      schemaVersion: registry.schemaVersion,
      claims: registry.claims,
      ownerRoles: Object.fromEntries(registry.ownerRoles.map((role) => [role.roleId, role])),
      sources: Object.fromEntries(registry.sources.map((source) => [source.sourceId, source])),
      evidence: Object.fromEntries(registry.evidence.map((item) => [item.evidenceId, item]))
    }
  }
}
