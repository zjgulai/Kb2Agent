import assert from 'node:assert/strict'
import test from 'node:test'
import {
  baselineMockProvider,
  compareEvaluationReceipts,
  degradedMockProvider,
  evaluationFixtureVersion,
  runEvaluationFixture
} from '../../fixtures/evaluation-regression.mjs'

test('evaluation fixture covers answer, refusal and parser-failure paths without external calls', () => {
  const receipt = runEvaluationFixture(baselineMockProvider)

  assert.equal(receipt.fixtureVersion, evaluationFixtureVersion)
  assert.equal(receipt.decision, 'pass')
  assert.equal(receipt.total, 3)
  assert.equal(receipt.passed, 3)
  assert.equal(receipt.externalCalls, 0)
  assert.deepEqual(
    receipt.cases.map(({ caseId, observedDisposition, passed }) => ({ caseId, observedDisposition, passed })),
    [
      { caseId: 'grounded-answer', observedDisposition: 'answer', passed: true },
      { caseId: 'insufficient-evidence-refusal', observedDisposition: 'refuse', passed: true },
      { caseId: 'malformed-provider-output', observedDisposition: 'parse-error', passed: true }
    ]
  )
})

test('evaluation comparison fails closed when a candidate loses required evidence', () => {
  const baseline = runEvaluationFixture(baselineMockProvider)
  const candidate = runEvaluationFixture(degradedMockProvider)
  const comparison = compareEvaluationReceipts(baseline, candidate)

  assert.equal(candidate.decision, 'blocked')
  assert.equal(candidate.failed, 1)
  assert.equal(comparison.decision, 'regression-blocked')
  assert.ok(comparison.passRateDelta < 0)
  assert.equal(comparison.externalCalls, 0)
})
