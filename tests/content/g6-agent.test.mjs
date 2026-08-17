import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { buildG6Agent } from '../../scripts/build-g6-agent.mjs'
import {
  CAPABILITY_MANIFEST,
  runG6Agent
} from '../../reference/runtime/g6-agent.mjs'
import { canonicalJson, readJson } from '../../reference/runtime/utils.mjs'

const root = process.cwd()
const fixtureFile = path.join(root, 'reference/fixtures/g6/agent-cases-v1.json')
const buildRoot = path.join(root, 'reference/build/m1b')
const schemaRoot = path.join(root, 'reference/schemas/g6')

async function runtime() {
  return {
    pkg: await readJson(path.join(buildRoot, 'reference-package.json')),
    indexFile: path.join(buildRoot, 'index.sqlite')
  }
}

async function fixtures() {
  return (await readJson(fixtureFile)).cases
}

async function validator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false })
  const schemaFiles = (await fs.readdir(schemaRoot)).filter((name) => name.endsWith('.json')).sort()
  for (const name of schemaFiles) ajv.addSchema(await readJson(path.join(schemaRoot, name)))
  return ajv
}

async function localImportGraph(entryFiles) {
  const queue = [...entryFiles]
  const visited = new Set()
  const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g

  while (queue.length) {
    const relativeFile = queue.shift()
    if (visited.has(relativeFile)) continue
    visited.add(relativeFile)
    const source = await fs.readFile(path.join(root, relativeFile), 'utf8')
    for (const match of source.matchAll(importPattern)) {
      if (!match[1].startsWith('.')) continue
      const resolved = path.resolve(path.dirname(path.join(root, relativeFile)), match[1])
      const candidate = path.extname(resolved) ? resolved : `${resolved}.mjs`
      const local = path.relative(root, candidate)
      assert.ok(!local.startsWith('..'), `import escapes repository root: ${match[1]}`)
      queue.push(local)
    }
  }

  return [...visited].sort()
}

test('G6 fixture matrix is exactly 8 normal, 4 missing, 3 conflict, 3 unauthorized and 2 fault', async () => {
  const rows = await fixtures()
  assert.equal(rows.length, 20)
  assert.deepEqual(
    Object.fromEntries(['normal', 'missing', 'conflict', 'unauthorized', 'fault'].map((category) => [category, rows.filter((row) => row.category === category).length])),
    { normal: 8, missing: 4, conflict: 3, unauthorized: 3, fault: 2 }
  )
  assert.equal(new Set(rows.map((row) => row.fixtureId)).size, 20)
})

test('G6 capability manifest is replay-only, least-privilege and has eight zero-effect tools', () => {
  assert.equal(CAPABILITY_MANIFEST.mode, 'replay')
  assert.equal(CAPABILITY_MANIFEST.tools.length, 8)
  assert.ok(CAPABILITY_MANIFEST.tools.every((tool) => tool.sideEffect === false && tool.onFailure === 'fail-closed'))
  assert.equal(CAPABILITY_MANIFEST.providerCallsAllowed, false)
  assert.equal(CAPABILITY_MANIFEST.externalWritesAllowed, false)
  assert.equal(CAPABILITY_MANIFEST.canonicalWritesAllowed, false)
})

test('all twenty cases are deterministic, cite evidence when applicable and preserve zero side effects', async () => {
  const environment = await runtime()
  for (const [index, fixture] of (await fixtures()).entries()) {
    const first = runG6Agent({ ...environment, fixture, ordinal: index + 1 })
    const second = runG6Agent({ ...environment, fixture, ordinal: index + 1 })
    assert.equal(canonicalJson(first), canonicalJson(second), fixture.fixtureId)
    assert.equal(first.executionReceipt.terminalState, fixture.expected.terminalState, fixture.fixtureId)
    assert.equal(first.executionReceipt.reasonCode, fixture.expected.reasonCode || 'READY_FOR_HUMAN_APPROVAL', fixture.fixtureId)
    assert.equal(first.executionReceipt.providerCalls, 0, fixture.fixtureId)
    assert.equal(first.executionReceipt.externalCalls, 0, fixture.fixtureId)
    assert.equal(first.executionReceipt.sideEffects, 0, fixture.fixtureId)
    assert.equal(first.executionReceipt.canonicalWrites, 0, fixture.fixtureId)
    assert.equal(first.executionReceipt.platformWrites, 0, fixture.fixtureId)
    assert.ok(first.toolCallReceipts.every((receipt) => receipt.sideEffects === 0 && receipt.externalCalls === 0), fixture.fixtureId)
    if (first.actionPackage) {
      assert.ok(first.actionPackage.facts.every((fact) => fact.evidenceRefs.length > 0), fixture.fixtureId)
    }
  }
})

