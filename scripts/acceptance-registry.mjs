import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  acceptanceRunnerVersion,
  compareAcceptanceRuns,
  runAcceptanceDataset
} from '../fixtures/acceptance-harness.mjs'
import {
  loadClaimRegistry,
  validateClaimRegistryStructure,
  validateEvidenceRegistry
} from './claim-registry.mjs'
import {
  loadKnowledgeDocuments,
  readYamlRegistry
} from './knowledge-registry.mjs'

const acceptanceIdPattern = /^ACC-[A-Z0-9-]+$/
const datasetIdPattern = /^ADS-[A-Z0-9-]+$/
const receiptIdPattern = /^ACR-[A-Z0-9-]+$/
const thresholdIdPattern = /^ACT-[A-Z0-9-]+$/
const documentIdPattern = /^KS-[A-Z0-9-]+$/
const roleIdPattern = /^ROLE-[A-Z0-9-]+$/
const evidenceIdPattern = /^EVD-[A-Z0-9-]+$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const semanticVersionPattern = /^\d+\.\d+\.\d+$/
const sha256Pattern = /^sha256:[a-f0-9]{64}$/

const supportedRunners = new Set(['security-governance', 'cost-model', 'evaluation-regression'])
const supportedMetrics = new Set(['passRate', 'externalCalls', 'sideEffects'])
const supportedOperators = new Set(['eq', 'gte', 'lte'])
const supportedStates = new Set(['draft-invalid', 'regression-blocked', 'approval-blocked', 'accepted'])
const supportedBlockers = new Set([
  'LOCAL_REPLAY_FAILED',
  'REGRESSION_DETECTED',
  'DATASET_NOT_BUSINESS_AUTHORIZED',
  'THRESHOLDS_NOT_APPROVED',
  'OWNER_ACCEPTANCE_INCOMPLETE',
  'FINAL_RECEIPT_MISSING'
])
const expectedOwnerFunctions = new Set([
  'content-owner',
  'evidence-reviewer',
  'test-owner',
  'final-approver'
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

function requireString(record, key, context, errors, pattern = null) {
  const value = record?.[key]
  if (!hasText(value)) {
    errors.push(`${context}.${key} must be a non-empty string`)
    return
  }
  if (pattern && !pattern.test(value)) errors.push(`${context}.${key} has invalid format: ${value}`)
}

function requireArray(record, key, context, errors) {
  if (!Array.isArray(record?.[key])) {
    errors.push(`${context}.${key} must be an array`)
    return []
  }
  const duplicates = duplicateValues(record[key])
  if (duplicates.length > 0) errors.push(`${context}.${key} contains duplicates: ${duplicates.join(', ')}`)
  return record[key]
}

function exactSetMatches(actual, expected) {
  return actual.length === expected.length && actual.every((value) => expected.includes(value))
}

function isSafeRepositoryPath(root, relativePath) {
  if (!hasText(relativePath)) return false
  const absolutePath = path.resolve(root, relativePath)
  const relative = path.relative(root, absolutePath)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export async function sha256Artifact(filePath) {
  const content = await fs.readFile(filePath)
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
}

export async function loadJsonArtifact(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function loadAcceptanceRegistry(root = process.cwd()) {
  return readYamlRegistry(path.join(root, 'knowledge-system', 'acceptance.yml'))
}

export function validateAcceptanceRegistryStructure(registry) {
  const errors = []
  const warnings = []
  if (!isRecord(registry)) return { errors: ['acceptance registry must be an object'], warnings }

  if (registry.schemaVersion !== '1.0') errors.push('schemaVersion must equal "1.0"')
  if (registry.coverageMode !== 'three-document-pilot') errors.push('coverageMode must equal three-document-pilot')
  if (registry.acceptanceScope !== 'repository-content') errors.push('acceptanceScope must equal repository-content')
  requireString(registry, 'registry', 'registry', errors)
  requireString(registry, 'scopeNote', 'registry', errors)
  if (!datePattern.test(String(registry.reviewedAt || ''))) errors.push('registry.reviewedAt must be YYYY-MM-DD')

  const contracts = requireArray(registry, 'contracts', 'registry', errors)
  if (contracts.length !== 3) errors.push(`three-document-pilot must contain exactly 3 contracts; received ${contracts.length}`)
  const acceptanceIds = []
  const documentIds = []
  const datasetIds = []
  const receiptIds = []
  const thresholdIds = []

  for (const [index, contract] of contracts.entries()) {
    const context = `contracts[${index}]`
    if (!isRecord(contract)) {
      errors.push(`${context} must be an object`)
      continue
    }
    requireString(contract, 'acceptanceId', context, errors, acceptanceIdPattern)
    requireString(contract, 'documentId', context, errors, documentIdPattern)
    requireString(contract, 'nextEvidence', context, errors)
    if (contract.targetMaturity !== 'acceptance') errors.push(`${context}.targetMaturity must equal acceptance`)
    if (contract.targetVerification !== 'acceptance-tested') errors.push(`${context}.targetVerification must equal acceptance-tested`)
    if (contract.acceptanceScope !== 'repository-content') errors.push(`${context}.acceptanceScope must equal repository-content`)
    if (contract.productionReady !== false) errors.push(`${context}.productionReady must remain false`)
    if (!supportedStates.has(contract.declaredState)) errors.push(`${context}.declaredState is unsupported: ${contract.declaredState}`)
    if (!['blocked', 'accepted'].includes(contract.declaredDecision)) {
      errors.push(`${context}.declaredDecision must be blocked or accepted`)
    }
    if ((contract.declaredState === 'accepted') !== (contract.declaredDecision === 'accepted')) {
      errors.push(`${context} accepted state and decision must change together`)
    }

    const dataset = contract.dataset
    if (!isRecord(dataset)) {
      errors.push(`${context}.dataset must be an object`)
    } else {
      requireString(dataset, 'datasetId', `${context}.dataset`, errors, datasetIdPattern)
      requireString(dataset, 'version', `${context}.dataset`, errors, semanticVersionPattern)
      requireString(dataset, 'path', `${context}.dataset`, errors)
      requireString(dataset, 'sha256', `${context}.dataset`, errors, sha256Pattern)
      if (!['synthetic-fixture', 'authorized-business'].includes(dataset.kind)) {
        errors.push(`${context}.dataset.kind is unsupported: ${dataset.kind}`)
      }
      if (!['synthetic-only', 'business-authorized'].includes(dataset.authorizationState)) {
        errors.push(`${context}.dataset.authorizationState is unsupported: ${dataset.authorizationState}`)
      }
      requireString(dataset, 'authorizationRoleId', `${context}.dataset`, errors, roleIdPattern)
      if (dataset.authorizationEvidenceRef !== null && !evidenceIdPattern.test(dataset.authorizationEvidenceRef || '')) {
        errors.push(`${context}.dataset.authorizationEvidenceRef must be an evidence ID or null`)
      }
      if (dataset.authorizationState === 'synthetic-only' && dataset.authorizationEvidenceRef !== null) {
        errors.push(`${context}.dataset synthetic-only state cannot contain authorization evidence`)
      }
      if (dataset.authorizationState === 'business-authorized' && !hasText(dataset.authorizationEvidenceRef)) {
        errors.push(`${context}.dataset business-authorized state requires authorization evidence`)
      }
      if (dataset.kind === 'synthetic-fixture' && dataset.authorizationState !== 'synthetic-only') {
        errors.push(`${context}.dataset synthetic fixture cannot be marked business-authorized`)
      }
      datasetIds.push(dataset.datasetId)
    }

    const thresholds = requireArray(contract, 'thresholds', context, errors)
    const metrics = []
    for (const [thresholdIndex, threshold] of thresholds.entries()) {
      const thresholdContext = `${context}.thresholds[${thresholdIndex}]`
      if (!isRecord(threshold)) {
        errors.push(`${thresholdContext} must be an object`)
        continue
      }
      requireString(threshold, 'thresholdId', thresholdContext, errors, thresholdIdPattern)
      requireString(threshold, 'approvalRoleId', thresholdContext, errors, roleIdPattern)
      if (!supportedMetrics.has(threshold.metric)) errors.push(`${thresholdContext}.metric is unsupported: ${threshold.metric}`)
      if (!supportedOperators.has(threshold.operator)) errors.push(`${thresholdContext}.operator is unsupported: ${threshold.operator}`)
      if (!Number.isFinite(threshold.value)) errors.push(`${thresholdContext}.value must be a finite number`)
      if (!['illustrative', 'approved'].includes(threshold.status)) errors.push(`${thresholdContext}.status is unsupported: ${threshold.status}`)
      if (threshold.approvalEvidenceRef !== null && !evidenceIdPattern.test(threshold.approvalEvidenceRef || '')) {
        errors.push(`${thresholdContext}.approvalEvidenceRef must be an evidence ID or null`)
      }
      if (threshold.status === 'illustrative' && threshold.approvalEvidenceRef !== null) {
        errors.push(`${thresholdContext} illustrative threshold cannot contain approval evidence`)
      }
      if (threshold.status === 'approved' && !hasText(threshold.approvalEvidenceRef)) {
        errors.push(`${thresholdContext} approved threshold requires approval evidence`)
      }
      metrics.push(threshold.metric)
      thresholdIds.push(threshold.thresholdId)
    }
    if (!exactSetMatches(metrics, [...supportedMetrics])) {
      errors.push(`${context}.thresholds must define passRate, externalCalls and sideEffects exactly once`)
    }

    const regression = contract.regression
    if (!isRecord(regression)) {
      errors.push(`${context}.regression must be an object`)
    } else {
      if (!supportedRunners.has(regression.runner)) errors.push(`${context}.regression.runner is unsupported: ${regression.runner}`)
      requireString(regression, 'command', `${context}.regression`, errors)
      requireString(regression, 'baselineReceiptId', `${context}.regression`, errors, receiptIdPattern)
      requireString(regression, 'baselinePath', `${context}.regression`, errors)
      requireString(regression, 'baselineSha256', `${context}.regression`, errors, sha256Pattern)
      if (regression.command !== `node scripts/run-acceptance-fixtures.mjs --contract ${contract.acceptanceId}`) {
        errors.push(`${context}.regression.command must be the bounded runner for ${contract.acceptanceId}`)
      }
      if (!Number.isFinite(regression.maxPassRateDrop) || regression.maxPassRateDrop < 0 || regression.maxPassRateDrop > 1) {
        errors.push(`${context}.regression.maxPassRateDrop must be between 0 and 1`)
      }
      receiptIds.push(regression.baselineReceiptId)
    }

    const ownerRoleRefs = requireArray(contract, 'ownerRoleRefs', context, errors)
    if (ownerRoleRefs.length !== 4) errors.push(`${context}.ownerRoleRefs must contain exactly four roles`)
    for (const roleId of ownerRoleRefs) {
      if (!roleIdPattern.test(String(roleId))) errors.push(`${context}.ownerRoleRefs contains invalid role ID: ${roleId}`)
    }

    if (!isRecord(contract.finalReceipt)) {
      errors.push(`${context}.finalReceipt must be an object`)
    } else {
      if (!['missing', 'issued'].includes(contract.finalReceipt.state)) {
        errors.push(`${context}.finalReceipt.state must be missing or issued`)
      }
      if (contract.finalReceipt.evidenceRef !== null && !evidenceIdPattern.test(contract.finalReceipt.evidenceRef || '')) {
        errors.push(`${context}.finalReceipt.evidenceRef must be an evidence ID or null`)
      }
      requireString(contract.finalReceipt, 'approverRoleId', `${context}.finalReceipt`, errors, roleIdPattern)
      if (contract.finalReceipt.state === 'missing' && contract.finalReceipt.evidenceRef !== null) {
        errors.push(`${context}.finalReceipt missing state cannot contain evidence`)
      }
      if (contract.finalReceipt.state === 'issued' && !hasText(contract.finalReceipt.evidenceRef)) {
        errors.push(`${context}.finalReceipt issued state requires evidence`)
      }
    }

    const declaredBlockers = requireArray(contract, 'declaredBlockers', context, errors)
    for (const blocker of declaredBlockers) {
      if (!supportedBlockers.has(blocker)) errors.push(`${context}.declaredBlockers contains unsupported value: ${blocker}`)
    }
    acceptanceIds.push(contract.acceptanceId)
    documentIds.push(contract.documentId)
  }

  for (const [label, values] of [
    ['acceptance IDs', acceptanceIds],
    ['contract document IDs', documentIds],
    ['dataset IDs', datasetIds],
    ['receipt IDs', receiptIds],
    ['threshold IDs', thresholdIds]
  ]) {
    const duplicates = duplicateValues(values)
    if (duplicates.length > 0) errors.push(`duplicate ${label}: ${duplicates.join(', ')}`)
  }

  return { errors, warnings }
}

export function validateDatasetArtifact(contract, dataset) {
  const errors = []
  const context = `${contract.acceptanceId} dataset`
  if (!isRecord(dataset)) return { errors: [`${context} must be an object`], negativeCaseCount: 0 }
  if (dataset.datasetId !== contract.dataset.datasetId) errors.push(`${context} datasetId does not match registry`)
  if (dataset.version !== contract.dataset.version) errors.push(`${context} version does not match registry`)
  if (dataset.documentId !== contract.documentId) errors.push(`${context} documentId does not match contract`)
  if (dataset.kind !== contract.dataset.kind) errors.push(`${context} kind does not match registry`)
  const cases = Array.isArray(dataset.cases) ? dataset.cases : []
  if (cases.length < 2) errors.push(`${context} must contain at least two cases`)
  const caseIds = []
  let positiveCaseCount = 0
  let negativeCaseCount = 0
  for (const [index, testCase] of cases.entries()) {
    if (!isRecord(testCase)) {
      errors.push(`${context}.cases[${index}] must be an object`)
      continue
    }
    requireString(testCase, 'caseId', `${context}.cases[${index}]`, errors)
    if (!['positive', 'negative'].includes(testCase.caseClass)) {
      errors.push(`${context}.cases[${index}].caseClass must be positive or negative`)
    }
    if (testCase.caseClass === 'positive') positiveCaseCount += 1
    if (testCase.caseClass === 'negative') negativeCaseCount += 1
    caseIds.push(testCase.caseId)
  }
  const duplicateCases = duplicateValues(caseIds)
  if (duplicateCases.length > 0) errors.push(`${context} has duplicate case IDs: ${duplicateCases.join(', ')}`)
  if (positiveCaseCount === 0) errors.push(`${context} must contain at least one positive case`)
  if (negativeCaseCount === 0) errors.push(`${context} must contain at least one negative case`)
  return { errors, positiveCaseCount, negativeCaseCount }
}

function validateBaselineReceipt(contract, dataset, receipt) {
  const errors = []
  const context = `${contract.acceptanceId} baseline receipt`
  if (!isRecord(receipt)) return { errors: [`${context} must be an object`] }
  if (receipt.receiptId !== contract.regression.baselineReceiptId) errors.push(`${context} receiptId does not match registry`)
  if (receipt.contractId !== contract.acceptanceId) errors.push(`${context} contractId does not match registry`)
  if (!datePattern.test(String(receipt.recordedAt || ''))) errors.push(`${context} recordedAt must be YYYY-MM-DD`)
  if (receipt.datasetSha256 !== contract.dataset.sha256) errors.push(`${context} dataset digest does not match registry`)
  if (receipt.runnerVersion !== acceptanceRunnerVersion) errors.push(`${context} runnerVersion is stale`)
  if (receipt.datasetId !== dataset.datasetId || receipt.datasetVersion !== dataset.version) {
    errors.push(`${context} dataset identity does not match the fixed set`)
  }
  if (receipt.evidenceGrade !== 'L2-fixture-or-dry-run') errors.push(`${context} must remain L2 fixture evidence`)
  if (receipt.environment !== 'local-deterministic-fixture') errors.push(`${context} environment must remain local-deterministic-fixture`)
  if (receipt.externalCalls !== 0 || receipt.sideEffects !== 0) errors.push(`${context} must record zero external calls and side effects`)
  if (receipt.decision !== 'fixture-pass') errors.push(`${context} must be a passing local baseline`)
  if (!isRecord(receipt.metrics) || receipt.metrics.failed !== 0 || receipt.metrics.passRate !== 1) {
    errors.push(`${context} metrics must record a complete local pass`)
  }
  const expectedCaseIds = dataset.cases.map(({ caseId }) => caseId)
  const receiptCaseIds = Array.isArray(receipt.cases) ? receipt.cases.map(({ caseId }) => caseId) : []
  if (JSON.stringify(expectedCaseIds) !== JSON.stringify(receiptCaseIds)) {
    errors.push(`${context} case identity/order differs from the fixed dataset`)
  }
  if (!Array.isArray(receipt.cases) || receipt.cases.some(({ passed }) => passed !== true)) {
    errors.push(`${context} must record every fixed case as passed`)
  }
  return { errors }
}

function metricValue(run, metric) {
  if (metric === 'passRate') return run.metrics.passRate
  return run[metric]
}

export function evaluateThresholds(thresholds, run) {
  return thresholds.map((threshold) => {
    const actual = metricValue(run, threshold.metric)
    let passed = false
    if (threshold.operator === 'eq') passed = Object.is(actual, threshold.value)
    if (threshold.operator === 'gte') passed = actual >= threshold.value
    if (threshold.operator === 'lte') passed = actual <= threshold.value
    return { ...threshold, actual, passed }
  })
}

function evidenceSupportsApproval(evidenceById, evidenceRef, expected) {
  const evidence = evidenceById.get(evidenceRef)
  const receipt = evidence?.receipt
  return (
    evidence?.kind === 'acceptance-receipt' &&
    evidence?.grade === 'L4-authorized-live' &&
    receipt?.acceptanceId === expected.acceptanceId &&
    receipt?.purpose === expected.purpose &&
    receipt?.subjectId === expected.subjectId &&
    receipt?.approverRoleId === expected.approverRoleId &&
    receipt?.decision === 'accepted' &&
    sha256Pattern.test(receipt?.artifactSha256 || '')
  )
}

export function computeApprovalBlockers(contract, ownerRoles, evidence) {
  const blockers = []
  const roleById = new Map(ownerRoles.map((role) => [role.roleId, role]))
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]))

  const datasetAuthorized = (
    contract.dataset.kind === 'authorized-business' &&
    contract.dataset.authorizationState === 'business-authorized' &&
    roleById.get(contract.dataset.authorizationRoleId)?.assignmentState === 'accepted' &&
    hasText(contract.dataset.authorizationEvidenceRef) &&
    evidenceSupportsApproval(evidenceById, contract.dataset.authorizationEvidenceRef, {
      acceptanceId: contract.acceptanceId,
      purpose: 'dataset-authorization',
      subjectId: contract.dataset.datasetId,
      approverRoleId: contract.dataset.authorizationRoleId
    })
  )
  if (!datasetAuthorized) blockers.push('DATASET_NOT_BUSINESS_AUTHORIZED')

  const thresholdsApproved = contract.thresholds.every((threshold) => {
    const role = roleById.get(threshold.approvalRoleId)
    return (
      threshold.status === 'approved' &&
      role?.assignmentState === 'accepted' &&
      hasText(threshold.approvalEvidenceRef) &&
      evidenceSupportsApproval(evidenceById, threshold.approvalEvidenceRef, {
        acceptanceId: contract.acceptanceId,
        purpose: 'threshold-approval',
        subjectId: threshold.thresholdId,
        approverRoleId: threshold.approvalRoleId
      })
    )
  })
  if (!thresholdsApproved) blockers.push('THRESHOLDS_NOT_APPROVED')

  const ownersAccepted = contract.ownerRoleRefs.every((roleId) => {
    const role = roleById.get(roleId)
    return (
      role?.assignmentState === 'accepted' &&
      hasText(role.acceptanceEvidenceRef) &&
      evidenceSupportsApproval(evidenceById, role.acceptanceEvidenceRef, {
        acceptanceId: contract.acceptanceId,
        purpose: 'owner-acceptance',
        subjectId: roleId,
        approverRoleId: roleId
      })
    )
  })
  if (!ownersAccepted) blockers.push('OWNER_ACCEPTANCE_INCOMPLETE')

  const finalReceiptIssued = (
    contract.finalReceipt.state === 'issued' &&
    roleById.get(contract.finalReceipt.approverRoleId)?.assignmentState === 'accepted' &&
    hasText(contract.finalReceipt.evidenceRef) &&
    evidenceSupportsApproval(evidenceById, contract.finalReceipt.evidenceRef, {
      acceptanceId: contract.acceptanceId,
      purpose: 'final-acceptance',
      subjectId: contract.acceptanceId,
      approverRoleId: contract.finalReceipt.approverRoleId
    })
  )
  if (!finalReceiptIssued) blockers.push('FINAL_RECEIPT_MISSING')

  return { blockers, ownersAccepted, thresholdsApproved, datasetAuthorized, finalReceiptIssued }
}

export async function evaluateAcceptanceContracts(registry, root = process.cwd()) {
  const errors = []
  const warnings = []
  const results = []
  const claimRegistry = await loadClaimRegistry(root)
  const claimStructure = validateClaimRegistryStructure(claimRegistry)
  const evidenceValidation = await validateEvidenceRegistry(claimRegistry, root)
  errors.push(
    ...claimStructure.errors.map((error) => `claim registry: ${error}`),
    ...evidenceValidation.errors.map((error) => `evidence registry: ${error}`)
  )
  const roleById = new Map(claimRegistry.ownerRoles.map((role) => [role.roleId, role]))

  for (const contract of registry.contracts || []) {
    const contractErrors = []
    let dataset
    let baseline
    let candidate
    let comparison
    let thresholdResults = []
    let positiveCaseCount = 0
    let negativeCaseCount = 0

    for (const [label, relativePath, expectedDigest] of [
      ['dataset', contract.dataset?.path, contract.dataset?.sha256],
      ['baseline receipt', contract.regression?.baselinePath, contract.regression?.baselineSha256]
    ]) {
      if (!isSafeRepositoryPath(root, relativePath)) {
        contractErrors.push(`${contract.acceptanceId} ${label} path escapes the repository: ${relativePath}`)
        continue
      }
      try {
        const actualDigest = await sha256Artifact(path.join(root, relativePath))
        if (actualDigest !== expectedDigest) {
          contractErrors.push(`${contract.acceptanceId} ${label} digest drifted: expected ${expectedDigest}, received ${actualDigest}`)
        }
      } catch (error) {
        contractErrors.push(`${contract.acceptanceId} ${label} is unreadable: ${error.message}`)
      }
    }

    try {
      dataset = await loadJsonArtifact(path.join(root, contract.dataset.path))
      const datasetValidation = validateDatasetArtifact(contract, dataset)
      contractErrors.push(...datasetValidation.errors)
      positiveCaseCount = datasetValidation.positiveCaseCount || 0
      negativeCaseCount = datasetValidation.negativeCaseCount || 0
    } catch (error) {
      contractErrors.push(`${contract.acceptanceId} dataset cannot be parsed: ${error.message}`)
    }

    try {
      baseline = await loadJsonArtifact(path.join(root, contract.regression.baselinePath))
      if (dataset) contractErrors.push(...validateBaselineReceipt(contract, dataset, baseline).errors)
    } catch (error) {
      contractErrors.push(`${contract.acceptanceId} baseline receipt cannot be parsed: ${error.message}`)
    }

    if (dataset && baseline) {
      try {
        candidate = runAcceptanceDataset(contract.regression.runner, dataset)
        comparison = compareAcceptanceRuns(baseline, candidate, contract.regression.maxPassRateDrop)
        thresholdResults = evaluateThresholds(contract.thresholds, candidate)
      } catch (error) {
        contractErrors.push(`${contract.acceptanceId} local replay failed: ${error.message}`)
      }
    }

    const documentRoles = contract.ownerRoleRefs.map((roleId) => roleById.get(roleId)).filter(Boolean)
    if (documentRoles.length !== contract.ownerRoleRefs.length) {
      const missing = contract.ownerRoleRefs.filter((roleId) => !roleById.has(roleId))
      contractErrors.push(`${contract.acceptanceId} references unknown owner roles: ${missing.join(', ')}`)
    }
    if (documentRoles.some((role) => role.documentId !== contract.documentId)) {
      contractErrors.push(`${contract.acceptanceId} owner roles must belong to ${contract.documentId}`)
    }
    if (!exactSetMatches(documentRoles.map((role) => role.function), [...expectedOwnerFunctions])) {
      contractErrors.push(`${contract.acceptanceId} must reference one role for each segregated owner function`)
    }
    if (contract.thresholds.some((threshold) => !contract.ownerRoleRefs.includes(threshold.approvalRoleId))) {
      contractErrors.push(`${contract.acceptanceId} threshold approver must be one of the contract owner roles`)
    }
    if (!contract.ownerRoleRefs.includes(contract.dataset.authorizationRoleId) || roleById.get(contract.dataset.authorizationRoleId)?.function !== 'evidence-reviewer') {
      contractErrors.push(`${contract.acceptanceId} dataset authorization role must be the contract evidence-reviewer`)
    }
    if (contract.thresholds.some((threshold) => roleById.get(threshold.approvalRoleId)?.function !== 'final-approver')) {
      contractErrors.push(`${contract.acceptanceId} every threshold approval role must be the contract final-approver`)
    }
    if (!contract.ownerRoleRefs.includes(contract.finalReceipt.approverRoleId) || roleById.get(contract.finalReceipt.approverRoleId)?.function !== 'final-approver') {
      contractErrors.push(`${contract.acceptanceId} final receipt approver must be the contract final-approver`)
    }

    const localReplayPassed = candidate?.decision === 'fixture-pass' && thresholdResults.every(({ passed }) => passed)
    const noRegression = comparison?.decision === 'no-regression'
    const approval = computeApprovalBlockers(contract, claimRegistry.ownerRoles, claimRegistry.evidence)
    const blockers = []
    if (!localReplayPassed) blockers.push('LOCAL_REPLAY_FAILED')
    if (!noRegression) blockers.push('REGRESSION_DETECTED')
    blockers.push(...approval.blockers)

    let computedState = 'accepted'
    if (!localReplayPassed || !noRegression) computedState = 'regression-blocked'
    else if (approval.blockers.length > 0) computedState = 'approval-blocked'
    const computedDecision = computedState === 'accepted' ? 'accepted' : 'blocked'

    if (contract.declaredState !== computedState) {
      contractErrors.push(`${contract.acceptanceId} declaredState ${contract.declaredState} differs from computed ${computedState}`)
    }
    if (contract.declaredDecision !== computedDecision) {
      contractErrors.push(`${contract.acceptanceId} declaredDecision ${contract.declaredDecision} differs from computed ${computedDecision}`)
    }
    if (JSON.stringify(contract.declaredBlockers) !== JSON.stringify(blockers)) {
      contractErrors.push(`${contract.acceptanceId} declaredBlockers differ from computed blockers: ${blockers.join(', ') || '(none)'}`)
    }
    if (computedDecision === 'accepted' && contract.productionReady !== false) {
      contractErrors.push(`${contract.acceptanceId} repository acceptance must not imply production readiness`)
    }
    if (computedDecision !== 'accepted') {
      warnings.push(`${contract.acceptanceId} remains ${computedState}: ${blockers.join(', ')}`)
    }

    errors.push(...contractErrors)
    results.push({
      acceptanceId: contract.acceptanceId,
      documentId: contract.documentId,
      computedState,
      computedDecision,
      blockers,
      localReplayPassed,
      noRegression,
      positiveCaseCount,
      negativeCaseCount,
      datasetId: contract.dataset.datasetId,
      datasetVersion: contract.dataset.version,
      datasetAuthorizationState: contract.dataset.authorizationState,
      baselineReceiptId: contract.regression.baselineReceiptId,
      baselinePassRate: baseline?.metrics?.passRate ?? null,
      candidatePassRate: candidate?.metrics?.passRate ?? null,
      passRateDelta: comparison?.passRateDelta ?? null,
      externalCalls: candidate?.externalCalls ?? null,
      sideEffects: candidate?.sideEffects ?? null,
      thresholdResults,
      ownerRolesAccepted: contract.ownerRoleRefs.filter((roleId) => roleById.get(roleId)?.assignmentState === 'accepted').length,
      ownerRoleCount: contract.ownerRoleRefs.length,
      finalReceiptIssued: approval.finalReceiptIssued,
      errors: contractErrors
    })
  }

  return { errors, warnings, results }
}

export function validateDocumentAcceptanceState(document, contractResult) {
  const errors = []
  const maturityClaimsAcceptance = document.frontmatter.maturity === 'acceptance'
  const verificationClaimsAcceptance = document.frontmatter.verification === 'acceptance-tested'
  if (maturityClaimsAcceptance !== verificationClaimsAcceptance) {
    errors.push(`${document.relativeSource} maturity acceptance and verification acceptance-tested must change together`)
  }
  if ((maturityClaimsAcceptance || verificationClaimsAcceptance) && contractResult?.computedDecision !== 'accepted') {
    errors.push(`${document.relativeSource} cannot claim acceptance while ${contractResult?.acceptanceId || 'no contract'} is not accepted`)
  }
  return errors
}

export async function validateAcceptancePages(registry, evaluation, root = process.cwd(), documentsOverride = null) {
  const errors = []
  const warnings = []
  const documents = documentsOverride || await loadKnowledgeDocuments(root)
  const documentById = new Map(documents.map((document) => [document.frontmatter.docId, document]))
  const contractByDocumentId = new Map((registry.contracts || []).map((contract) => [contract.documentId, contract]))
  const resultByAcceptanceId = new Map(evaluation.results.map((result) => [result.acceptanceId, result]))

  for (const contract of registry.contracts || []) {
    const document = documentById.get(contract.documentId)
    if (!document) {
      errors.push(`${contract.acceptanceId} references missing document ${contract.documentId}`)
      continue
    }
    if (document.frontmatter.acceptanceRef !== contract.acceptanceId) {
      errors.push(`${document.relativeSource} acceptanceRef must equal ${contract.acceptanceId}`)
    }
    if (!document.content.includes('## 验收契约')) {
      errors.push(`${document.relativeSource} is missing the visible acceptance heading`)
    }
    if (!document.content.includes(`<AcceptanceWorkbench acceptance-id="${contract.acceptanceId}" />`)) {
      errors.push(`${document.relativeSource} is missing its AcceptanceWorkbench component`)
    }
    errors.push(...validateDocumentAcceptanceState(document, resultByAcceptanceId.get(contract.acceptanceId)))
  }

  for (const document of documents) {
    const contract = contractByDocumentId.get(document.frontmatter.docId)
    if (document.frontmatter.acceptanceRef !== undefined && !contract) {
      errors.push(`${document.relativeSource} declares acceptanceRef outside the G2.4 pilot`)
    }
    if (!contract && (document.frontmatter.maturity === 'acceptance' || document.frontmatter.verification === 'acceptance-tested')) {
      errors.push(`${document.relativeSource} claims acceptance without an acceptance contract`)
    }
  }

  const appendix = documentById.get('KS-VALIDATION-FRAMEWORK')
  if (!appendix?.content.includes('## 机器可验收契约')) {
    errors.push('docs/knowledge/appendix-validation.md is missing the machine acceptance heading')
  }
  if (!appendix?.content.includes('<AcceptanceWorkbench />')) {
    errors.push('docs/knowledge/appendix-validation.md is missing the aggregate AcceptanceWorkbench')
  }

  return { errors, warnings, documentCount: documents.length }
}

export function summarizeAcceptance(registry, evaluation) {
  const byState = {}
  const blockerCounts = {}
  for (const result of evaluation.results) {
    byState[result.computedState] = (byState[result.computedState] || 0) + 1
    for (const blocker of result.blockers) blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1
  }
  return {
    contracts: registry.contracts?.length || 0,
    localReproducible: evaluation.results.filter((result) => result.localReplayPassed && result.noRegression).length,
    accepted: evaluation.results.filter((result) => result.computedDecision === 'accepted').length,
    negativeCases: evaluation.results.reduce((total, result) => total + result.negativeCaseCount, 0),
    externalCalls: evaluation.results.reduce((total, result) => total + (result.externalCalls || 0), 0),
    sideEffects: evaluation.results.reduce((total, result) => total + (result.sideEffects || 0), 0),
    byState,
    blockerCounts
  }
}
