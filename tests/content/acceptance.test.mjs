import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  computeApprovalBlockers,
  evaluateAcceptanceContracts,
  loadAcceptanceRegistry,
  summarizeAcceptance,
  validateAcceptancePages,
  validateAcceptanceRegistryStructure,
  validateDatasetArtifact,
  validateDocumentAcceptanceState
} from '../../scripts/acceptance-registry.mjs'
import { compareAcceptanceRuns } from '../../fixtures/acceptance-harness.mjs'
import { loadClaimRegistry } from '../../scripts/claim-registry.mjs'
import { loadKnowledgeDocuments } from '../../scripts/knowledge-registry.mjs'

const root = process.cwd()
const expectedApprovalBlockers = [
  'DATASET_NOT_BUSINESS_AUTHORIZED',
  'THRESHOLDS_NOT_APPROVED',
  'OWNER_ACCEPTANCE_INCOMPLETE',
  'FINAL_RECEIPT_MISSING'
]

test('acceptance schema and three-contract pilot expose the true approval boundary', async () => {
  const schema = JSON.parse(await fs.readFile(
    path.join(root, 'knowledge-system', 'schemas', 'acceptance.schema.json'),
    'utf8'
  ))
  const registry = await loadAcceptanceRegistry(root)
  const structure = validateAcceptanceRegistryStructure(registry)
  const evaluation = await evaluateAcceptanceContracts(registry, root)
  const summary = summarizeAcceptance(registry, evaluation)

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.properties.schemaVersion.const, '1.0')
  assert.equal(schema.properties.acceptanceScope.const, 'repository-content')
  assert.deepEqual(structure.errors, [])
  assert.deepEqual(evaluation.errors, [])
  assert.equal(summary.contracts, 3)
  assert.equal(summary.localReproducible, 3)
  assert.equal(summary.accepted, 0)
  assert.equal(summary.negativeCases, 8)
  assert.equal(summary.externalCalls, 0)
  assert.equal(summary.sideEffects, 0)
  assert.deepEqual(summary.byState, { 'approval-blocked': 3 })
})

test('fixed sets, baseline receipts and fresh candidates are identity-locked and regression-free', async () => {
  const registry = await loadAcceptanceRegistry(root)
  const evaluation = await evaluateAcceptanceContracts(registry, root)

  for (const result of evaluation.results) {
    assert.equal(result.localReplayPassed, true)
    assert.equal(result.noRegression, true)
    assert.equal(result.baselinePassRate, 1)
    assert.equal(result.candidatePassRate, 1)
    assert.equal(result.passRateDelta, 0)
    assert.ok(result.negativeCaseCount >= 1)
    assert.deepEqual(result.blockers, expectedApprovalBlockers)
    assert.equal(result.ownerRolesAccepted, 0)
    assert.equal(result.finalReceiptIssued, false)
    assert.ok(result.thresholdResults.every(({ passed, status }) => passed && status === 'illustrative'))
  }

  const pages = await validateAcceptancePages(registry, evaluation, root)
  assert.deepEqual(pages.errors, [])
  assert.equal(pages.documentCount, 26)
})

test('acceptance gate fails closed on missing negative cases, fake approvals and result promotion', async () => {
  const registry = await loadAcceptanceRegistry(root)
  const security = registry.contracts.find(({ acceptanceId }) => acceptanceId === 'ACC-SECURITY-001')
  const dataset = JSON.parse(await fs.readFile(path.join(root, security.dataset.path), 'utf8'))
  const withoutNegatives = structuredClone(dataset)
  withoutNegatives.cases = withoutNegatives.cases.filter(({ caseClass }) => caseClass === 'positive')
  const datasetCheck = validateDatasetArtifact(security, withoutNegatives)
  assert.ok(datasetCheck.errors.some((error) => error.includes('at least one negative case')))

  const fakeThresholdApproval = structuredClone(registry)
  fakeThresholdApproval.contracts[0].thresholds[0].status = 'approved'
  const structure = validateAcceptanceRegistryStructure(fakeThresholdApproval)
  assert.ok(structure.errors.some((error) => error.includes('approved threshold requires approval evidence')))

  const fakeAcceptance = structuredClone(registry)
  fakeAcceptance.contracts[0].declaredState = 'accepted'
  fakeAcceptance.contracts[0].declaredDecision = 'accepted'
  fakeAcceptance.contracts[0].declaredBlockers = []
  const evaluation = await evaluateAcceptanceContracts(fakeAcceptance, root)
  assert.ok(evaluation.errors.some((error) => error.includes('differs from computed approval-blocked')))
  assert.ok(evaluation.errors.some((error) => error.includes('declaredBlockers differ from computed blockers')))
})

