import { DatabaseSync } from 'node:sqlite'
import { artifactHash, FIXED_NOW } from './g6-utils.mjs'

const TOOL_POLICIES = [
  ['TOOL-READ-SNAPSHOT', 'read', 'snapshot reference', 'snapshot metadata'],
  ['TOOL-SEARCH-FTS', 'read', 'bounded query', 'ranked local object refs'],
  ['TOOL-LOAD-CLOSURE', 'read', 'task package ref', 'bounded object closure'],
  ['TOOL-CHECK-FRESHNESS', 'calculate', 'evidence state', 'freshness decision'],
  ['TOOL-CHECK-PERMISSION', 'calculate', 'requested capability', 'permission decision'],
  ['TOOL-CALCULATE-METRIC', 'calculate', 'comparable metric inputs', 'deterministic ACOS delta'],
  ['TOOL-DRAFT-ACTION', 'draft', 'facts and guard decisions', 'review-only action package'],
  ['TOOL-EMIT-RECEIPT', 'draft', 'run artifacts', 'immutable execution receipt']
].map(([toolId, mode, inputContract, outputContract]) => ({
  toolId,
  version: '1',
  mode,
  sideEffect: false,
  inputContract,
  outputContract,
  onFailure: 'fail-closed'
}))

export const CAPABILITY_MANIFEST = {
  manifestId: 'CAPABILITY-MKD-E2-G6-A1',
  schemaVersion: 1,
  agentId: 'AGENT-MKD-E2-REPLAY',
  agentVersion: 'g6-a1-v1',
  mode: 'replay',
  evidenceGrade: 'LO-S-synthetic',
  snapshotRef: 'SNAPSHOT-AMZ-ADS-M1B',
  tools: TOOL_POLICIES,
  budgets: {
    maxToolCalls: 8,
    maxExternalCalls: 0,
    maxSideEffects: 0,
    maxCanonicalWrites: 0,
    maxPlatformWrites: 0
  },
  prohibitedCapabilities: [
    'live model invocation',
    'external platform write',
    'external message send',
    'canonical knowledge promotion',
    'arbitrary file or URL input'
  ],
  providerCallsAllowed: false,
  externalWritesAllowed: false,
  canonicalWritesAllowed: false
}

const ALLOWED_TOOL_IDS = new Set(TOOL_POLICIES.map((tool) => tool.toolId))
const EVIDENCE_REFS = [
  'EVID-AMZ-ACOS-DELTA',
  'EVID-AMZ-ACOS-DEFINITION',
  'EVID-AMZ-EVIDENCE-GATE'
]
const APPROVAL_ROLES = ['ROLE-AMAZON-ADS-DOMAIN', 'ROLE-PRODUCT-CONTENT']
const ALLOWED_INPUT_KEYS = new Set([
  'caseId',
  'comparisonWindow',
  'focus',
  'output',
  'locale',
  'missingEvidence',
  'conflicts',
  'stale',
  'requestedAction',
  'requestedTool'
])

function validateTaskInput(input) {
  const errors = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['input must be an object']
  if (typeof input.caseId !== 'string' || !input.caseId) errors.push('caseId is required')
  if (typeof input.comparisonWindow !== 'string' || !input.comparisonWindow) errors.push('comparisonWindow is required')
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) errors.push(`unexpected input key: ${key}`)
  }
  for (const key of ['missingEvidence', 'conflicts']) {
    if (input[key] !== undefined && (!Array.isArray(input[key]) || input[key].some((value) => typeof value !== 'string'))) {
      errors.push(`${key} must be an array of strings`)
    }
  }
  if (input.stale !== undefined && typeof input.stale !== 'boolean') errors.push('stale must be boolean')
  return errors
}

