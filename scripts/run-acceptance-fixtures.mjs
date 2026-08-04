#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { runAcceptanceDataset } from '../fixtures/acceptance-harness.mjs'
import {
  loadAcceptanceRegistry,
  loadJsonArtifact,
  sha256Artifact
} from './acceptance-registry.mjs'

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1]
}

async function main() {
  const root = process.cwd()
  const acceptanceId = argumentValue('--contract')
  if (!acceptanceId) throw new Error('--contract ACC-* is required')
  const registry = await loadAcceptanceRegistry(root)
  const contract = registry.contracts.find((item) => item.acceptanceId === acceptanceId)
  if (!contract) throw new Error(`unknown acceptance contract: ${acceptanceId}`)
  const datasetPath = path.join(root, contract.dataset.path)
  const dataset = await loadJsonArtifact(datasetPath)
  const result = runAcceptanceDataset(contract.regression.runner, dataset)
  const output = {
    contractId: acceptanceId,
    datasetSha256: await sha256Artifact(datasetPath),
    ...result,
    cases: result.cases.map(({ caseId, caseClass, passed, reason }) => ({ caseId, caseClass, passed, reason }))
  }
  console.log(JSON.stringify(output, null, 2))
  if (result.decision !== 'fixture-pass') process.exitCode = 1
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
