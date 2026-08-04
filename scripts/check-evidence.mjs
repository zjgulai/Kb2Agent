#!/usr/bin/env node

import process from 'node:process'
import {
  loadClaimRegistry,
  summarizeClaims,
  validateClaimRegistryStructure,
  validateEvidenceRegistry
} from './claim-registry.mjs'

const root = process.cwd()

async function main() {
  const registry = await loadClaimRegistry(root)
  const structure = validateClaimRegistryStructure(registry)
  const evidence = await validateEvidenceRegistry(registry, root)
  const errors = [...structure.errors, ...evidence.errors]
  const warnings = [...structure.warnings, ...evidence.warnings]
  const summary = summarizeClaims(registry)

  console.log(`Evidence grades: ${Object.entries(summary.byGrade).map(([grade, count]) => `${grade}=${count}`).join(', ')}`)
  console.log(`Evidence boundary: L0=${summary.byGrade['L0-unverified'] || 0}, L1=${summary.byGrade['L1-public-or-runtime'] || 0}, L2=${summary.byGrade['L2-fixture-or-dry-run'] || 0}, L3/L4=${(summary.byGrade['L3-production-read-only'] || 0) + (summary.byGrade['L4-authorized-live'] || 0)}`)
  for (const warning of warnings) console.warn(`warning: ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`error: ${error}`)
    process.exitCode = 1
    return
  }
  console.log('Source, local evidence, status-to-grade and anti-promotion checks passed.')
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