test('approval receipts are purpose-bound and cannot be reused by kind alone', async () => {
  const registry = await loadAcceptanceRegistry(root)
  const claimRegistry = await loadClaimRegistry(root)
  const contract = structuredClone(registry.contracts[0])
  const roles = structuredClone(claimRegistry.ownerRoles)
  const unrelatedEvidenceId = 'EVD-UNRELATED-ACCEPTANCE-RECEIPT'
  const unrelatedEvidence = {
    evidenceId: unrelatedEvidenceId,
    title: 'Unrelated acceptance receipt',
    kind: 'acceptance-receipt',
    path: 'content-audit.md',
    grade: 'L1-public-or-runtime',
    command: null,
    assertion: 'This deliberately belongs to another contract and purpose.',
    receipt: {
      acceptanceId: 'ACC-COST-001',
      purpose: 'final-acceptance',
      subjectId: 'ACC-COST-001',
      approverRoleId: 'ROLE-COST-APPROVER',
      issuedAt: '2026-08-03',
      decision: 'accepted',
      artifactSha256: `sha256:${'0'.repeat(64)}`
    }
  }

  contract.dataset.kind = 'authorized-business'
  contract.dataset.authorizationState = 'business-authorized'
  contract.dataset.authorizationEvidenceRef = unrelatedEvidenceId
  contract.thresholds.forEach((threshold) => {
    threshold.status = 'approved'
    threshold.approvalEvidenceRef = unrelatedEvidenceId
  })
  contract.finalReceipt.state = 'issued'
  contract.finalReceipt.evidenceRef = unrelatedEvidenceId
  for (const role of roles.filter(({ roleId }) => contract.ownerRoleRefs.includes(roleId))) {
    role.assignmentState = 'accepted'
    role.assignee = 'Named owner'
    role.acceptedAt = '2026-08-03'
    role.acceptanceEvidenceRef = unrelatedEvidenceId
  }

  const result = computeApprovalBlockers(contract, roles, [...claimRegistry.evidence, unrelatedEvidence])
  assert.deepEqual(result.blockers, expectedApprovalBlockers)
})

