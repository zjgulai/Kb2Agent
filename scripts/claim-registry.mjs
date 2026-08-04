import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { readYamlRegistry, loadKnowledgeDocuments } from './knowledge-registry.mjs'

export const evidenceGrades = new Set([
  'L0-unverified',
  'L1-public-or-runtime',
  'LO-S-synthetic',
  'L2-fixture-or-dry-run',
  'L3-production-read-only',
  'L4-authorized-live'
])

export const verificationGrades = new Map([
  ['pending', 'L0-unverified'],
  ['blocked', 'L0-unverified'],
  ['source-reviewed', 'L1-public-or-runtime'],
  ['synthetic-supported', 'LO-S-synthetic'],
  ['fixture-verified', 'L2-fixture-or-dry-run'],
  ['production-observed', 'L3-production-read-only'],
  ['authorized-live', 'L4-authorized-live']
])

const claimTypes = new Set([
  'external-fact',
  'legal-context',
  'normative-control',
  'calculation',
  'interface-contract',
  'current-state',
  'methodology'
])
const risks = new Set(['high', 'critical'])
const volatility = new Set(['low', 'medium', 'high'])
const sourceKinds = new Set(['official-web', 'repository'])
const sourceAuthorities = new Set(['first-party', 'project'])
const evidenceKinds = new Set([
  'fixture',
  'test',
  'read-only-audit',
  'acceptance-receipt',
  'production-observation',
  'authorized-live-receipt'
])
const ownerFunctions = new Set([
  'content-owner',
  'evidence-reviewer',
  'test-owner',
  'final-approver'
])
const assignmentStates = new Set(['role-mapped', 'assigned', 'accepted'])
const ownershipFields = new Map([
  ['contentOwner', 'content-owner'],
  ['evidenceReviewer', 'evidence-reviewer'],
  ['testOwner', 'test-owner'],
  ['finalApprover', 'final-approver']
])

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const claimIdPattern = /^CLM-[A-Z0-9-]+$/
const sourceIdPattern = /^SRC-[A-Z0-9-]+$/
const evidenceIdPattern = /^EVD-[A-Z0-9-]+$/
const documentIdPattern = /^KS-[A-Z0-9-]+$/
const roleIdPattern = /^ROLE-[A-Z0-9-]+$/
const acceptanceIdPattern = /^ACC-[A-Z0-9-]+$/
const acceptanceSubjectIdPattern = /^(?:ROLE|ADS|ACT|ACC)-[A-Z0-9-]+$/
const sha256Pattern = /^sha256:[a-f0-9]{64}$/
const acceptanceReceiptPurposes = new Set([
  'owner-acceptance',
  'dataset-authorization',
  'threshold-approval',
  'final-acceptance'
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
  const value = record[key]
  if (!hasText(value)) {
    errors.push(`${context}.${key} must be a non-empty string`)
    return
  }
  if (pattern && !pattern.test(value)) {
    errors.push(`${context}.${key} has invalid format: ${JSON.stringify(value)}`)
  }
}

function requireArray(record, key, context, errors) {
  if (!Array.isArray(record[key])) {
    errors.push(`${context}.${key} must be an array`)
    return []
  }
  const duplicates = duplicateValues(record[key])
  if (duplicates.length > 0) {
    errors.push(`${context}.${key} contains duplicates: ${duplicates.join(', ')}`)
  }
  return record[key]
}

function validateDate(value, context, errors, allowNull = false) {
  if (allowNull && value === null) return
  if (!hasText(value) || !datePattern.test(value)) {
    errors.push(`${context} must be YYYY-MM-DD${allowNull ? ' or null' : ''}`)
  }
}

function validateAcceptanceReceiptArtifact(item, content) {
  const errors = []
  const context = `${item.evidenceId} acceptance receipt artifact`
  let artifact
  try {
    artifact = JSON.parse(content.toString('utf8'))
  } catch (error) {
    return [`${context} must be valid JSON: ${error.message}`]
  }
  if (!isRecord(artifact)) return [`${context} must be an object`]

  const expected = {
    schemaVersion: '1.0',
    evidenceId: item.evidenceId,
    acceptanceId: item.receipt.acceptanceId,
    purpose: item.receipt.purpose,
    subjectId: item.receipt.subjectId,
    approverRoleId: item.receipt.approverRoleId,
    issuedAt: item.receipt.issuedAt,
    decision: item.receipt.decision
  }
  for (const [key, value] of Object.entries(expected)) {
    if (artifact[key] !== value) {
      errors.push(`${context}.${key} must equal ${JSON.stringify(value)}`)
    }
  }
  const unsupported = Object.keys(artifact).filter((key) => !Object.hasOwn(expected, key))
  if (unsupported.length > 0) errors.push(`${context} has unsupported fields: ${unsupported.join(', ')}`)
  return errors
}

export async function loadClaimRegistry(root = process.cwd()) {
  const registryPath = path.join(root, 'knowledge-system', 'claims.yml')
  return readYamlRegistry(registryPath)
}

export function validateClaimRegistryStructure(registry) {
  const errors = []
  const warnings = []

  if (!isRecord(registry)) {
    return { errors: ['claim registry must be an object'], warnings }
  }
  if (registry.schemaVersion !== '2.0') {
    errors.push('schemaVersion must equal "2.0"')
  }

  const pilotDocumentIds = requireArray(registry, 'pilotDocumentIds', 'registry', errors)
  const ownerRoles = requireArray(registry, 'ownerRoles', 'registry', errors)
  const sources = requireArray(registry, 'sources', 'registry', errors)
  const evidence = requireArray(registry, 'evidence', 'registry', errors)
  const claims = requireArray(registry, 'claims', 'registry', errors)

  for (const documentId of pilotDocumentIds) {
    if (!hasText(documentId) || !documentIdPattern.test(documentId)) {
      errors.push(`pilotDocumentIds contains invalid document ID: ${JSON.stringify(documentId)}`)
    }
  }
  const duplicatePilots = duplicateValues(pilotDocumentIds)
  if (duplicatePilots.length > 0) errors.push(`duplicate pilot document IDs: ${duplicatePilots.join(', ')}`)

  const roleIds = []
  const roleById = new Map()
  for (const [index, role] of ownerRoles.entries()) {
    const context = `ownerRoles[${index}]`
    if (!isRecord(role)) {
      errors.push(`${context} must be an object`)
      continue
    }
    requireString(role, 'roleId', context, errors, roleIdPattern)
    requireString(role, 'documentId', context, errors, documentIdPattern)
    requireString(role, 'label', context, errors)
    requireString(role, 'responsibilities', context, errors)
    if (!ownerFunctions.has(role.function)) errors.push(`${context}.function is unsupported: ${role.function}`)
    if (!assignmentStates.has(role.assignmentState)) {
      errors.push(`${context}.assignmentState is unsupported: ${role.assignmentState}`)
    }
    if (!pilotDocumentIds.includes(role.documentId)) {
      errors.push(`${context}.documentId is not in pilotDocumentIds: ${role.documentId}`)
    }
    if (role.assignee !== null && !hasText(role.assignee)) {
      errors.push(`${context}.assignee must be a non-empty string or null`)
    }
    validateDate(role.acceptedAt, `${context}.acceptedAt`, errors, true)
    if (role.acceptanceEvidenceRef !== null && (
      !hasText(role.acceptanceEvidenceRef) || !evidenceIdPattern.test(role.acceptanceEvidenceRef)
    )) {
      errors.push(`${context}.acceptanceEvidenceRef must be an evidence ID or null`)
    }
    if (role.assignmentState === 'role-mapped' && (
      role.assignee !== null || role.acceptedAt !== null || role.acceptanceEvidenceRef !== null
    )) {
      errors.push(`${context} role-mapped state cannot contain assignee or acceptance evidence`)
    }
    if (role.assignmentState === 'assigned' && (
      !hasText(role.assignee) || role.acceptedAt !== null || role.acceptanceEvidenceRef !== null
    )) {
      errors.push(`${context} assigned state requires assignee and forbids acceptance fields`)
    }
    if (role.assignmentState === 'accepted' && (
      !hasText(role.assignee) || !hasText(role.acceptedAt) || !hasText(role.acceptanceEvidenceRef)
    )) {
      errors.push(`${context} accepted state requires assignee, acceptedAt and acceptanceEvidenceRef`)
    }
    roleIds.push(role.roleId)
    roleById.set(role.roleId, role)
  }
  const duplicateRoles = duplicateValues(roleIds)
  if (duplicateRoles.length > 0) errors.push(`duplicate owner role IDs: ${duplicateRoles.join(', ')}`)
  for (const documentId of pilotDocumentIds) {
    for (const ownerFunction of ownerFunctions) {
      const matching = ownerRoles.filter((role) => (
        role.documentId === documentId && role.function === ownerFunction
      ))
      if (matching.length !== 1) {
        errors.push(`${documentId} must define exactly one ${ownerFunction} role; received ${matching.length}`)
      }
    }
  }
  const unacceptedRoles = ownerRoles.filter((role) => role.assignmentState !== 'accepted')
  if (unacceptedRoles.length > 0) {
    warnings.push(`${unacceptedRoles.length} owner roles are mapped but not accepted by named assignees`)
  }

  const sourceIds = []
  for (const [index, source] of sources.entries()) {
    const context = `sources[${index}]`
    if (!isRecord(source)) {
      errors.push(`${context} must be an object`)
      continue
    }
    requireString(source, 'sourceId', context, errors, sourceIdPattern)
    requireString(source, 'title', context, errors)
    requireString(source, 'notes', context, errors)
    validateDate(source.reviewedAt, `${context}.reviewedAt`, errors)
    if (!sourceKinds.has(source.kind)) errors.push(`${context}.kind is unsupported: ${source.kind}`)
    if (!sourceAuthorities.has(source.authority)) errors.push(`${context}.authority is unsupported: ${source.authority}`)
    if (source.kind === 'official-web') requireString(source, 'url', context, errors)
    if (source.kind === 'repository') requireString(source, 'path', context, errors)
    sourceIds.push(source.sourceId)
  }
  const duplicateSources = duplicateValues(sourceIds)
  if (duplicateSources.length > 0) errors.push(`duplicate source IDs: ${duplicateSources.join(', ')}`)

  const evidenceIds = []
  for (const [index, item] of evidence.entries()) {
    const context = `evidence[${index}]`
    if (!isRecord(item)) {
      errors.push(`${context} must be an object`)
      continue
    }
    requireString(item, 'evidenceId', context, errors, evidenceIdPattern)
    requireString(item, 'title', context, errors)
    requireString(item, 'path', context, errors)
    requireString(item, 'assertion', context, errors)
    if (!evidenceKinds.has(item.kind)) errors.push(`${context}.kind is unsupported: ${item.kind}`)
    if (!evidenceGrades.has(item.grade)) errors.push(`${context}.grade is unsupported: ${item.grade}`)
    if (item.command !== null && item.command !== undefined && !hasText(item.command)) {
      errors.push(`${context}.command must be a non-empty string or null`)
    }
    if (item.kind === 'acceptance-receipt') {
      if (item.grade !== 'L4-authorized-live') {
        errors.push(`${context} acceptance-receipt evidence must use L4-authorized-live`)
      }
      if (!isRecord(item.receipt)) {
        errors.push(`${context}.receipt is required for acceptance-receipt evidence`)
      } else {
        requireString(item.receipt, 'acceptanceId', `${context}.receipt`, errors, acceptanceIdPattern)
        requireString(item.receipt, 'subjectId', `${context}.receipt`, errors, acceptanceSubjectIdPattern)
        requireString(item.receipt, 'approverRoleId', `${context}.receipt`, errors, roleIdPattern)
        requireString(item.receipt, 'artifactSha256', `${context}.receipt`, errors, sha256Pattern)
        validateDate(item.receipt.issuedAt, `${context}.receipt.issuedAt`, errors)
        if (!acceptanceReceiptPurposes.has(item.receipt.purpose)) {
          errors.push(`${context}.receipt.purpose is unsupported: ${item.receipt.purpose}`)
        }
        if (item.receipt.decision !== 'accepted') {
          errors.push(`${context}.receipt.decision must equal accepted`)
        }
      }
    } else if (item.receipt !== undefined) {
      errors.push(`${context}.receipt is only allowed for acceptance-receipt evidence`)
    }
    evidenceIds.push(item.evidenceId)
  }
  const duplicateEvidence = duplicateValues(evidenceIds)
  if (duplicateEvidence.length > 0) errors.push(`duplicate evidence IDs: ${duplicateEvidence.join(', ')}`)
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]))
  for (const [index, role] of ownerRoles.entries()) {
    if (role.acceptanceEvidenceRef === null) continue
    const acceptanceEvidence = evidenceById.get(role.acceptanceEvidenceRef)
    if (!acceptanceEvidence) {
      errors.push(`ownerRoles[${index}] references unknown acceptance evidence ${role.acceptanceEvidenceRef}`)
    } else if (acceptanceEvidence.kind !== 'acceptance-receipt') {
      errors.push(`ownerRoles[${index}] acceptance evidence must be an acceptance-receipt`)
    } else if (
      acceptanceEvidence.receipt?.purpose !== 'owner-acceptance' ||
      acceptanceEvidence.receipt?.subjectId !== role.roleId ||
      acceptanceEvidence.receipt?.approverRoleId !== role.roleId
    ) {
      errors.push(`ownerRoles[${index}] acceptance receipt must be bound to ${role.roleId}`)
    }
  }

  const claimIds = []
  const anchors = []
  for (const [index, claim] of claims.entries()) {
    const context = `claims[${index}]`
    if (!isRecord(claim)) {
      errors.push(`${context} must be an object`)
      continue
    }
    requireString(claim, 'claimId', context, errors, claimIdPattern)
    requireString(claim, 'documentId', context, errors, documentIdPattern)
    requireString(claim, 'anchor', context, errors, /^claim-clm-[a-z0-9-]+$/)
    requireString(claim, 'locatorText', context, errors)
    requireString(claim, 'statement', context, errors)
    requireString(claim, 'applicability', context, errors)
    requireString(claim, 'limitations', context, errors)
    requireString(claim, 'nextAction', context, errors)
    const sourceRefs = requireArray(claim, 'sourceRefs', context, errors)
    const evidenceRefs = requireArray(claim, 'evidenceRefs', context, errors)

    if (!claimTypes.has(claim.claimType)) errors.push(`${context}.claimType is unsupported: ${claim.claimType}`)
    if (!risks.has(claim.risk)) errors.push(`${context}.risk must be high or critical`)
    if (!volatility.has(claim.volatility)) errors.push(`${context}.volatility is unsupported: ${claim.volatility}`)
    if (!verificationGrades.has(claim.verification)) errors.push(`${context}.verification is unsupported: ${claim.verification}`)
    if (!evidenceGrades.has(claim.evidenceGrade)) errors.push(`${context}.evidenceGrade is unsupported: ${claim.evidenceGrade}`)
    validateDate(claim.asOf, `${context}.asOf`, errors, true)
    if (!isRecord(claim.ownership)) {
      errors.push(`${context}.ownership must be an object`)
    } else {
      const referencedRoles = []
      for (const [field, expectedFunction] of ownershipFields) {
        const roleId = claim.ownership[field]
        if (!hasText(roleId) || !roleIdPattern.test(roleId)) {
          errors.push(`${context}.ownership.${field} must be a role ID`)
          continue
        }
        const role = roleById.get(roleId)
        if (!role) {
          errors.push(`${context}.ownership.${field} references unknown role ${roleId}`)
          continue
        }
        if (role.documentId !== claim.documentId) {
          errors.push(`${context}.ownership.${field} role ${roleId} belongs to ${role.documentId}`)
        }
        if (role.function !== expectedFunction) {
          errors.push(`${context}.ownership.${field} role ${roleId} must be ${expectedFunction}`)
        }
        referencedRoles.push(roleId)
      }
      if (new Set(referencedRoles).size !== referencedRoles.length) {
        errors.push(`${context}.ownership must use distinct roles for segregation of duties`)
      }
      const extraFields = Object.keys(claim.ownership).filter((field) => !ownershipFields.has(field))
      if (extraFields.length > 0) errors.push(`${context}.ownership has unsupported fields: ${extraFields.join(', ')}`)
    }
    if (claim.volatility === 'high' && claim.asOf === null) errors.push(`${context}.asOf is required for high-volatility claims`)
    if (claim.anchor !== `claim-${String(claim.claimId).toLowerCase()}`) {
      errors.push(`${context}.anchor must equal claim-${String(claim.claimId).toLowerCase()}`)
    }
    if (!pilotDocumentIds.includes(claim.documentId)) {
      errors.push(`${context}.documentId is not in pilotDocumentIds: ${claim.documentId}`)
    }
    for (const sourceRef of sourceRefs) {
      if (!sourceIdPattern.test(sourceRef)) errors.push(`${context}.sourceRefs has invalid ID: ${sourceRef}`)
    }
    for (const evidenceRef of evidenceRefs) {
      if (!evidenceIdPattern.test(evidenceRef)) errors.push(`${context}.evidenceRefs has invalid ID: ${evidenceRef}`)
    }
    claimIds.push(claim.claimId)
    anchors.push(claim.anchor)
  }

  const duplicateClaims = duplicateValues(claimIds)
  if (duplicateClaims.length > 0) errors.push(`duplicate claim IDs: ${duplicateClaims.join(', ')}`)
  const duplicateAnchors = duplicateValues(anchors)
  if (duplicateAnchors.length > 0) errors.push(`duplicate claim anchors: ${duplicateAnchors.join(', ')}`)
  for (const documentId of pilotDocumentIds) {
    if (!claims.some((claim) => claim.documentId === documentId)) {
      errors.push(`pilot document has no registered claims: ${documentId}`)
    }
  }

  return { errors, warnings }
}

