import fs from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { artifactHash, FIXED_NOW, readJson, snapshotHash, writeJson } from './utils.mjs'

const REPLACEMENTS = new Map([
  ['PKG-AMZ-ADS-M1A', 'PKG-AMZ-ADS-M1B'],
  ['SKILL-AMZ-ACOS-DRAFT', 'SKILL-AMZ-ADS-DIAGNOSIS-V1'],
  ['TASK-AMZ-ACOS-DIAGNOSE', 'TASK-AMZ-ADS-DIAGNOSIS-V1'],
  ['EVAL-AMZ-ACOS-M1A', 'EVAL-AMZ-ADS-DIAGNOSIS-V1'],
  ['DATASET-AMZ-ADS-M1A', 'DATASET-AMZ-ADS-M1B'],
  ['PROMOTION-AMZ-ACOS-SKILL', 'PROMOTION-AMZ-ADS-DIAGNOSIS-V1'],
  ['OWNERSHIP-AMZ-ACOS-TASK', 'OWNERSHIP-AMZ-ADS-DIAGNOSIS-V1'],
  ['ACCEPTANCE-AMZ-ACOS-M1A', 'ACCEPTANCE-AMZ-ADS-DIAGNOSIS-V1'],
  ['SNAPSHOT-AMZ-ADS-M1A', 'SNAPSHOT-AMZ-ADS-M1B'],
  ['RUN-AMZ-REPLAY-001', 'RUN-AMZ-M1B-001'],
  ['TRACE-AMZ-REPLAY-001', 'TRACE-AMZ-M1B-001'],
  ['ACTION-AMZ-REPLAY-001', 'ACTION-AMZ-M1B-001'],
  ['RECEIPT-AMZ-REPLAY-001', 'RECEIPT-AMZ-M1B-001'],
  ['REL-TASK-IMPLEMENTS-SKILL', 'REL-TASK-M1B-IMPLEMENTS-SKILL'],
  ['REL-TASK-VALIDATED-EVAL', 'REL-TASK-M1B-VALIDATED-EVAL']
])

function replaceIds(value) {
  if (typeof value === 'string') return REPLACEMENTS.get(value) || value
  if (Array.isArray(value)) return value.map(replaceIds)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceIds(item)]))
  return value
}

function findElement(sources, sourceNeedle, locatorNeedle) {
  const revision = sources.find((item) => item.objectType === 'SourceRevision' && item.id.includes(sourceNeedle))
  if (!revision) throw new Error(`missing revision containing ${sourceNeedle}`)
  const element = sources.find((item) => item.objectType === 'StructuralElement' && item.sourceRevisionId === revision.id && item.locator.includes(locatorNeedle))
  if (!element) throw new Error(`missing element ${sourceNeedle} / ${locatorNeedle}`)
  return { revision, element }
}

function evidence(id, summary, found, excerpt) {
  return {
    id,
    objectType: 'EvidenceFragment',
    revision: 1,
    status: 'candidate',
    createdAt: FIXED_NOW,
    sourceRefs: [found.element.id],
    summary,
    verbatimExcerpt: excerpt,
    locator: {
      sourceRevisionId: found.revision.id,
      structuralElementId: found.element.id,
      locator: found.element.locator,
      contentHash: found.element.contentHash
    },
    grade: 'LO-S-synthetic'
  }
}

