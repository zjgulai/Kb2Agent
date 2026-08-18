import fs from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { artifactHash, FIXED_NOW, sha256, writeJson } from './utils.mjs'

export const TOOL_REGISTRY = [
  { id: 'TOOL-READ-SNAPSHOT', mode: 'read', sideEffect: false },
  { id: 'TOOL-SEARCH-FTS', mode: 'read', sideEffect: false },
  { id: 'TOOL-LOAD-CLOSURE', mode: 'read', sideEffect: false },
  { id: 'TOOL-CALCULATE-METRIC', mode: 'calculate', sideEffect: false },
  { id: 'TOOL-CHECK-FRESHNESS', mode: 'calculate', sideEffect: false },
  { id: 'TOOL-CHECK-PERMISSION', mode: 'calculate', sideEffect: false },
  { id: 'TOOL-DRAFT-ACTION', mode: 'draft', sideEffect: false },
  { id: 'TOOL-EMIT-RECEIPT', mode: 'draft', sideEffect: false }
]

const ALLOWED_TOOL_IDS = new Set(TOOL_REGISTRY.map((tool) => tool.id))

function event(eventId, stage, kind, status, inputRefs, outputRefs, offsetSeconds) {
  return { eventId, stage, kind, startedAt: `2026-08-09T00:00:${String(offsetSeconds).padStart(2, '0')}Z`, durationMs: 1, status, inputRefs, outputRefs }
}

function loadSnapshotMeta(indexFile) {
  const db = new DatabaseSync(indexFile, { readOnly: true })
  const meta = Object.fromEntries(db.prepare('SELECT key, value FROM metadata').all().map((row) => [row.key, row.value]))
  const hits = db.prepare("SELECT id, object_type FROM object_fts WHERE object_fts MATCH 'ACOS' ORDER BY bm25(object_fts) LIMIT 8").all()
  db.close()
  return { meta, hits }
}

function blockersFor(input) {
  const blockers = []
  if (input.caseId !== 'CASE-AMZ-ACOS-SYNTHETIC') blockers.push('case is not in the immutable snapshot')
  if (input.comparisonWindow !== '7d-vs-7d') blockers.push('comparison windows are missing or not comparable')
  if (input.missing?.length) blockers.push(`required inputs missing: ${input.missing.join(', ')}`)
  if (input.stale) blockers.push('evidence freshness gate failed')
  if (input.contradiction) blockers.push('evidence contradiction requires reviewer resolution')
  if (input.requestedAction) blockers.push(`external or mutating action is forbidden: ${input.requestedAction}`)
  if (input.requestedTool && !ALLOWED_TOOL_IDS.has(input.requestedTool)) blockers.push(`tool is not whitelisted: ${input.requestedTool}`)
  return blockers
}

