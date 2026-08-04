import assert from 'node:assert/strict'
import test from 'node:test'
import {
  illustrativeRetentionControls,
  securityFixtureBoundary,
  validateRetentionControl,
  validateSecurityDrillPlan
} from '../../fixtures/security-governance.mjs'

test('security drill fixture accepts only bounded non-production samples', () => {
  const result = validateSecurityDrillPlan({
    sampleId: 'FIXTURE-SYNTHETIC-001',
    environment: 'isolated-fixture',
    dataClass: 'synthetic',
    retentionHours: 4,
    destructionReceiptMode: 'fixture-receipt'
  })

  assert.equal(result.decision, 'allowed-fixture-only')
  assert.equal(result.requiresDestructionReceipt, true)
  assert.equal(result.externalSideEffect, false)
  assert.equal(result.grade, 'L2-fixture-or-dry-run')

  assert.throws(() => validateSecurityDrillPlan({
    sampleId: 'FORBIDDEN-PRODUCTION-001',
    environment: 'isolated-fixture',
    dataClass: 'production',
    retentionHours: 4,
    destructionReceiptMode: 'fixture-receipt'
  }), /production data is forbidden/)

  assert.throws(() => validateSecurityDrillPlan({
    sampleId: 'FIXTURE-MINIMIZED-001',
    environment: 'isolated-fixture',
    dataClass: 'authorized-minimized',
    retentionHours: 4,
    destructionReceiptMode: 'fixture-receipt'
  }), /authorizationRef/)
})

test('retention values stay illustrative until every production field is present', () => {
  assert.deepEqual(
    illustrativeRetentionControls.map(({ value, unit, status }) => ({ value, unit, status })),
    [
      { value: 180, unit: 'days', status: 'illustrative' },
      { value: 365, unit: 'days', status: 'illustrative' },
      { value: 48, unit: 'hours', status: 'illustrative' },
      { value: 30, unit: 'days', status: 'illustrative' }
    ]
  )
  assert.ok(illustrativeRetentionControls.every((control) => (
    validateRetentionControl(control).decision === 'example-only'
  )))
  assert.throws(() => validateRetentionControl({
    controlId: 'LOG-STANDARD',
    status: 'production-baseline',
    jurisdiction: 'FIXTURE-JURISDICTION'
  }), /dataCategory/)
  assert.equal(securityFixtureBoundary.productionApproval, false)
})