export async function validateClaimPages(registry, root = process.cwd()) {
  const errors = []
  const warnings = []
  const documents = await loadKnowledgeDocuments(root)
  const byDocumentId = new Map(documents.map((document) => [document.frontmatter.docId, document]))

  for (const documentId of registry.pilotDocumentIds || []) {
    const document = byDocumentId.get(documentId)
    if (!document) {
      errors.push(`pilot document does not exist: ${documentId}`)
      continue
    }
    const expected = (registry.claims || [])
      .filter((claim) => claim.documentId === documentId)
      .map((claim) => claim.claimId)
      .sort()
    const actual = Array.isArray(document.frontmatter.claimRefs)
      ? [...document.frontmatter.claimRefs].sort()
      : []
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`${document.relativeSource} claimRefs mismatch; expected ${expected.join(', ')}, received ${actual.join(', ') || '(none)'}`)
    }
    if (!document.content.includes('## 关键断言与证据')) {
      errors.push(`${document.relativeSource} is missing the visible claim ledger heading`)
    }
    if (!document.content.includes(`<ClaimLedger document-id="${documentId}" />`)) {
      errors.push(`${document.relativeSource} is missing its ClaimLedger component`)
    }
  }

  for (const document of documents) {
    if (document.frontmatter.claimRefs !== undefined && !registry.pilotDocumentIds.includes(document.frontmatter.docId)) {
      errors.push(`${document.relativeSource} declares claimRefs outside the G2.1 pilot`)
    }
  }

  for (const claim of registry.claims || []) {
    const document = byDocumentId.get(claim.documentId)
    if (!document) continue
    const anchorMarkup = `<a id="${claim.anchor}"></a>`
    const anchorIndex = document.content.indexOf(anchorMarkup)
    if (anchorIndex === -1) {
      errors.push(`${document.relativeSource} is missing anchor ${claim.anchor}`)
      continue
    }
    const locatorIndex = document.content.indexOf(claim.locatorText, anchorIndex)
    if (locatorIndex === -1 || locatorIndex - anchorIndex > 900) {
      errors.push(`${document.relativeSource} locatorText for ${claim.claimId} must occur within 900 characters after its anchor`)
    }
  }

  return { errors, warnings, documentCount: documents.length }
}