test('terminal-state distribution is fail-closed and never claims completed', async () => {
  const environment = await runtime()
  const states = (await fixtures()).map((fixture, index) => runG6Agent({ ...environment, fixture, ordinal: index + 1 }).executionReceipt.terminalState)
  assert.deepEqual(
    Object.fromEntries(['needs-approval', 'needs-review', 'refused', 'failed', 'completed'].map((state) => [state, states.filter((value) => value === state).length])),
    { 'needs-approval': 8, 'needs-review': 7, refused: 3, failed: 2, completed: 0 }
  )
})

test('G6 schemas validate every emitted contract object', async () => {
  const ajv = await validator()
  const environment = await runtime()
  for (const [index, fixture] of (await fixtures()).entries()) {
    const result = runG6Agent({ ...environment, fixture, ordinal: index + 1 })
    const pairs = [
      ['https://mkd.local/schemas/g6/capability-manifest.schema.json', result.capabilityManifest],
      ['https://mkd.local/schemas/g6/execution-plan.schema.json', result.executionPlan],
      ['https://mkd.local/schemas/g6/agent-execution-receipt.schema.json', result.executionReceipt]
    ]
    for (const receipt of result.toolCallReceipts) pairs.push(['https://mkd.local/schemas/g6/tool-call-receipt.schema.json', receipt])
    if (result.actionPackage) pairs.push(['https://mkd.local/schemas/g6/action-package.schema.json', result.actionPackage])
    if (result.approvalDecision) pairs.push(['https://mkd.local/schemas/g6/approval-decision.schema.json', result.approvalDecision])
    if (result.refusalReceipt) pairs.push(['https://mkd.local/schemas/g6/refusal-receipt.schema.json', result.refusalReceipt])
    for (const [schemaId, value] of pairs) {
      const validate = ajv.getSchema(schemaId)
      assert.ok(validate, schemaId)
      assert.equal(validate(value), true, `${fixture.fixtureId} ${schemaId}: ${ajv.errorsText(validate.errors)}`)
    }
  }
})

test('needs-review cases never promote blocked evidence into an exact ACOS fact', async () => {
  const environment = await runtime()
  const reviewFixtures = (await fixtures()).filter((fixture) => fixture.expected.terminalState === 'needs-review')
  assert.equal(reviewFixtures.length, 7)

  for (const [index, fixture] of reviewFixtures.entries()) {
    const result = runG6Agent({ ...environment, fixture, ordinal: index + 1 })
    assert.ok(result.actionPackage)
    assert.ok(result.actionPackage.calculations.every((calculation) => calculation.resultState === 'blocked' && !('result' in calculation)))
    assert.ok(result.actionPackage.facts.every((fact) => !/\b(?:28\.4|36\.9|8\.5)\b|\d+(?:\.\d+)?%/.test(fact.text)), `${fixture.fixtureId}: ${result.actionPackage.facts.map(({ text }) => text).join(' | ')}`)
    assert.ok(result.actionPackage.facts.some((fact) => /unavailable|blocked/i.test(fact.text)), fixture.fixtureId)
  }
})