test('independent synthetic approval receipts clear each blocker only when correctly bound', async () => {
  const registry = await loadAcceptanceRegistry(root)
  const claimRegistry = await loadClaimRegistry(root)
  const contract = structuredClone(registry.contracts[0])
  const roles = structuredClone(claimRegistry.ownerRoles)
  const evidence = [...claimRegistry.evidence]
  let receiptSequence = 0

  const addReceipt = ({ purpose, subjectId, approverRoleId }) => {
    receiptSequence += 1
    const evidenceId = `EVD-SYNTHETIC-APPROVAL-${String(receiptSequence).padStart(2, '0')}`
    evidence.push({
      evidenceId,
      title: `Synthetic ${purpose} receipt`,
      kind: 'acceptance-receipt',
      path: 'content-audit.md',
      grade: 'L4-authorized-live',
      command: null,
      assertion: 'Synthetic L4-shaped unit-test object; it is not registered and is not approval proof.',
      receipt: {
        acceptanceId: contract.acceptanceId,
        purpose,
        subjectId,
        approverRoleId,
        issuedAt: '2026-08-03',
        decision: 'accepted',
        artifactSha256: `sha256:${String(receiptSequence).padStart(64, '0')}`
      }
    })
    return evidenceId
  }

  for (const role of roles.filter(({ roleId }) => contract.ownerRoleRefs.includes(roleId))) {
    role.assignmentState = 'accepted'
    role.assignee = 'Synthetic test owner'
    role.acceptedAt = '2026-08-03'
    role.acceptanceEvidenceRef = addReceipt({
      purpose: 'owner-acceptance',
      subjectId: role.roleId,
      approverRoleId: role.roleId
    })
  }

  contract.dataset.kind = 'authorized-business'
  contract.dataset.authorizationState = 'business-authorized'
  contract.dataset.authorizationEvidenceRef = addReceipt({
    purpose: 'dataset-authorization',
    subjectId: contract.dataset.datasetId,
    approverRoleId: contract.dataset.authorizationRoleId
  })

  for (const threshold of contract.thresholds) {
    threshold.status = 'approved'
    threshold.approvalEvidenceRef = addReceipt({
      purpose: 'threshold-approval',
      subjectId: threshold.thresholdId,
      approverRoleId: threshold.approvalRoleId
    })
  }

  contract.finalReceipt.state = 'issued'
  contract.finalReceipt.evidenceRef = addReceipt({
    purpose: 'final-acceptance',
    subjectId: contract.acceptanceId,
    approverRoleId: contract.finalReceipt.approverRoleId
  })

  const result = computeApprovalBlockers(contract, roles, evidence)
  assert.deepEqual(result, {
    blockers: [],
    ownersAccepted: true,
    thresholdsApproved: true,
    datasetAuthorized: true,
    finalReceiptIssued: true
  })
  assert.equal(new Set(evidence.slice(-receiptSequence).map(({ evidenceId }) => evidenceId)).size, receiptSequence)

  const blockerByPurpose = new Map([
    ['owner-acceptance', 'OWNER_ACCEPTANCE_INCOMPLETE'],
    ['dataset-authorization', 'DATASET_NOT_BUSINESS_AUTHORIZED'],
    ['threshold-approval', 'THRESHOLDS_NOT_APPROVED'],
    ['final-acceptance', 'FINAL_RECEIPT_MISSING']
  ])
  for (const [purpose, blocker] of blockerByPurpose) {
    const downgradedEvidence = structuredClone(evidence)
    for (const item of downgradedEvidence.filter((candidate) => candidate.receipt?.purpose === purpose)) {
      item.grade = 'LO-S-synthetic'
    }
    assert.ok(computeApprovalBlockers(contract, roles, downgradedEvidence).blockers.includes(blocker))
  }
})

test('page maturity and candidate regression cannot outrun the computed contract decision', async () => {
  const registry = await loadAcceptanceRegistry(root)
  const evaluation = await evaluateAcceptanceContracts(registry, root)
  const documents = await loadKnowledgeDocuments(root)
  const costDocument = documents.find(({ frontmatter }) => frontmatter.docId === 'KS-COST-MODEL')
  const promotedDocument = {
    ...costDocument,
    frontmatter: {
      ...costDocument.frontmatter,
      maturity: 'acceptance',
      verification: 'acceptance-tested'
    }
  }
  const costResult = evaluation.results.find(({ acceptanceId }) => acceptanceId === 'ACC-COST-001')
  assert.ok(validateDocumentAcceptanceState(promotedDocument, costResult).some(
    (error) => error.includes('cannot claim acceptance')
  ))

  const baseline = {
    datasetId: 'ADS-TEST-V1',
    datasetVersion: '1.0.0',
    metrics: { passRate: 1 },
    decision: 'fixture-pass',
    cases: [{ caseId: 'positive', passed: true }, { caseId: 'negative', passed: true }]
  }
  const degraded = {
    ...baseline,
    metrics: { passRate: 0.5 },
    decision: 'fixture-blocked',
    cases: [{ caseId: 'positive', passed: true }, { caseId: 'negative', passed: false }]
  }
  assert.equal(compareAcceptanceRuns(baseline, degraded, 0).decision, 'regression-blocked')
})
