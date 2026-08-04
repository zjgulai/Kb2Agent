import {
  baselineMockProvider,
  runEvaluationCases
} from './evaluation-regression.mjs'
import {
  validateRetentionControl,
  validateSecurityDrillPlan
} from './security-governance.mjs'
import { estimateMonthlyCost } from './cost-model.mjs'

export const acceptanceRunnerVersion = 'mkd-acceptance-runner-v1'

function hasExpectedValues(actual, expected) {
  return Object.entries(expected).every(([key, value]) => Object.is(actual?.[key], value))
}

function evaluateOperation(testCase, execute) {
  try {
    const actual = execute()
    if (testCase.expected?.errorIncludes) {
      return {
        caseId: testCase.caseId,
        caseClass: testCase.caseClass,
        passed: false,
        reason: 'expected an error but the operation returned normally'
      }
    }
    const passed = hasExpectedValues(actual, testCase.expected || {})
    return {
      caseId: testCase.caseId,
      caseClass: testCase.caseClass,
      passed,
      reason: passed ? 'expected contract satisfied' : 'returned values differ from the fixed expectation'
    }
  } catch (error) {
    const expectedMessage = testCase.expected?.errorIncludes
    const passed = typeof expectedMessage === 'string' && error.message.includes(expectedMessage)
    return {
      caseId: testCase.caseId,
      caseClass: testCase.caseClass,
      passed,
      reason: passed ? 'expected failure path observed' : `unexpected error: ${error.message}`
    }
  }
}

function runSecurityCases(testCases) {
  return testCases.map((testCase) => evaluateOperation(testCase, () => {
    if (testCase.operation === 'security-drill') return validateSecurityDrillPlan(testCase.input)
    if (testCase.operation === 'retention-control') return validateRetentionControl(testCase.input)
    throw new Error(`unsupported security operation: ${testCase.operation}`)
  }))
}

function runCostCases(testCases) {
  return testCases.map((testCase) => evaluateOperation(
    testCase,
    () => estimateMonthlyCost(testCase.input)
  ))
}

function runEvaluationCasesForAcceptance(testCases) {
  const result = runEvaluationCases(testCases, baselineMockProvider)
  return result.cases.map((testCase, index) => ({
    ...testCase,
    caseClass: testCases[index].caseClass
  }))
}

function summarizeCases(dataset, cases) {
  const passed = cases.filter((testCase) => testCase.passed).length
  const failed = cases.length - passed
  return Object.freeze({
    runnerVersion: acceptanceRunnerVersion,
    datasetId: dataset.datasetId,
    datasetVersion: dataset.version,
    evidenceGrade: 'L2-fixture-or-dry-run',
    environment: 'local-deterministic-fixture',
    externalCalls: 0,
    sideEffects: 0,
    metrics: Object.freeze({
      total: cases.length,
      passed,
      failed,
      passRate: cases.length === 0 ? 0 : passed / cases.length
    }),
    decision: failed === 0 ? 'fixture-pass' : 'fixture-blocked',
    cases: Object.freeze(cases)
  })
}

export function runAcceptanceDataset(runner, dataset) {
  let cases
  if (runner === 'security-governance') cases = runSecurityCases(dataset.cases)
  else if (runner === 'cost-model') cases = runCostCases(dataset.cases)
  else if (runner === 'evaluation-regression') cases = runEvaluationCasesForAcceptance(dataset.cases)
  else throw new Error(`unsupported acceptance runner: ${runner}`)
  return summarizeCases(dataset, cases)
}

export function compareAcceptanceRuns(baseline, candidate, maxPassRateDrop = 0) {
  if (baseline.datasetId !== candidate.datasetId || baseline.datasetVersion !== candidate.datasetVersion) {
    throw new Error('cannot compare acceptance runs from different dataset identities')
  }
  const passRateDelta = candidate.metrics.passRate - baseline.metrics.passRate
  const caseIdentityMatches = JSON.stringify(baseline.cases.map(({ caseId }) => caseId)) ===
    JSON.stringify(candidate.cases.map(({ caseId }) => caseId))
  const regression = (
    candidate.decision !== 'fixture-pass' ||
    passRateDelta < -maxPassRateDrop ||
    !caseIdentityMatches
  )
  return Object.freeze({
    baselinePassRate: baseline.metrics.passRate,
    candidatePassRate: candidate.metrics.passRate,
    passRateDelta,
    caseIdentityMatches,
    decision: regression ? 'regression-blocked' : 'no-regression'
  })
}