function isSafeRepositoryPath(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath)
  const relative = path.relative(root, absolutePath)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function validateEvidenceRegistry(registry, root = process.cwd()) {
  const errors = []
  const warnings = []
  const sourceById = new Map((registry.sources || []).map((source) => [source.sourceId, source]))
  const evidenceById = new Map((registry.evidence || []).map((item) => [item.evidenceId, item]))
  const roleById = new Map((registry.ownerRoles || []).map((role) => [role.roleId, role]))
  const usedSources = new Set()
  const usedEvidence = new Set()
  const realRoot = await fs.realpath(root)

  for (const source of registry.sources || []) {
    if (source.kind === 'official-web') {
      let parsed
      try {
        parsed = new URL(source.url)
      } catch {
        errors.push(`${source.sourceId} has an invalid URL: ${source.url}`)
      }
      if (parsed && parsed.protocol !== 'https:') errors.push(`${source.sourceId} must use HTTPS`)
      if (parsed && /(?:^|\.)example\.com$/i.test(parsed.hostname)) errors.push(`${source.sourceId} uses a placeholder host`)
      if (source.authority !== 'first-party') errors.push(`${source.sourceId} official-web source must be first-party`)
    }
    if (source.kind === 'repository') {
      if (!isSafeRepositoryPath(root, source.path)) {
        errors.push(`${source.sourceId} path escapes the repository: ${source.path}`)
      } else if (!(await exists(path.join(root, source.path)))) {
        errors.push(`${source.sourceId} repository path does not exist: ${source.path}`)
      }
    }
  }

  for (const item of registry.evidence || []) {
    let readableEvidencePath = null
    if (!hasText(item.path) || !isSafeRepositoryPath(root, item.path)) {
      errors.push(`${item.evidenceId} path escapes the repository: ${item.path}`)
    } else {
      try {
        const realTarget = await fs.realpath(path.resolve(root, item.path))
        const relativeTarget = path.relative(realRoot, realTarget)
        if (relativeTarget === '' || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
          errors.push(`${item.evidenceId} path resolves outside the repository: ${item.path}`)
        } else {
          readableEvidencePath = realTarget
        }
      } catch (error) {
        errors.push(`${item.evidenceId} path is missing or unreadable: ${item.path} (${error.message})`)
      }
    }
    if (item.command && !/^node(?:\s|$)/.test(item.command)) {
      errors.push(`${item.evidenceId} command must be a bounded Node command: ${item.command}`)
    }
    if (['fixture', 'test'].includes(item.kind) && item.grade !== 'L2-fixture-or-dry-run') {
      errors.push(`${item.evidenceId} ${item.kind} evidence must use L2-fixture-or-dry-run`)
    }
    if (item.kind === 'read-only-audit' && item.grade !== 'L1-public-or-runtime') {
      errors.push(`${item.evidenceId} read-only audit must use L1-public-or-runtime`)
    }
    if (item.kind === 'acceptance-receipt' && item.grade !== 'L4-authorized-live') {
      errors.push(`${item.evidenceId} acceptance receipt must use L4-authorized-live`)
    }
    if (
      item.kind === 'acceptance-receipt' &&
      isRecord(item.receipt) &&
      sha256Pattern.test(item.receipt.artifactSha256 || '') &&
      readableEvidencePath
    ) {
      try {
        const content = await fs.readFile(readableEvidencePath)
        const actualDigest = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
        if (actualDigest !== item.receipt.artifactSha256) {
          errors.push(`${item.evidenceId} acceptance receipt digest drifted: expected ${item.receipt.artifactSha256}, received ${actualDigest}`)
        }
        errors.push(...validateAcceptanceReceiptArtifact(item, content))
      } catch (error) {
        errors.push(`${item.evidenceId} acceptance receipt is unreadable: ${error.message}`)
      }
    }
  }

  for (const claim of registry.claims || []) {
    const expectedGrade = verificationGrades.get(claim.verification)
    if (expectedGrade && claim.evidenceGrade !== expectedGrade) {
      errors.push(`${claim.claimId} verification ${claim.verification} requires ${expectedGrade}, received ${claim.evidenceGrade}`)
    }

    const sources = []
    for (const sourceRef of claim.sourceRefs || []) {
      const source = sourceById.get(sourceRef)
      if (!source) errors.push(`${claim.claimId} references unknown source ${sourceRef}`)
      else {
        sources.push(source)
        usedSources.add(sourceRef)
      }
    }
    const evidence = []
    for (const evidenceRef of claim.evidenceRefs || []) {
      const item = evidenceById.get(evidenceRef)
      if (!item) errors.push(`${claim.claimId} references unknown evidence ${evidenceRef}`)
      else {
        evidence.push(item)
        usedEvidence.add(evidenceRef)
      }
    }

    if (claim.verification === 'source-reviewed' && sources.length === 0) {
      errors.push(`${claim.claimId} source-reviewed claim must reference at least one source`)
    }
    if (['external-fact', 'legal-context'].includes(claim.claimType) && !sources.some((source) => source.kind === 'official-web')) {
      errors.push(`${claim.claimId} ${claim.claimType} must reference an official-web source`)
    }
    if (claim.verification === 'fixture-verified') {
      if (!evidence.some((item) => item.kind === 'fixture')) errors.push(`${claim.claimId} fixture-verified claim lacks fixture evidence`)
      if (!evidence.some((item) => item.kind === 'test')) errors.push(`${claim.claimId} fixture-verified claim lacks test evidence`)
    }
    if (['pending', 'blocked'].includes(claim.verification) && (claim.sourceRefs.length > 0 || claim.evidenceRefs.length > 0)) {
      warnings.push(`${claim.claimId} is ${claim.verification} but already has provisional references; they do not raise its grade`)
    }
    for (const item of evidence) {
      if (item.grade !== claim.evidenceGrade) {
        errors.push(`${claim.claimId} ${item.evidenceId} grade ${item.grade} does not match claim grade ${claim.evidenceGrade}`)
      }
    }
    if (claim.verification === 'production-observed' && !evidence.some((item) => item.kind === 'production-observation')) {
      errors.push(`${claim.claimId} production-observed claim lacks production observation evidence`)
    }
    if (claim.verification === 'authorized-live' && !evidence.some((item) => item.kind === 'authorized-live-receipt')) {
      errors.push(`${claim.claimId} authorized-live claim lacks an authorized live receipt`)
    }
    if (claim.verification === 'authorized-live') {
      for (const roleId of Object.values(claim.ownership || {})) {
        const role = roleById.get(roleId)
        if (!role || role.assignmentState !== 'accepted') {
          errors.push(`${claim.claimId} authorized-live claim requires every ownership role to be accepted`)
          break
        }
      }
    }
  }

  for (const source of registry.sources || []) {
    if (!usedSources.has(source.sourceId)) warnings.push(`${source.sourceId} is not referenced by any claim`)
  }
  for (const item of registry.evidence || []) {
    if (!usedEvidence.has(item.evidenceId)) warnings.push(`${item.evidenceId} is not referenced by any claim`)
  }

  return { errors, warnings }
}

export function summarizeClaims(registry) {
  const byVerification = {}
  const byGrade = {}
  const byDocument = {}
  for (const claim of registry.claims || []) {
    byVerification[claim.verification] = (byVerification[claim.verification] || 0) + 1
    byGrade[claim.evidenceGrade] = (byGrade[claim.evidenceGrade] || 0) + 1
    byDocument[claim.documentId] = (byDocument[claim.documentId] || 0) + 1
  }
  return {
    claims: registry.claims?.length || 0,
    sources: registry.sources?.length || 0,
    evidence: registry.evidence?.length || 0,
    ownerRoleMappingsMissing: (registry.claims || []).filter((claim) => (
      !isRecord(claim.ownership) || [...ownershipFields.keys()].some((field) => !hasText(claim.ownership[field]))
    )).length,
    ownerRoles: registry.ownerRoles?.length || 0,
    ownerRolesAccepted: (registry.ownerRoles || []).filter((role) => role.assignmentState === 'accepted').length,
    ownerAssigneesMissing: (registry.ownerRoles || []).filter((role) => !hasText(role.assignee)).length,
    byVerification,
    byGrade,
    byDocument
  }
}
