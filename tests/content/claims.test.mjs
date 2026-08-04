import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  loadClaimRegistry,
  summarizeClaims,
  validateClaimPages,
  validateClaimRegistryStructure,
  validateEvidenceRegistry
} from '../../scripts/claim-registry.mjs'

const root = process.cwd()

test('claim schema artifact and G2.2 registry keep the reviewed pilot boundary', async () => {
  const schema = JSON.parse(await fs.readFile(
    path.join(root, 'knowledge-system', 'schemas', 'claim.schema.json'),
    'utf8'
  ))
  const registry = await loadClaimRegistry(root)
  const structure = validateClaimRegistryStructure(registry)
  const summary = summarizeClaims(registry)

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.properties.schemaVersion.const, '2.0')
  assert.deepEqual(schema.$defs.acceptanceReceiptMetadata.required, [
    'acceptanceId',
    'purpose',
    'subjectId',
    'approverRoleId',
    'issuedAt',
    'decision',
    'artifactSha256'
  ])
  assert.deepEqual(schema.$defs.acceptanceReceiptArtifact.required, [
    'schemaVersion',
    'evidenceId',
    'acceptanceId',
    'purpose',
    'subjectId',
    'approverRoleId',
    'issuedAt',
    'decision'
  ])
  assert.equal(
    schema.$defs.evidence.allOf[0].then.properties.grade.const,
    'L4-authorized-live'
  )
  assert.deepEqual(schema.required, ['schemaVersion', 'pilotDocumentIds', 'ownerRoles', 'sources', 'evidence', 'claims'])
  assert.deepEqual(structure.errors, [])
  assert.equal(summary.claims, 12)
  assert.deepEqual(summary.byVerification, {
    'source-reviewed': 6,
    'fixture-verified': 6
  })
  assert.deepEqual(summary.byGrade, {
    'L1-public-or-runtime': 6,
    'L2-fixture-or-dry-run': 6
  })
  assert.equal(summary.ownerRoles, 12)
  assert.equal(summary.ownerRoleMappingsMissing, 0)
  assert.equal(summary.ownerAssigneesMissing, 12)
  assert.equal(summary.ownerRolesAccepted, 0)
})

test('every claim has a four-role segregated ownership chain without fabricated acceptance', async () => {
  const registry = await loadClaimRegistry(root)
  const roleById = new Map(registry.ownerRoles.map((role) => [role.roleId, role]))

  for (const claim of registry.claims) {
    const roleIds = Object.values(claim.ownership)
    assert.equal(roleIds.length, 4)
    assert.equal(new Set(roleIds).size, 4)
    assert.deepEqual(
      roleIds.map((roleId) => roleById.get(roleId).assignmentState),
      ['role-mapped', 'role-mapped', 'role-mapped', 'role-mapped']
    )
  }

  const falseAcceptance = structuredClone(registry)
  const role = falseAcceptance.ownerRoles[0]
  role.assignmentState = 'accepted'
  role.assignee = 'Example Person'
  const invalid = validateClaimRegistryStructure(falseAcceptance)
  assert.ok(invalid.errors.some((error) => error.includes('requires assignee, acceptedAt and acceptanceEvidenceRef')))
})

test('all pilot claim references resolve to nearby stable anchors and a visible ledger', async () => {
  const registry = await loadClaimRegistry(root)
  const result = await validateClaimPages(registry, root)
  assert.deepEqual(result.errors, [])
  assert.equal(result.documentCount, 26)
})

test('evidence status cannot be promoted beyond its registered grade', async () => {
  const registry = await loadClaimRegistry(root)
  const valid = await validateEvidenceRegistry(registry, root)
  assert.deepEqual(valid.errors, [])

  const promoted = structuredClone(registry)
  promoted.claims.find((claim) => claim.claimId === 'CLM-COST-001').verification = 'authorized-live'
  const invalid = await validateEvidenceRegistry(promoted, root)
  assert.ok(invalid.errors.some((error) => error.includes('requires L4-authorized-live')))
  assert.ok(invalid.errors.some((error) => error.includes('lacks an authorized live receipt')))
  assert.ok(invalid.errors.some((error) => error.includes('requires every ownership role to be accepted')))
})

test('acceptance-receipt evidence requires a safe identity-bound artifact', async () => {
  const registry = await loadClaimRegistry(root)
  const fakeReceipt = structuredClone(registry)
  fakeReceipt.evidence.push({
    evidenceId: 'EVD-UNBOUND-RECEIPT',
    title: 'Unbound receipt',
    kind: 'acceptance-receipt',
    path: 'content-audit.md',
    grade: 'L1-public-or-runtime',
    command: null,
    assertion: 'A generic kind and existing path must not be enough.'
  })
  const missingMetadata = validateClaimRegistryStructure(fakeReceipt)
  assert.ok(missingMetadata.errors.some((error) => error.includes('receipt is required')))
  assert.ok(missingMetadata.errors.some((error) => error.includes('must use L4-authorized-live')))

  fakeReceipt.evidence.at(-1).receipt = {
    acceptanceId: 'ACC-SECURITY-001',
    purpose: 'final-acceptance',
    subjectId: 'ACC-SECURITY-001',
    approverRoleId: 'ROLE-SEC-APPROVER',
    issuedAt: '2026-08-03',
    decision: 'accepted',
    artifactSha256: `sha256:${'0'.repeat(64)}`
  }
  const lowGradeReceipt = await validateEvidenceRegistry(fakeReceipt, root)
  assert.ok(lowGradeReceipt.errors.some((error) => error.includes('must use L4-authorized-live')))

  fakeReceipt.evidence.at(-1).grade = 'L4-authorized-live'
  const driftedArtifact = await validateEvidenceRegistry(fakeReceipt, root)
  assert.ok(driftedArtifact.errors.some((error) => error.includes('acceptance receipt digest drifted')))

  const packageContent = await fs.readFile(path.join(root, 'package.json'))
  fakeReceipt.evidence.at(-1).path = 'package.json'
  fakeReceipt.evidence.at(-1).receipt.artifactSha256 = `sha256:${crypto.createHash('sha256').update(packageContent).digest('hex')}`
  const unrelatedArtifact = await validateEvidenceRegistry(fakeReceipt, root)
  assert.ok(unrelatedArtifact.errors.some((error) => error.includes('acceptance receipt artifact.schemaVersion')))

  const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mkd-receipt-escape-'))
  try {
    const outsidePath = path.join(outsideDirectory, 'receipt.json')
    await fs.writeFile(outsidePath, JSON.stringify({ schemaVersion: '1.0' }))
    fakeReceipt.evidence.at(-1).path = path.relative(root, outsidePath)
    fakeReceipt.evidence.at(-1).receipt.artifactSha256 = `sha256:${'0'.repeat(64)}`
    const escapingArtifact = await validateEvidenceRegistry(fakeReceipt, root)
    assert.ok(escapingArtifact.errors.some((error) => error.includes('path escapes the repository')))
    assert.equal(escapingArtifact.errors.some((error) => error.includes('received sha256:')), false)
  } finally {
    await fs.rm(outsideDirectory, { recursive: true, force: true })
  }
})