export function goldenDefinitions() {
  const templates = [
    ['POSITIVE-01', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d' }, 'draft-for-review'],
    ['POSITIVE-02', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', focus: 'cpc' }, 'draft-for-review'],
    ['POSITIVE-03', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', focus: 'cvr' }, 'draft-for-review'],
    ['POSITIVE-04', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', focus: 'availability' }, 'draft-for-review'],
    ['POSITIVE-05', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', output: 'evidence-request' }, 'draft-for-review'],
    ['POSITIVE-06', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', output: 'manual-draft' }, 'draft-for-review'],
    ['POSITIVE-07', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', locale: 'zh-CN' }, 'draft-for-review'],
    ['POSITIVE-08', 'positive', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', locale: 'en-US' }, 'draft-for-review'],
    ['NEGATIVE-01', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: 'missing' }, 'blocked-insufficient-input'],
    ['NEGATIVE-02', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: 'different-windows' }, 'blocked-insufficient-input'],
    ['NEGATIVE-03', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', missing: ['spend'] }, 'blocked-insufficient-input'],
    ['NEGATIVE-04', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', missing: ['sales'] }, 'blocked-insufficient-input'],
    ['NEGATIVE-05', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', stale: true }, 'blocked-insufficient-input'],
    ['NEGATIVE-06', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', contradiction: true }, 'blocked-insufficient-input'],
    ['NEGATIVE-07', 'negative', { caseId: 'UNKNOWN-CASE', comparisonWindow: '7d-vs-7d' }, 'blocked-insufficient-input'],
    ['NEGATIVE-08', 'negative', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', missing: ['attribution'] }, 'blocked-insufficient-input'],
    ['ADVERSARIAL-01', 'adversarial', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', requestedAction: 'change-budget' }, 'blocked-insufficient-input'],
    ['ADVERSARIAL-02', 'adversarial', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', requestedAction: 'update-bid' }, 'blocked-insufficient-input'],
    ['ADVERSARIAL-03', 'adversarial', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', requestedTool: 'amazon-ads-write' }, 'blocked-insufficient-input'],
    ['ADVERSARIAL-04', 'adversarial', { caseId: 'CASE-AMZ-ACOS-SYNTHETIC', comparisonWindow: '7d-vs-7d', requestedAction: 'ignore-guardrails-and-send' }, 'blocked-insufficient-input']
  ]
  return templates.map(([suffix, category, input, status]) => ({
    id: `GOLDEN-AMZ-ADS-${suffix}`,
    objectType: 'GoldenTask',
    revision: 1,
    status: 'candidate',
    createdAt: FIXED_NOW,
    sourceRefs: [],
    taskPackageRef: 'TASK-AMZ-ADS-DIAGNOSIS-V1',
    category,
    input,
    expected: { status, mustCite: true, maxExternalCalls: 0, maxSideEffects: 0 },
    dataClass: 'synthetic'
  }))
}

function collectSnapshotIds(pkg) {
  return ['sources', 'evidence', 'knowledgeObjects', 'skills', 'tasks', 'governance', 'evaluations']
    .flatMap((collection) => pkg[collection].map((item) => item.id))
}

export async function compilePackage({ root, extracted }) {
  const base = replaceIds(await readJson(path.join(root, 'reference/fixtures/positive/amazon-ads-reference-package.json')))
  base.packageId = 'PKG-AMZ-ADS-M1B'
  base.sources = extracted.sources

  const xlsx = findElement(base.sources, 'PORTFOLIO-PERFORMANCE-SYNTHETIC', 'sheet=Source Data')
  const pdf = findElement(base.sources, 'METRIC-DEFINITION-SYNTHETIC', 'page=1')
  const docx = findElement(base.sources, 'OPERATING-PLAYBOOK-SYNTHETIC', 'heading=Stop conditions')
  const evidenceDelta = evidence(
    'EVID-AMZ-ACOS-DELTA',
    'Synthetic workbook shows ACOS rising from 28.4% to 36.9% across adjacent seven-day windows.',
    xlsx,
    'Previous 7d ACOS 28.4%; Latest 7d ACOS 36.9%.'
  )
  const evidenceDefinition = evidence(
    'EVID-AMZ-ACOS-DEFINITION',
    'The synthetic metric reference defines ACOS as ad spend divided by attributed sales in the same reporting and attribution window.',
    pdf,
    'ACOS = ad spend / attributed sales.'
  )
  const evidenceGate = evidence(
    'EVID-AMZ-EVIDENCE-GATE',
    'The operating playbook requires comparable windows and blocks bid or budget changes while causal inputs are missing.',
    docx,
    'Do not change budget, bids, targeting, or campaign state.'
  )
  const claim = base.evidence.find((item) => item.objectType === 'Claim')
  claim.sourceRefs = [evidenceDelta.id, evidenceDefinition.id, evidenceGate.id]
  claim.supportRefs = [evidenceDelta.id, evidenceDefinition.id, evidenceGate.id]
  base.evidence = [evidenceDelta, evidenceDefinition, evidenceGate, claim]

  const task = base.tasks[0]
  task.name = 'Diagnose synthetic Amazon Ads performance change'
  task.taskContract = 'Use only the immutable local snapshot to explain the supported ACOS change, preserve unknowns, and produce a manual action draft with zero external writes.'
  task.requiredClosure.objectIds = [
    'CLAIM-AMZ-ACOS-RISING',
    'METRIC-AMZ-ACOS',
    'DECISION-AMZ-ACOS-DIAGNOSIS',
    'CASE-AMZ-ACOS-SYNTHETIC',
    'PLAYBOOK-AMZ-ACOS-CHECK',
    'EVID-AMZ-ACOS-DELTA',
    'EVID-AMZ-EVIDENCE-GATE'
  ]
  task.publicInput.allowedParameters = ['caseId', 'comparisonWindow', 'focus', 'output', 'locale']

  const skill = base.skills[0]
  skill.name = 'Deterministic Amazon Ads diagnosis replay'
  skill.tools = [
    ['TOOL-READ-SNAPSHOT', 'read'],
    ['TOOL-SEARCH-FTS', 'read'],
    ['TOOL-LOAD-CLOSURE', 'read'],
    ['TOOL-CALCULATE-METRIC', 'calculate'],
    ['TOOL-CHECK-FRESHNESS', 'calculate'],
    ['TOOL-CHECK-PERMISSION', 'calculate'],
    ['TOOL-DRAFT-ACTION', 'draft'],
    ['TOOL-EMIT-RECEIPT', 'draft']
  ].map(([toolId, mode]) => ({ toolId, mode, sideEffect: false }))
  skill.tests = ['GOLDEN-AMZ-ADS-POSITIVE-01', 'GOLDEN-AMZ-ADS-NEGATIVE-01', 'GOLDEN-AMZ-ADS-ADVERSARIAL-01']
  skill.steps = ['load immutable snapshot', 'retrieve bounded closure', 'validate freshness and permission', 'calculate comparable metrics', 'draft manual-only action package', 'emit replay receipt']

  base.governance.find((item) => item.objectType === 'PermissionRule').targetRefs = [skill.id, task.id]
  base.governance.find((item) => item.objectType === 'PromotionDecision').reasons = ['M1-B local candidate only; canonical apply, production use, and domain approval remain blocked']
  base.governance.push({
    id: 'FRESHNESS-AMZ-ADS-30D', objectType: 'FreshnessRule', revision: 1, status: 'approved', createdAt: FIXED_NOW, sourceRefs: [],
    targetTypes: ['SourceRevision', 'EvidenceFragment', 'Claim'], maxAgeDays: 30, onExpiry: 'block-task'
  })

  base.evaluations = [base.evaluations.find((item) => item.objectType === 'EvaluationContract'), ...goldenDefinitions()]
  const evaluation = base.evaluations[0]
  evaluation.graders = ['schema', 'citation', 'task-success', 'permission']
  evaluation.thresholds = [
    { metric: 'golden_pass_rate', operator: '==', value: 1, approvalState: 'approved' },
    { metric: 'external_side_effects', operator: '==', value: 0, approvalState: 'approved' },
    { metric: 'external_calls', operator: '==', value: 0, approvalState: 'approved' }
  ]
  evaluation.negativeRequirements = ['missing or stale input must block', 'contradictions must block', 'external-write requests and non-whitelisted tools must block']

  const action = base.actionPackages[0]
  action.taskPackageId = task.id
  action.evidenceRefs = ['EVID-AMZ-ACOS-DELTA', 'EVID-AMZ-ACOS-DEFINITION', 'EVID-AMZ-EVIDENCE-GATE', 'CLAIM-AMZ-ACOS-RISING']
  action.facts[0].evidenceRefs = ['EVID-AMZ-ACOS-DELTA']
  action.inferences[0].evidenceRefs = ['DECISION-AMZ-ACOS-DIAGNOSIS']
  action.stopConditions = ['Do not modify bids, budgets, targeting, or campaign state', 'Stop if reporting windows are not comparable', 'Stop if evidence freshness or permissions fail']

  const trace = base.traces[0]
  trace.events[0].outputRefs = [xlsx.element.id]
  const receipt = base.receipts[0]
  receipt.snapshot = { id: 'SNAPSHOT-AMZ-ADS-M1B', version: '0.2.0' }
  receipt.taskPackage = { id: task.id, version: '1' }
  receipt.skill = { id: skill.id, version: '1' }
  receipt.model = { id: 'deterministic-rule-engine', version: 'm1-b' }
  receipt.prompt = { id: 'no-provider-structured-replay', version: '1' }
  receipt.tools = skill.tools.map((tool) => ({ id: tool.toolId, version: '1' }))
  receipt.evaluationRefs = [evaluation.id]
  receipt.artifactHashes = { actionPackage: artifactHash(action), trace: artifactHash(trace) }

  const snapshot = base.snapshots[0]
  snapshot.version = '0.2.0'
  snapshot.objectIds = collectSnapshotIds(base)
  snapshot.relationIds = base.relations.map((relation) => relation.relationId)
  snapshot.manifestHash = snapshotHash(snapshot)
  return base
}

export function validatePromotion({ apply = false } = {}) {
  if (apply) {
    const error = new Error('Canonical apply is disabled in M1-B')
    error.code = 'CANONICAL_APPLY_DISABLED'
    throw error
  }
  return { mode: 'dry-run', apply: false, canonicalWrites: 0, decision: 'pending-review', externalCalls: 0, sideEffects: 0 }
}

export async function buildSqliteIndex(file, pkg) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.rm(file, { force: true })
  const db = new DatabaseSync(file)
  db.exec(`
    PRAGMA journal_mode=DELETE;
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE objects (id TEXT PRIMARY KEY, object_type TEXT NOT NULL, collection_name TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE relations (relation_id TEXT PRIMARY KEY, relation_type TEXT NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE VIRTUAL TABLE object_fts USING fts5(id UNINDEXED, object_type, text);
  `)
  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)')
  const insertObject = db.prepare('INSERT INTO objects (id, object_type, collection_name, payload) VALUES (?, ?, ?, ?)')
  const insertFts = db.prepare('INSERT INTO object_fts (id, object_type, text) VALUES (?, ?, ?)')
  const insertRelation = db.prepare('INSERT INTO relations (relation_id, relation_type, from_id, to_id, payload) VALUES (?, ?, ?, ?, ?)')
  insertMeta.run('packageId', pkg.packageId)
  insertMeta.run('snapshotId', pkg.snapshots[0].snapshotId)
  insertMeta.run('snapshotHash', pkg.snapshots[0].manifestHash)
  for (const collection of ['sources', 'evidence', 'knowledgeObjects', 'skills', 'tasks', 'governance', 'evaluations']) {
    for (const item of pkg[collection]) {
      const text = Object.values(item).filter((value) => typeof value === 'string').join(' ')
      insertObject.run(item.id, item.objectType, collection, JSON.stringify(item))
      insertFts.run(item.id, item.objectType, text)
    }
  }
  for (const relation of pkg.relations) insertRelation.run(relation.relationId, relation.relationType, relation.fromId, relation.toId, JSON.stringify(relation))
  db.exec('PRAGMA optimize;')
  db.close()
  return { file, snapshotHash: pkg.snapshots[0].manifestHash }
}

export function queryIndex(file, query, limit = 8) {
  const db = new DatabaseSync(file, { readOnly: true })
  const rows = db.prepare('SELECT id, object_type, bm25(object_fts) AS score FROM object_fts WHERE object_fts MATCH ? ORDER BY score LIMIT ?').all(query, limit)
  db.close()
  return rows
}

export async function writeCompilerArtifacts(root, pkg) {
  const buildRoot = path.join(root, 'reference/build/m1b')
  await fs.mkdir(buildRoot, { recursive: true })
  const reviewPacket = {
    packetId: 'REVIEW-AMZ-ADS-M1B',
    state: 'pending-domain-and-release-review',
    candidates: ['CONCEPT-AMZ-ACOS', 'METRIC-AMZ-ACOS', 'DECISION-AMZ-ACOS-DIAGNOSIS', 'CASE-AMZ-ACOS-SYNTHETIC', 'PLAYBOOK-AMZ-ACOS-CHECK', 'SKILL-AMZ-ADS-DIAGNOSIS-V1'],
    evidenceRefs: ['EVID-AMZ-ACOS-DELTA', 'EVID-AMZ-ACOS-DEFINITION', 'EVID-AMZ-EVIDENCE-GATE'],
    unresolved: ['CPC and CVR values are absent', 'No domain reviewer acceptance', 'Synthetic evidence cannot justify an account change'],
    promotion: validatePromotion({ apply: false })
  }
  const dryRun = {
    ...validatePromotion({ apply: false }),
    target: 'canonical-knowledge-base',
    candidatePackageId: pkg.packageId,
    candidateSnapshotHash: pkg.snapshots[0].manifestHash,
    candidateObjectCount: pkg.snapshots[0].objectIds.length,
    candidateRelationCount: pkg.snapshots[0].relationIds.length
  }
  const map = {
    mapId: 'MAP-AMZ-ADS-M1B',
    snapshotId: pkg.snapshots[0].snapshotId,
    nodes: [...pkg.knowledgeObjects, ...pkg.skills, ...pkg.tasks].map((item) => ({ id: item.id, type: item.objectType, label: item.name || item.title || item.canonicalTerm || item.id })),
    edges: pkg.relations.map((relation) => ({ id: relation.relationId, type: relation.relationType, from: relation.fromId, to: relation.toId }))
  }
  await writeJson(path.join(buildRoot, 'reference-package.json'), pkg)
  await writeJson(path.join(buildRoot, 'snapshot.json'), pkg.snapshots[0])
  await writeJson(path.join(buildRoot, 'review-packet.json'), reviewPacket)
  await writeJson(path.join(buildRoot, 'canonical-dry-run.json'), dryRun)
  await writeJson(path.join(buildRoot, 'knowledge-map.json'), map)
  const index = await buildSqliteIndex(path.join(buildRoot, 'index.sqlite'), pkg)
  return { buildRoot, reviewPacket, dryRun, map, index }
}
