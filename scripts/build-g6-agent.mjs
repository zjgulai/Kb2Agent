#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'
import { CAPABILITY_MANIFEST, runG6Agent } from '../reference/runtime/g6-agent.mjs'
import { artifactHash, canonicalJson, FIXED_NOW, hashFile, readJson, writeJson } from '../reference/runtime/g6-utils.mjs'

const SCHEMA_IDS = {
  dataset: 'https://mkd.local/schemas/g6/fixture-dataset.schema.json',
  capability: 'https://mkd.local/schemas/g6/capability-manifest.schema.json',
  plan: 'https://mkd.local/schemas/g6/execution-plan.schema.json',
  toolCall: 'https://mkd.local/schemas/g6/tool-call-receipt.schema.json',
  action: 'https://mkd.local/schemas/g6/action-package.schema.json',
  approval: 'https://mkd.local/schemas/g6/approval-decision.schema.json',
  refusal: 'https://mkd.local/schemas/g6/refusal-receipt.schema.json',
  receipt: 'https://mkd.local/schemas/g6/agent-execution-receipt.schema.json'
}

async function createValidator(root) {
  const schemaRoot = path.join(root, 'reference/schemas/g6')
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false })
  const files = (await fs.readdir(schemaRoot)).filter((name) => name.endsWith('.json')).sort()
  for (const name of files) ajv.addSchema(await readJson(path.join(schemaRoot, name)))
  return ajv
}

function validateOrThrow(ajv, schemaId, value, label) {
  const validate = ajv.getSchema(schemaId)
  if (!validate) throw new Error(`Missing schema ${schemaId}`)
  if (!validate(value)) throw new Error(`${label} failed ${schemaId}: ${ajv.errorsText(validate.errors)}`)
}

function validateRun(ajv, run) {
  validateOrThrow(ajv, SCHEMA_IDS.capability, run.capabilityManifest, `${run.fixture.fixtureId} capability`)
  validateOrThrow(ajv, SCHEMA_IDS.plan, run.executionPlan, `${run.fixture.fixtureId} plan`)
  for (const receipt of run.toolCallReceipts) validateOrThrow(ajv, SCHEMA_IDS.toolCall, receipt, `${run.fixture.fixtureId} tool call`)
  if (run.actionPackage) validateOrThrow(ajv, SCHEMA_IDS.action, run.actionPackage, `${run.fixture.fixtureId} action`)
  if (run.approvalDecision) validateOrThrow(ajv, SCHEMA_IDS.approval, run.approvalDecision, `${run.fixture.fixtureId} approval`)
  if (run.refusalReceipt) validateOrThrow(ajv, SCHEMA_IDS.refusal, run.refusalReceipt, `${run.fixture.fixtureId} refusal`)
  validateOrThrow(ajv, SCHEMA_IDS.receipt, run.executionReceipt, `${run.fixture.fixtureId} execution receipt`)
}

function evaluationFor(fixtures, runs) {
  const results = fixtures.map((fixture, index) => {
    const run = runs[index]
    const checks = {
      terminalState: run.executionReceipt.terminalState === fixture.expected.terminalState,
      reasonCode: run.executionReceipt.reasonCode === (fixture.expected.reasonCode || 'READY_FOR_HUMAN_APPROVAL'),
      citations: !run.actionPackage || run.actionPackage.facts.every((fact) => fact.evidenceRefs.length > 0),
      toolPolicy: run.toolCallReceipts.every((receipt) => receipt.externalCalls === 0 && receipt.sideEffects === 0),
      zeroEffects: [
        run.executionReceipt.providerCalls,
        run.executionReceipt.externalCalls,
        run.executionReceipt.sideEffects,
        run.executionReceipt.canonicalWrites,
        run.executionReceipt.platformWrites
      ].every((value) => value === 0)
    }
    return {
      fixtureId: fixture.fixtureId,
      category: fixture.category,
      expected: fixture.expected.terminalState,
      actual: run.executionReceipt.terminalState,
      checks,
      passed: Object.values(checks).every(Boolean),
      runId: run.executionReceipt.runId,
      receiptId: run.executionReceipt.receiptId
    }
  })
  const stateCounts = Object.fromEntries(
    ['needs-approval', 'needs-review', 'refused', 'failed', 'completed']
      .map((state) => [state, runs.filter((run) => run.executionReceipt.terminalState === state).length])
  )
  return {
    evaluationId: 'EVAL-G6-A1-AMZ-ADS-V1',
    schemaVersion: 1,
    evidenceGrade: 'L2-fixture-or-dry-run',
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    passRate: results.filter((result) => result.passed).length / results.length,
    ...stateCounts,
    providerCalls: 0,
    externalCalls: 0,
    sideEffects: 0,
    canonicalWrites: 0,
    platformWrites: 0,
    results
  }
}