function classifyFixture(fixture) {
  const inputErrors = validateTaskInput(fixture.input)
  if (inputErrors.length) {
    return { terminalState: 'failed', reasonCode: 'INPUT_SCHEMA_INVALID', reasons: inputErrors }
  }
  if (fixture.input.requestedTool) {
    return {
      terminalState: 'refused',
      reasonCode: 'TOOL_NOT_WHITELISTED',
      reasons: [`Requested tool is outside the G6 whitelist: ${fixture.input.requestedTool}`]
    }
  }
  if (fixture.input.requestedAction) {
    const send = fixture.input.requestedAction.includes('send')
    return {
      terminalState: 'refused',
      reasonCode: send ? 'EXTERNAL_SEND_FORBIDDEN' : 'EXTERNAL_WRITE_FORBIDDEN',
      reasons: [`Requested external effect is forbidden: ${fixture.input.requestedAction}`]
    }
  }
  if (fixture.input.conflicts?.length) {
    return {
      terminalState: 'needs-review',
      reasonCode: 'EVIDENCE_CONFLICT',
      reasons: fixture.input.conflicts.map((value) => `Conflicting evidence requires review: ${value}`)
    }
  }
  if (fixture.input.missingEvidence?.length) {
    return {
      terminalState: 'needs-review',
      reasonCode: 'EVIDENCE_MISSING',
      reasons: fixture.input.missingEvidence.map((value) => `Required evidence is missing: ${value}`)
    }
  }
  if (fixture.input.comparisonWindow !== '7d-vs-7d') {
    return {
      terminalState: 'needs-review',
      reasonCode: 'WINDOW_NOT_COMPARABLE',
      reasons: ['Comparison windows are not equivalent and cannot support an exact delta.']
    }
  }
  if (fixture.input.stale) {
    return {
      terminalState: 'needs-review',
      reasonCode: 'EVIDENCE_STALE',
      reasons: ['Evidence freshness gate failed.']
    }
  }
  if (fixture.input.caseId !== 'CASE-AMZ-ACOS-SYNTHETIC') {
    return {
      terminalState: 'needs-review',
      reasonCode: 'CASE_NOT_IN_SNAPSHOT',
      reasons: ['Case is not present in the immutable snapshot.']
    }
  }
  return {
    terminalState: 'needs-approval',
    reasonCode: 'READY_FOR_HUMAN_APPROVAL',
    reasons: ['The deterministic draft is complete and still requires named human approval.']
  }
}

function createExecutionPlan({ runId, suffix, fixture, inputValid }) {
  const definitions = [
    ['TOOL-READ-SNAPSHOT', 'Verify immutable snapshot identity.', ['SNAPSHOT-AMZ-ADS-M1B'], 'schema-valid'],
    ['TOOL-SEARCH-FTS', 'Retrieve a bounded set of ACOS references.', ['query:ACOS'], 'schema-valid'],
    ['TOOL-LOAD-CLOSURE', 'Load the task object closure within fixed limits.', ['TASK-AMZ-ADS-DIAGNOSIS-V1'], 'schema-valid'],
    ['TOOL-CHECK-FRESHNESS', 'Evaluate freshness and evidence conflicts.', EVIDENCE_REFS, 'schema-valid'],
    ['TOOL-CHECK-PERMISSION', 'Reject non-whitelisted tools and external effects.', [fixture.fixtureId], 'schema-valid'],
    ['TOOL-CALCULATE-METRIC', 'Calculate ACOS only when evidence is comparable.', ['METRIC-AMZ-ACOS'], 'evidence-ready'],
    ['TOOL-DRAFT-ACTION', 'Create a review-only decision action package.', EVIDENCE_REFS, 'permission-allowed'],
    ['TOOL-EMIT-RECEIPT', 'Bind every artifact into an immutable receipt.', [runId], 'always']
  ]
  const steps = inputValid
    ? definitions.map(([toolId, purpose, inputRefs, guard], index) => ({
      stepId: `STEP-G6-${suffix}-${String(index + 1).padStart(2, '0')}`,
      order: index + 1,
      toolId: index === 5 && fixture.fault?.injectPlanTool ? fixture.fault.injectPlanTool : toolId,
      purpose,
      inputRefs,
      guard
    }))
    : []
  return {
    planId: `PLAN-G6-${suffix}`,
    schemaVersion: 1,
    runId,
    taskPackageId: 'TASK-AMZ-ADS-DIAGNOSIS-V1',
    agentId: 'AGENT-MKD-E2-REPLAY',
    mode: 'replay',
    steps,
    createdAt: FIXED_NOW
  }
}