test('G6 schemas reject contradictory calculation and terminal-state combinations', async () => {
  const ajv = await validator()
  const environment = await runtime()
  const rows = await fixtures()
  const normal = runG6Agent({ ...environment, fixture: rows.find(({ category }) => category === 'normal'), ordinal: 1 })
  const review = runG6Agent({ ...environment, fixture: rows.find(({ category }) => category === 'missing'), ordinal: 9 })
  const refused = runG6Agent({ ...environment, fixture: rows.find(({ category }) => category === 'unauthorized'), ordinal: 16 })
  const failed = runG6Agent({ ...environment, fixture: rows.find(({ category }) => category === 'fault'), ordinal: 19 })
  const validateAction = ajv.getSchema('https://mkd.local/schemas/g6/action-package.schema.json')
  const validateReceipt = ajv.getSchema('https://mkd.local/schemas/g6/agent-execution-receipt.schema.json')
  const validateToolCall = ajv.getSchema('https://mkd.local/schemas/g6/tool-call-receipt.schema.json')

  const exactWithoutResult = structuredClone(normal.actionPackage)
  delete exactWithoutResult.calculations[0].result
  assert.equal(validateAction(exactWithoutResult), false, 'exact calculation without result must fail')

  const blockedPromotedToExact = structuredClone(review.actionPackage)
  blockedPromotedToExact.calculations[0].resultState = 'exact'
  assert.equal(validateAction(blockedPromotedToExact), false, 'needs-review cannot carry an exact calculation')

  const completedWithoutApproval = structuredClone(review.executionReceipt)
  completedWithoutApproval.terminalState = 'completed'
  delete completedWithoutApproval.approvalRef
  delete completedWithoutApproval.artifactHashes.approvalDecision
  assert.equal(validateReceipt(completedWithoutApproval), false, 'G6 completed is prohibited')

  const approvalWithoutDecision = structuredClone(normal.executionReceipt)
  delete approvalWithoutDecision.approvalRef
  delete approvalWithoutDecision.artifactHashes.approvalDecision
  assert.equal(validateReceipt(approvalWithoutDecision), false, 'needs-approval requires approval evidence')

  const refusalWithoutReceipt = structuredClone(refused.executionReceipt)
  delete refusalWithoutReceipt.refusalRef
  delete refusalWithoutReceipt.artifactHashes.refusalReceipt
  assert.equal(validateReceipt(refusalWithoutReceipt), false, 'refused requires refusal evidence')

  const failureWithoutError = structuredClone(failed.executionReceipt)
  delete failureWithoutError.error
  assert.equal(validateReceipt(failureWithoutError), false, 'failed requires error evidence')

  const failedCallWithoutError = structuredClone(refused.toolCallReceipts.find(({ status }) => status === 'blocked'))
  delete failedCallWithoutError.errorCode
  assert.equal(validateToolCall(failedCallWithoutError), false, 'non-completed tool call requires errorCode')
})

test('G6 builder emits a source-locked review bundle and pending review packet', async () => {
  const result = await buildG6Agent(root)
  assert.equal(result.evaluation.passed, 20)
  assert.equal(result.evaluation.total, 20)
  assert.equal(result.evaluation.completed, 0)
  assert.equal(result.receipt.evidenceGrade, 'L2-fixture-or-dry-run')
  assert.equal(result.receipt.providerCalls, 0)
  assert.equal(result.receipt.remoteActions, 0)
  assert.equal(result.reviewPacket.status, 'pending-independent-review')
  const publicBundle = await readJson(path.join(root, 'docs/public/reference/g6/agent-lab-bundle.json'))
  assert.equal(publicBundle.cases.length, 20)
  assert.equal(publicBundle.evaluation.passed, 20)
})

test('G6 transitive local import graph contains no network, provider or remote execution capability', async () => {
  const graph = await localImportGraph([
    'reference/runtime/g6-agent.mjs',
    'scripts/build-g6-agent.mjs'
  ])
  const source = await Promise.all(graph.map((file) => fs.readFile(path.join(root, file), 'utf8')))
  const joined = source.join('\n')
  assert.ok(graph.length >= 3, `expected a transitive graph, got ${graph.join(', ')}`)
  assert.doesNotMatch(joined, /node:(?:http|https|net|tls)|\bfetch\s*\(|\bWebSocket\b/)
  assert.doesNotMatch(joined, /openai|anthropic|deepseek|moonshot|provider(?:Client|Request|Invoke)/i)
  assert.doesNotMatch(joined, /node:child_process|\bssh\b|\bdocker\b|\bcurl\b/)
})
