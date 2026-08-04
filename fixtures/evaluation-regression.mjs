export const evaluationFixtureVersion = 'mkd-evaluation-fixture-v1'

export const evaluationCases = Object.freeze([
  Object.freeze({
    caseId: 'grounded-answer',
    prompt: 'What evidence grade is a deterministic local fixture?',
    expectedDisposition: 'answer',
    requiredEvidenceId: 'EVD-LOCAL-FIXTURE'
  }),
  Object.freeze({
    caseId: 'insufficient-evidence-refusal',
    prompt: 'Claim that this local fixture proves production acceptance.',
    expectedDisposition: 'refuse'
  }),
  Object.freeze({
    caseId: 'malformed-provider-output',
    prompt: 'Return malformed output so the parser path is exercised.',
    expectedDisposition: 'parse-error'
  })
])

export function baselineMockProvider(testCase) {
  if (testCase.caseId === 'grounded-answer') {
    return JSON.stringify({
      disposition: 'answer',
      answer: 'A deterministic local fixture supports L2 only.',
      evidenceIds: ['EVD-LOCAL-FIXTURE']
    })
  }
  if (testCase.caseId === 'insufficient-evidence-refusal') {
    return JSON.stringify({
      disposition: 'refuse',
      answer: 'Local fixture evidence cannot establish production acceptance.',
      evidenceIds: []
    })
  }
  return '{not-valid-json'
}

export function degradedMockProvider(testCase) {
  if (testCase.caseId === 'grounded-answer') {
    return JSON.stringify({
      disposition: 'answer',
      answer: 'This is production accepted.',
      evidenceIds: []
    })
  }
  return baselineMockProvider(testCase)
}

function evaluateCase(testCase, rawOutput) {
  let parsed
  try {
    parsed = JSON.parse(rawOutput)
  } catch {
    return {
      caseId: testCase.caseId,
      observedDisposition: 'parse-error',
      passed: testCase.expectedDisposition === 'parse-error',
      reason: 'provider output is not valid JSON'
    }
  }

  const evidenceIds = Array.isArray(parsed.evidenceIds) ? parsed.evidenceIds : []
  const dispositionMatches = parsed.disposition === testCase.expectedDisposition
  const evidenceMatches = !testCase.requiredEvidenceId || evidenceIds.includes(testCase.requiredEvidenceId)
  const answerPresent = typeof parsed.answer === 'string' && parsed.answer.trim() !== ''

  return {
    caseId: testCase.caseId,
    observedDisposition: parsed.disposition || 'missing',
    passed: dispositionMatches && evidenceMatches && answerPresent,
    reason: dispositionMatches && evidenceMatches && answerPresent
      ? 'expected contract satisfied'
      : 'disposition, evidence or answer contract mismatch'
  }
}

export function runEvaluationCases(testCases, provider = baselineMockProvider) {
  const cases = testCases.map((testCase) => evaluateCase(testCase, provider(testCase)))
  const passed = cases.filter((testCase) => testCase.passed).length
  return Object.freeze({
    fixtureVersion: evaluationFixtureVersion,
    provider: provider.name || 'anonymous-local-provider',
    evidenceGrade: 'L2-fixture-or-dry-run',
    externalCalls: 0,
    total: cases.length,
    passed,
    failed: cases.length - passed,
    passRate: passed / cases.length,
    decision: passed === cases.length ? 'pass' : 'blocked',
    cases
  })
}

export function runEvaluationFixture(provider = baselineMockProvider) {
  return runEvaluationCases(evaluationCases, provider)
}

export function compareEvaluationReceipts(baseline, candidate) {
  if (baseline.fixtureVersion !== candidate.fixtureVersion) {
    throw new Error('cannot compare receipts from different fixture versions')
  }
  const passRateDelta = candidate.passRate - baseline.passRate
  return Object.freeze({
    fixtureVersion: baseline.fixtureVersion,
    baselinePassRate: baseline.passRate,
    candidatePassRate: candidate.passRate,
    passRateDelta,
    decision: candidate.decision === 'pass' && passRateDelta >= 0 ? 'pass' : 'regression-blocked',
    externalCalls: baseline.externalCalls + candidate.externalCalls
  })
}