function loadSnapshot(indexFile, snapshot) {
  const db = new DatabaseSync(indexFile, { readOnly: true })
  try {
    const meta = Object.fromEntries(db.prepare('SELECT key, value FROM metadata').all().map((row) => [row.key, row.value]))
    if (meta.snapshotHash !== snapshot.manifestHash) throw new Error('SQLite snapshot hash parity failed')
    return { snapshotId: snapshot.snapshotId, version: snapshot.version, manifestHash: snapshot.manifestHash }
  } finally {
    db.close()
  }
}

function searchSnapshot(indexFile) {
  const db = new DatabaseSync(indexFile, { readOnly: true })
  try {
    return db.prepare("SELECT id, object_type FROM object_fts WHERE object_fts MATCH 'ACOS' ORDER BY bm25(object_fts) LIMIT 8").all()
  } finally {
    db.close()
  }
}

function loadTaskClosure(pkg) {
  const task = pkg.tasks.find((item) => item.id === 'TASK-AMZ-ADS-DIAGNOSIS-V1')
  if (!task) throw new Error('Task package is missing from snapshot')
  const collections = ['sources', 'evidence', 'knowledgeObjects', 'skills', 'tasks', 'governance', 'evaluations']
  const objectIndex = new Map(collections.flatMap((name) => (pkg[name] || []).map((item) => [item.id, item])))
  const objects = task.requiredClosure.objectIds.map((id) => objectIndex.get(id)).filter(Boolean)
  if (objects.length !== task.requiredClosure.objectIds.length) throw new Error('Task closure contains missing objects')
  return { taskId: task.id, maxDepth: task.requiredClosure.maxDepth, maxObjects: task.requiredClosure.maxObjects, objectIds: objects.map((item) => item.id) }
}

function createActionPackage({ runId, suffix, classification }) {
  const reviewOnly = classification.terminalState === 'needs-review'
  const calculation = {
    metricRef: 'METRIC-AMZ-ACOS',
    formula: 'ad_spend / attributed_sales * 100',
    inputs: reviewOnly
      ? { availableEvidence: false }
      : { previousSpend: 284, previousSales: 1000, latestSpend: 369, latestSales: 1000 },
    unit: '%',
    window: '7d vs 7d',
    resultState: reviewOnly ? 'blocked' : 'exact'
  }
  if (!reviewOnly) calculation.result = '28.4% → 36.9% (+8.5pp)'
  return {
    actionPackageId: `ACTION-G6-${suffix}`,
    schemaVersion: 2,
    taskPackageId: 'TASK-AMZ-ADS-DIAGNOSIS-V1',
    runId,
    terminalState: classification.terminalState,
    summary: reviewOnly
      ? 'The replay stopped the exact ACOS calculation because required comparable evidence did not pass the evidence gate.'
      : 'The immutable synthetic snapshot supports an ACOS increase while causal drivers remain explicitly unverified and every optimization stays a manual draft.',
    facts: reviewOnly
      ? [{
          text: 'Exact ACOS change is unavailable because required comparable evidence did not pass the evidence gate.',
          evidenceRefs: ['EVID-AMZ-EVIDENCE-GATE']
        }]
      : [{
          text: 'Synthetic ACOS changes from 28.4% to 36.9% across the fixture windows.',
          evidenceRefs: ['EVID-AMZ-ACOS-DELTA']
        }],
    inferences: reviewOnly ? [] : [{
      text: 'CPC, CVR, price, or availability may contribute, but no single cause is established.',
      evidenceRefs: ['DECISION-AMZ-ACOS-DIAGNOSIS']
    }],
    unknowns: [{
      question: reviewOnly ? classification.reasons.join(' ') : 'Did CPC, CVR, price, or availability change in the same window?',
      impact: 'No account optimization can be selected as a verified action.',
      nextEvidence: 'Provide comparable, authorized evidence and rerun the local review gate.'
    }],
    options: [{
      optionId: `OPTION-G6-VERIFY-${suffix}`,
      label: '核验证据',
      action: 'Compare CPC and CVR in identical windows and inspect price and retail availability.',
      tradeoff: 'Defers optimization while preventing an unsupported account change.',
      externalWrite: false
    }],
    recommendation: reviewOnly
      ? 'Resolve the evidence gate before preparing a manual optimization draft.'
      : 'Request missing causal evidence and keep every optimization as a human-reviewed manual draft.',
    calculations: [calculation],
    risks: ['Synthetic fixture evidence cannot justify a real advertising account change.'],
    stopConditions: ['Do not modify bids, budgets, targeting, campaign state, or external messages.'],
    approvalRequirements: APPROVAL_ROLES,
    evidenceRefs: reviewOnly
      ? ['EVID-AMZ-ACOS-DEFINITION', 'EVID-AMZ-EVIDENCE-GATE']
      : EVIDENCE_REFS
  }
}