export function runDeterministicAgent({ pkg, indexFile, input, ordinal = 1 }) {
  const suffix = String(ordinal).padStart(3, '0')
  const runId = `RUN-AMZ-M1B-${suffix}`
  const actionPackageId = `ACTION-AMZ-M1B-${suffix}`
  const traceId = `TRACE-AMZ-M1B-${suffix}`
  const receiptId = `RECEIPT-AMZ-M1B-${suffix}`
  const snapshot = pkg.snapshots[0]
  const search = loadSnapshotMeta(indexFile)
  if (search.meta.snapshotHash !== snapshot.manifestHash) throw new Error('SQLite snapshot hash parity failed')
  const blockers = blockersFor(input)
  const blocked = blockers.length > 0
  const evidenceRefs = ['EVID-AMZ-ACOS-DELTA', 'EVID-AMZ-ACOS-DEFINITION', 'EVID-AMZ-EVIDENCE-GATE']
  const actionPackage = {
    actionPackageId,
    taskPackageId: 'TASK-AMZ-ADS-DIAGNOSIS-V1',
    runId,
    summary: blocked
      ? 'The deterministic replay stopped because one or more evidence, freshness, or permission gates failed.'
      : 'The immutable synthetic snapshot confirms an ACOS increase while preserving causal uncertainty and forbidding account changes.',
    facts: [{ text: 'Synthetic ACOS rises from 28.4% to 36.9% across comparable seven-day windows.', evidenceRefs: ['EVID-AMZ-ACOS-DELTA'] }],
    inferences: blocked ? [] : [{ text: 'CPC, CVR, price, or availability may contribute, but the snapshot does not establish a cause.', evidenceRefs: ['DECISION-AMZ-ACOS-DIAGNOSIS'] }],
    unknowns: [{
      question: blocked ? blockers.join('; ') : 'Did CPC, CVR, price, or availability change?',
      impact: 'No optimization path can be selected as a verified recommendation.',
      nextEvidence: 'Provide comparable, authorized evidence and rerun the local review gate.'
    }],
    options: [{
      optionId: `OPTION-AMZ-VERIFY-${suffix}`,
      label: '核验驱动证据',
      action: 'Compare CPC and CVR in identical windows and inspect price and retail availability.',
      tradeoff: 'Defers optimization but prevents unsupported account changes.',
      externalWrite: false
    }],
    recommendation: blocked
      ? 'Resolve every blocking condition before generating a manual diagnostic draft.'
      : 'Request the missing comparable evidence and retain every optimization step as a human-reviewed manual draft.',
    calculations: [{
      metricRef: 'METRIC-AMZ-ACOS', formula: 'ad_spend / attributed_sales * 100',
      inputs: { previousSpend: 284, previousSales: 1000, latestSpend: 369, latestSales: 1000 },
      unit: '%', window: '7d vs 7d', result: blocked ? undefined : '28.4% → 36.9% (+8.5pp)', resultState: blocked ? 'blocked' : 'exact'
    }],
    risks: ['Synthetic values cannot justify an account change', ...(blocked ? blockers : ['Causal inputs are intentionally absent'])],
    stopConditions: ['Do not modify bids, budgets, targeting, or campaign state', 'Stop on stale, contradictory, missing, or permission-invalid input'],
    approvalRequirements: ['ROLE-AMAZON-ADS-DOMAIN', 'ROLE-PRODUCT-CONTENT'],
    evidenceRefs,
    status: blocked ? 'blocked-insufficient-input' : 'draft-for-review'
  }
  if (actionPackage.calculations[0].result === undefined) delete actionPackage.calculations[0].result
  const status = blocked ? 'blocked' : 'completed'
  const trace = {
    traceId, runId, mode: 'replay', status, externalCalls: 0, sideEffects: 0,
    events: [
      event(`EVENT-${suffix}-SNAPSHOT`, 'source', 'retrieve', 'completed', [snapshot.snapshotId], search.hits.map((hit) => hit.id).slice(0, 3), 0),
      event(`EVENT-${suffix}-CLOSURE`, 'agent', 'retrieve', 'completed', ['TASK-AMZ-ADS-DIAGNOSIS-V1'], ['METRIC-AMZ-ACOS', 'DECISION-AMZ-ACOS-DIAGNOSIS'], 1),
      event(`EVENT-${suffix}-GUARD`, 'agent', 'guardrail', status, evidenceRefs, blocked ? [] : [actionPackageId], 2),
      event(`EVENT-${suffix}-DRAFT`, 'agent', 'draft', status, evidenceRefs, [actionPackageId], 3),
      event(`EVENT-${suffix}-RECEIPT`, 'receipt', 'receipt', 'completed', [actionPackageId], [receiptId], 4)
    ]
  }
  const receipt = {
    receiptId, runId, mode: 'replay', evidenceGrade: 'LO-S-synthetic',
    snapshot: { id: snapshot.snapshotId, version: snapshot.version },
    taskPackage: { id: 'TASK-AMZ-ADS-DIAGNOSIS-V1', version: '1' },
    skill: { id: 'SKILL-AMZ-ADS-DIAGNOSIS-V1', version: '1' },
    model: { id: 'deterministic-rule-engine', version: 'm1-b' },
    prompt: { id: 'no-provider-structured-replay', version: '1' },
    tools: TOOL_REGISTRY.map((tool) => ({ id: tool.id, version: '1' })),
    traceRef: traceId, evaluationRefs: ['EVAL-AMZ-ADS-DIAGNOSIS-V1'],
    artifactHashes: { actionPackage: artifactHash(actionPackage), trace: artifactHash(trace), input: sha256(JSON.stringify(input)) },
    externalCalls: 0, sideEffects: 0, issuedAt: FIXED_NOW
  }
  return { input, actionPackage, trace, receipt, toolRegistry: TOOL_REGISTRY, state: status }
}

export async function exportRun(root, run) {
  const buildRoot = path.join(root, 'reference/build/m1b/runs', run.receipt.runId)
  await fs.mkdir(buildRoot, { recursive: true })
  await writeJson(path.join(buildRoot, 'action-package.json'), run.actionPackage)
  await writeJson(path.join(buildRoot, 'trace.json'), run.trace)
  await writeJson(path.join(buildRoot, 'receipt.json'), run.receipt)
  await writeJson(path.join(buildRoot, 'replay-bundle.json'), run)
  const md = `# ${run.receipt.runId}\n\n- 状态：${run.actionPackage.status}\n- 证据等级：LO-S-synthetic\n- 外部调用：0\n- 外部副作用：0\n- 快照：${run.receipt.snapshot.id} / ${run.receipt.snapshot.version}\n\n## 结论\n\n${run.actionPackage.summary}\n\n## 建议\n\n${run.actionPackage.recommendation}\n\n## 停止条件\n\n${run.actionPackage.stopConditions.map((item) => `- ${item}`).join('\n')}\n`
  await fs.writeFile(path.join(buildRoot, 'report.md'), md)
  return buildRoot
}
