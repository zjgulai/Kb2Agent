#!/usr/bin/env node

import process from 'node:process'
import {
  loadClaimRegistry,
  summarizeClaims,
  validateClaimPages,
  validateClaimRegistryStructure
} from './claim-registry.mjs'

const root = process.cwd()

async function main() {
  const registry = await loadClaimRegistry(root)
  const structure = validateClaimRegistryStructure(registry)
  const pages = await validateClaimPages(registry, root)
  const errors = [...structure.errors, ...pages.errors]
  const warnings = [...structure.warnings, ...pages.warnings]
  const summary = summarizeClaims(registry)

  console.log(`Claim registry: ${summary.claims} claims / ${summary.sources} sources / ${summary.evidence} evidence records`)
  console.log(`Pilot coverage: ${Object.entries(summary.byDocument).map(([id, count]) => `${id}=${count}`).join(', ')}`)
  console.log(`Verification: ${Object.entries(summary.byVerification).map(([status, count]) => `${status}=${count}`).join(', ')}`)
  console.log(`Ownership: ${summary.ownerRoles} roles / ${summary.ownerRoleMappingsMissing} claim mapping gaps / ${summary.ownerAssigneesMissing} named assignees pending / ${summary.ownerRolesAccepted} accepted`)
  for (const warning of warnings) console.warn(`warning: ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`error: ${error}`)
    process.exitCode = 1
    return
  }
  console.log('Claim identity, page references, stable anchors and visible ledgers passed.')
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