function createApprovalDecision({ runId, suffix, classification }) {
  return {
    decisionId: `APPROVAL-G6-${suffix}`,
    schemaVersion: 1,
    runId,
    state: classification.terminalState === 'needs-approval' ? 'pending' : 'not-ready',
    requiredRoles: APPROVAL_ROLES,
    acceptedRoles: [],
    reason: classification.terminalState === 'needs-approval'
      ? 'The local draft is reproducible but has no named domain or product approval.'
      : 'Evidence review must close before a draft can enter human approval.',
    signedAt: null
  }
}

function createRefusalReceipt({ runId, suffix, fixture, classification }) {
  return {
    refusalId: `REFUSAL-G6-${suffix}`,
    schemaVersion: 1,
    runId,
    ruleId: 'RULE-G6-ZERO-EXTERNAL-EFFECTS',
    reasonCode: classification.reasonCode,
    reason: classification.reasons.join(' '),
    requestHash: artifactHash(fixture.input),
    safeAlternative: 'Run the immutable read-only replay and export a human-reviewed manual draft instead.',
    externalCalls: 0,
    sideEffects: 0,
    issuedAt: FIXED_NOW
  }
}

function makeToolReceipt({ runId, step, status, input, output, errorCode }) {
  const receipt = {
    callId: `CALL-${step.stepId}`,
    schemaVersion: 1,
    runId,
    planStepId: step.stepId,
    toolId: step.toolId,
    status,
    inputHash: artifactHash(input),
    outputHash: artifactHash(output),
    startedAt: FIXED_NOW,
    durationMs: 1,
    externalCalls: 0,
    sideEffects: 0
  }
  if (errorCode) receipt.errorCode = errorCode
  return receipt
}

