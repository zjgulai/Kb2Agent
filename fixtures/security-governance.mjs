const allowedDataClasses = new Set(['synthetic', 'deidentified', 'authorized-minimized'])

export const securityFixtureBoundary = Object.freeze({
  grade: 'L2-fixture-or-dry-run',
  environment: 'local-deterministic-fixture',
  externalSideEffect: false,
  productionApproval: false
})

export const illustrativeRetentionControls = Object.freeze([
  Object.freeze({ controlId: 'LOG-STANDARD', value: 180, unit: 'days', status: 'illustrative' }),
  Object.freeze({ controlId: 'LOG-HIGH-RISK', value: 365, unit: 'days', status: 'illustrative' }),
  Object.freeze({ controlId: 'SANDBOX-TTL', value: 48, unit: 'hours', status: 'illustrative' }),
  Object.freeze({ controlId: 'ROLLBACK-SNAPSHOT', value: 30, unit: 'days', status: 'illustrative' })
])

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`)
  }
}

export function validateSecurityDrillPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('plan must be an object')
  }
  requireText(plan.sampleId, 'sampleId')
  requireText(plan.environment, 'environment')
  requireText(plan.dataClass, 'dataClass')
  requireText(plan.destructionReceiptMode, 'destructionReceiptMode')

  if (plan.environment !== 'isolated-fixture') {
    throw new Error('security drill fixture requires an isolated-fixture environment')
  }
  if (plan.dataClass === 'production') {
    throw new Error('production data is forbidden in the security drill fixture')
  }
  if (!allowedDataClasses.has(plan.dataClass)) {
    throw new Error(`unsupported dataClass: ${plan.dataClass}`)
  }
  if (plan.dataClass === 'authorized-minimized') {
    requireText(plan.authorizationRef, 'authorizationRef')
  }
  if (!Number.isInteger(plan.retentionHours) || plan.retentionHours <= 0) {
    throw new TypeError('retentionHours must be a positive integer')
  }

  return Object.freeze({
    decision: 'allowed-fixture-only',
    sampleId: plan.sampleId,
    dataClass: plan.dataClass,
    retentionHours: plan.retentionHours,
    requiresDestructionReceipt: true,
    destructionReceiptMode: plan.destructionReceiptMode,
    ...securityFixtureBoundary
  })
}

export function validateRetentionControl(control) {
  if (!control || typeof control !== 'object' || Array.isArray(control)) {
    throw new TypeError('control must be an object')
  }
  requireText(control.controlId, 'controlId')
  requireText(control.status, 'status')

  if (control.status === 'illustrative') {
    return Object.freeze({
      controlId: control.controlId,
      decision: 'example-only',
      productionApproved: false,
      ...securityFixtureBoundary
    })
  }
  if (control.status !== 'production-baseline') {
    throw new Error(`unsupported control status: ${control.status}`)
  }

  for (const field of ['jurisdiction', 'dataCategory', 'contractualBasis', 'approvalRef', 'reviewedAt']) {
    requireText(control[field], field)
  }

  return Object.freeze({
    controlId: control.controlId,
    decision: 'structurally-complete-fixture',
    productionApproved: false,
    limitation: 'Field completeness is not evidence that a real approver accepted the control.',
    ...securityFixtureBoundary
  })
}