export async function buildG6Agent(root = process.cwd()) {
  const ajv = await createValidator(root)
  const fixtureFile = path.join(root, 'reference/fixtures/g6/agent-cases-v1.json')
  const dataset = await readJson(fixtureFile)
  validateOrThrow(ajv, SCHEMA_IDS.dataset, dataset, 'G6 fixture dataset')

  const m1bRoot = path.join(root, 'reference/build/m1b')
  const packageFile = path.join(m1bRoot, 'reference-package.json')
  const indexFile = path.join(m1bRoot, 'index.sqlite')
  const pkg = await readJson(packageFile)
  const runs = dataset.cases.map((fixture, index) => runG6Agent({ pkg, indexFile, fixture, ordinal: index + 1 }))
  const parityRuns = dataset.cases.map((fixture, index) => runG6Agent({ pkg, indexFile, fixture, ordinal: index + 1 }))
  if (canonicalJson(runs) !== canonicalJson(parityRuns)) throw new Error('G6 deterministic parity failed')
  for (const run of runs) validateRun(ajv, run)

  const evaluation = evaluationFor(dataset.cases, runs)
  if (evaluation.total !== 20 || evaluation.passed !== 20 || evaluation.completed !== 0) {
    throw new Error(`G6 evaluation failed: ${evaluation.passed}/${evaluation.total}, completed=${evaluation.completed}`)
  }

  const publicRuns = runs.map(({ capabilityManifest, ...run }) => run)
  const bundle = {
    bundleId: 'BUNDLE-G6-A1-AGENT-LAB-V1',
    schemaVersion: 1,
    generatedAt: FIXED_NOW,
    evidenceGrade: 'L2-fixture-or-dry-run',
    dataClass: 'synthetic',
    mode: 'replay',
    capabilityManifest: CAPABILITY_MANIFEST,
    evaluation,
    cases: publicRuns,
    boundaries: {
      liveAgent: false,
      modelInvocation: false,
      externalInput: false,
      externalCalls: 0,
      sideEffects: 0,
      canonicalWrites: 0,
      publicDeploymentUpdated: false
    }
  }
  const sourceLocks = {
    fixtureDataset: await hashFile(fixtureFile),
    m1bReferencePackage: await hashFile(packageFile),
    m1bSqliteIndex: await hashFile(indexFile),
    capabilityManifest: artifactHash(CAPABILITY_MANIFEST)
  }
  const artifactManifest = {
    manifestId: 'MANIFEST-G6-A1-LOCAL-BUILD',
    generatedAt: FIXED_NOW,
    sourceLocks,
    artifacts: {
      bundle: artifactHash(bundle),
      evaluation: artifactHash(evaluation),
      cases: artifactHash(publicRuns)
    }
  }
  const reviewPacket = {
    packetId: 'REVIEW-G6-A1-PENDING',
    schemaVersion: 1,
    status: 'pending-independent-review',
    generatedAt: FIXED_NOW,
    evidenceGrade: 'L2-fixture-or-dry-run',
    sourceLocks,
    checks: {
      fixtures: '20/20',
      normal: '8/8 needs-approval',
      evidenceGates: '7/7 needs-review',
      unauthorized: '3/3 refused',
      faults: '2/2 failed',
      completed: 0,
      deterministicParity: true,
      zeroExternalEffects: true
    },
    supportedClaims: [
      'A frozen synthetic task runs through a deterministic local E2 Agent contract.',
      'Twenty fixture cases are schema-valid, reproducible, and fail closed.',
      'Every emitted execution receipt records zero external and canonical effects.'
    ],
    forbiddenClaims: [
      'The Agent is deployed or available in production.',
      'A live model or advertising platform was called.',
      'The synthetic diagnosis is customer or domain validation.',
      'The runtime is published or licensed for redistribution.'
    ],
    reviewerDecision: null
  }
  const receipt = {
    receiptId: 'RECEIPT-G6-A1-LOCAL-BUILD',
    schemaVersion: 1,
    status: 'passed-local-replay-fixture-gate',
    evidenceGrade: 'L2-fixture-or-dry-run',
    generatedAt: FIXED_NOW,
    sourceLocks,
    artifacts: {
      bundle: artifactHash(bundle),
      evaluation: artifactHash(evaluation),
      manifest: artifactHash(artifactManifest),
      reviewPacket: artifactHash(reviewPacket)
    },
    fixturesPassed: 20,
    fixturesTotal: 20,
    deterministicParity: true,
    providerCalls: 0,
    externalCalls: 0,
    sideEffects: 0,
    canonicalWrites: 0,
    platformWrites: 0,
    remoteActions: 0,
    publicDeploymentUpdated: false,
    gitCommitted: false,
    gitPushed: false
  }

  const buildOutputRoot = path.join(root, 'reference/build/g6')
  await writeJson(path.join(buildOutputRoot, 'capability-manifest.json'), CAPABILITY_MANIFEST)
  await writeJson(path.join(buildOutputRoot, 'evaluation.json'), evaluation)
  await writeJson(path.join(buildOutputRoot, 'agent-lab-bundle.json'), bundle)
  await writeJson(path.join(buildOutputRoot, 'artifact-manifest.json'), artifactManifest)
  await writeJson(path.join(root, 'docs/public/reference/g6/agent-lab-bundle.json'), bundle)
  await writeJson(path.join(root, 'reference/reviews/g6-a1-review-packet.json'), reviewPacket)
  await writeJson(path.join(root, 'reference/receipts/g6-a1-local-build-receipt.json'), receipt)

  return { bundle, evaluation, artifactManifest, reviewPacket, receipt }
}

if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) {
  const result = await buildG6Agent(process.cwd())
  process.stdout.write(`${JSON.stringify({
    status: result.receipt.status,
    evidenceGrade: result.receipt.evidenceGrade,
    fixtures: `${result.evaluation.passed}/${result.evaluation.total}`,
    completed: result.evaluation.completed,
    externalCalls: 0,
    sideEffects: 0
  }, null, 2)}\n`)
}