function executePlan({ pkg, indexFile, fixture, executionPlan, classification, runId, suffix }) {
  const outputs = new Map()
  const toolCallReceipts = []
  let actionPackage = null
  let approvalDecision = null
  let refusalReceipt = null

  for (const step of executionPlan.steps) {
    let status = 'completed'
    let output
    let errorCode
    const input = { fixtureId: fixture.fixtureId, input: fixture.input, prior: [...outputs.keys()] }
    try {
      if (step.toolId === 'TOOL-READ-SNAPSHOT') output = loadSnapshot(indexFile, pkg.snapshots[0])
      else if (step.toolId === 'TOOL-SEARCH-FTS') output = { hits: searchSnapshot(indexFile) }
      else if (step.toolId === 'TOOL-LOAD-CLOSURE') output = loadTaskClosure(pkg)
      else if (step.toolId === 'TOOL-CHECK-FRESHNESS') {
        const blocked = ['EVIDENCE_MISSING', 'EVIDENCE_CONFLICT', 'WINDOW_NOT_COMPARABLE', 'EVIDENCE_STALE'].includes(classification.reasonCode)
        output = { ready: !blocked, reasonCode: blocked ? classification.reasonCode : 'EVIDENCE_READY' }
        status = blocked ? 'blocked' : 'completed'
        if (blocked) errorCode = classification.reasonCode
      } else if (step.toolId === 'TOOL-CHECK-PERMISSION') {
        const allowed = classification.terminalState !== 'refused'
        output = { allowed, reasonCode: allowed ? 'PERMISSION_ALLOWED' : classification.reasonCode }
        status = allowed ? 'completed' : 'blocked'
        if (!allowed) errorCode = classification.reasonCode
      } else if (step.toolId === 'TOOL-CALCULATE-METRIC') {
        if (classification.terminalState !== 'needs-approval') {
          status = 'skipped'
          output = { skipped: true, reasonCode: classification.reasonCode }
          errorCode = classification.reasonCode
        } else {
          output = { previous: 28.4, latest: 36.9, deltaPercentagePoints: 8.5, unit: '%' }
        }
      } else if (step.toolId === 'TOOL-DRAFT-ACTION') {
        if (classification.terminalState === 'refused') {
          status = 'skipped'
          output = { skipped: true, reasonCode: classification.reasonCode }
          errorCode = classification.reasonCode
          refusalReceipt = createRefusalReceipt({ runId, suffix, fixture, classification })
        } else {
          actionPackage = createActionPackage({ runId, suffix, classification })
          approvalDecision = createApprovalDecision({ runId, suffix, classification })
          output = { actionPackageId: actionPackage.actionPackageId, terminalState: actionPackage.terminalState }
        }
      } else if (step.toolId === 'TOOL-EMIT-RECEIPT') {
        if (classification.terminalState === 'refused' && !refusalReceipt) {
          refusalReceipt = createRefusalReceipt({ runId, suffix, fixture, classification })
        }
        output = {
          terminalState: classification.terminalState,
          actionPackageId: actionPackage?.actionPackageId || null,
          refusalId: refusalReceipt?.refusalId || null
        }
      } else {
        throw Object.assign(new Error(`Plan references a non-whitelisted tool: ${step.toolId}`), { code: 'PLAN_TOOL_NOT_ALLOWED' })
      }
    } catch (error) {
      status = 'failed'
      errorCode = error.code || 'TOOL_EXECUTION_FAILED'
      output = { failed: true, errorCode, message: error.message }
    }
    outputs.set(step.toolId, output)
    toolCallReceipts.push(makeToolReceipt({ runId, step, status, input, output, errorCode }))
    if (status === 'failed') break
  }
  return { toolCallReceipts, actionPackage, approvalDecision, refusalReceipt }
}

function failedReceipt({ fixture, executionPlan, runId, suffix, reasonCode, reasons, snapshot, toolCallReceipts = [] }) {
  return {
    receiptId: `EXEC-RECEIPT-G6-${suffix}`,
    schemaVersion: 1,
    runId,
    fixtureId: fixture.fixtureId,
    mode: 'replay',
    evidenceGrade: 'LO-S-synthetic',
    terminalState: 'failed',
    reasonCode,
    snapshot: { id: snapshot.snapshotId, version: snapshot.version, manifestHash: snapshot.manifestHash },
    taskPackage: { id: 'TASK-AMZ-ADS-DIAGNOSIS-V1', version: '1' },
    agent: { id: 'AGENT-MKD-E2-REPLAY', version: 'g6-a1-v1' },
    planRef: executionPlan.planId,
    toolCallRefs: toolCallReceipts.map((item) => item.callId),
    artifactHashes: {
      fixture: artifactHash(fixture),
      input: artifactHash(fixture.input),
      plan: artifactHash(executionPlan),
      toolCalls: artifactHash(toolCallReceipts)
    },
    error: { code: reasonCode, message: reasons.join(' ') },
    providerCalls: 0,
    externalCalls: 0,
    sideEffects: 0,
    canonicalWrites: 0,
    platformWrites: 0,
    issuedAt: FIXED_NOW
  }
}

