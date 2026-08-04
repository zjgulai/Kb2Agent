#!/usr/bin/env node

import process from 'node:process'
import {
  evaluateAcceptanceContracts,
  loadAcceptanceRegistry,
  summarizeAcceptance,
  validateAcceptancePages,
  validateAcceptanceRegistryStructure
} from './acceptance-registry.mjs'

const root = process.cwd()

async function main() {
  const registry = await loadAcceptanceRegistry(root)
  const structure = validateAcceptanceRegistryStructure(registry)
  const evaluation = await evaluateAcceptanceContracts(registry, root)
  const pages = await validateAcceptancePages(registry, evaluation, root)
  const summary = summarizeAcceptance(registry, evaluation)
  const errors = [...structure.errors, ...evaluation.errors, ...pages.errors]
  const warnings = [...structure.warnings, ...evaluation.warnings, ...pages.warnings]

  console.log(`Acceptance registry: ${summary.contracts} contracts / ${summary.localReproducible} locally reproducible / ${summary.accepted} accepted`)
  console.log(`Fixed-set boundary: ${summary.negativeCases} negative cases / ${summary.externalCalls} external calls / ${summary.sideEffects} side effects`)
  console.log(`Computed states: ${Object.entries(summary.byState).map(([state, count]) => `${state}=${count}`).join(', ')}`)
  console.log(`Blockers: ${Object.entries(summary.blockerCounts).map(([blocker, count]) => `${blocker}=${count}`).join(', ')}`)
  for (const warning of warnings) console.warn(`warning: ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`error: ${error}`)
    process.exitCode = 1
    return
  }
  console.log(`Acceptance identity, fixed datasets, negative cases, threshold replay, regression delta and ${pages.documentCount}/26 maturity guards passed.`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