export function runG6Agent({ pkg, indexFile, fixture, ordinal = 1 }) {
  const suffix = String(ordinal).padStart(3, '0')
  const runId = `RUN-G6-${suffix}`
  const inputErrors = validateTaskInput(fixture.input)
  let classification = classifyFixture(fixture)
  const executionPlan = createExecutionPlan({ runId, suffix, fixture, inputValid: inputErrors.length === 0 })
  const snapshot = pkg.snapshots[0]

  if (inputErrors.length) {
    const executionReceipt = failedReceipt({
      fixture,
      executionPlan,
      runId,
      suffix,
      reasonCode: 'INPUT_SCHEMA_INVALID',
      reasons: inputErrors,
      snapshot
    })
    return {
      fixture,
      capabilityManifest: CAPABILITY_MANIFEST,
      executionPlan,
      toolCallReceipts: [],
      actionPackage: null,
      approvalDecision: null,
      refusalReceipt: null,
      executionReceipt
    }
  }

  const invalidStep = executionPlan.steps.find((step) => !ALLOWED_TOOL_IDS.has(step.toolId))
  if (invalidStep) {
    classification = {
      terminalState: 'failed',
      reasonCode: 'PLAN_TOOL_NOT_ALLOWED',
      reasons: [`Execution plan references a non-whitelisted tool: ${invalidStep.toolId}`]
    }
    const executionReceipt = failedReceipt({
      fixture,
      executionPlan,
      runId,
      suffix,
      reasonCode: classification.reasonCode,
      reasons: classification.reasons,
      snapshot
    })
    return {
      fixture,
      capabilityManifest: CAPABILITY_MANIFEST,
      executionPlan,
      toolCallReceipts: [],
      actionPackage: null,
      approvalDecision: null,
      refusalReceipt: null,
      executionReceipt
    }
  }

  const executed = executePlan({ pkg, indexFile, fixture, executionPlan, classification, runId, suffix })
  const failedCall = executed.toolCallReceipts.find((item) => item.status === 'failed')
  if (failedCall) {
    const executionReceipt = failedReceipt({
      fixture,
      executionPlan,
      runId,
      suffix,
      reasonCode: failedCall.errorCode,
      reasons: [`Tool execution failed at ${failedCall.toolId}.`],
      snapshot,
      toolCallReceipts: executed.toolCallReceipts
    })
    return {
      fixture,
      capabilityManifest: CAPABILITY_MANIFEST,
      executionPlan,
      ...executed,
      executionReceipt
    }
  }

  const artifactHashes = {
    fixture: artifactHash(fixture),
    input: artifactHash(fixture.input),
    plan: artifactHash(executionPlan),
    toolCalls: artifactHash(executed.toolCallReceipts)
  }
  if (executed.actionPackage) artifactHashes.actionPackage = artifactHash(executed.actionPackage)
  if (executed.approvalDecision) artifactHashes.approvalDecision = artifactHash(executed.approvalDecision)
  if (executed.refusalReceipt) artifactHashes.refusalReceipt = artifactHash(executed.refusalReceipt)

  const executionReceipt = {
    receiptId: `EXEC-RECEIPT-G6-${suffix}`,
    schemaVersion: 1,
    runId,
    fixtureId: fixture.fixtureId,
    mode: 'replay',
    evidenceGrade: 'LO-S-synthetic',
    terminalState: classification.terminalState,
    reasonCode: classification.reasonCode,
    snapshot: { id: snapshot.snapshotId, version: snapshot.version, manifestHash: snapshot.manifestHash },
    taskPackage: { id: 'TASK-AMZ-ADS-DIAGNOSIS-V1', version: '1' },
    agent: { id: 'AGENT-MKD-E2-REPLAY', version: 'g6-a1-v1' },
    planRef: executionPlan.planId,
    toolCallRefs: executed.toolCallReceipts.map((item) => item.callId),
    artifactHashes,
    providerCalls: 0,
    externalCalls: 0,
    sideEffects: 0,
    canonicalWrites: 0,
    platformWrites: 0,
    issuedAt: FIXED_NOW
  }
  if (executed.approvalDecision) executionReceipt.approvalRef = executed.approvalDecision.decisionId
  if (executed.refusalReceipt) executionReceipt.refusalRef = executed.refusalReceipt.refusalId

  return {
    fixture,
    capabilityManifest: CAPABILITY_MANIFEST,
    executionPlan,
    ...executed,
    executionReceipt
  }
}
