#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import Ajv2020 from 'ajv/dist/2020.js'

const root = process.cwd()
const schemaRoot = path.join(root, 'reference', 'schemas')
const fixtureRoot = path.join(root, 'reference', 'fixtures')
const knowledgeSchemaRoot = path.join(root, 'knowledge-system', 'schemas')

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

async function listJsonFiles(directory) {
  return (await fs.readdir(directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(directory, name))
}

function canonicalSnapshot(snapshot) {
  return JSON.stringify({
    objectIds: [...snapshot.objectIds].sort(),
    relationIds: [...snapshot.relationIds].sort()
  })
}

function snapshotHash(snapshot) {
  return `sha256:${crypto.createHash('sha256').update(canonicalSnapshot(snapshot)).digest('hex')}`
}

function indexPackage(packageData) {
  const byId = new Map()
  const errors = []
  const collections = [
    ['sources', 'id'],
    ['evidence', 'id'],
    ['knowledgeObjects', 'id'],
    ['skills', 'id'],
    ['tasks', 'id'],
    ['governance', 'id'],
    ['evaluations', 'id'],
    ['snapshots', 'snapshotId'],
    ['traces', 'traceId'],
    ['actionPackages', 'actionPackageId'],
    ['receipts', 'receiptId']
  ]

  const syntheticTypes = {
    snapshots: 'ReleaseSnapshot',
    traces: 'RunTrace',
    actionPackages: 'ActionPackage',
    receipts: 'KnowledgeReceipt'
  }

  for (const [collection, idKey] of collections) {
    for (const item of packageData[collection] || []) {
      const id = item[idKey]
      const objectType = item.objectType || syntheticTypes[collection]
      if (byId.has(id)) {
        errors.push({ code: 'DUPLICATE_ID', message: `${id} appears more than once` })
      } else {
        byId.set(id, { item, objectType, collection })
      }
    }
  }

  for (const relation of packageData.relations || []) {
    if (byId.has(relation.relationId)) {
      errors.push({ code: 'DUPLICATE_ID', message: `${relation.relationId} collides with an object ID` })
    } else {
      byId.set(relation.relationId, { item: relation, objectType: 'Relation', collection: 'relations' })
    }
  }
  return { byId, errors }
}

function hasDirectedCycle(edges) {
  const graph = new Map()
  for (const [from, to] of edges) {
    if (!graph.has(from)) graph.set(from, [])
    graph.get(from).push(to)
  }
  const visiting = new Set()
  const visited = new Set()
  function visit(node) {
    if (visiting.has(node)) return true
    if (visited.has(node)) return false
    visiting.add(node)
    for (const next of graph.get(node) || []) {
      if (visit(next)) return true
    }
    visiting.delete(node)
    visited.add(node)
    return false
  }
  return [...graph.keys()].some(visit)
}

function validateCrossObject(packageData, relationRegistry) {
  const { byId, errors } = indexPackage(packageData)
  const relationContracts = new Map(relationRegistry.relations.map((relation) => [relation.type, relation]))

  function requireRef(id, expectedType, context) {
    const found = byId.get(id)
    if (!found) {
      errors.push({ code: 'DANGLING_REFERENCE', message: `${context} references missing ${id}` })
      return null
    }
    if (expectedType && found.objectType !== expectedType) {
      errors.push({ code: 'REFERENCE_TYPE_MISMATCH', message: `${context} expected ${expectedType}, got ${found.objectType} for ${id}` })
    }
    return found
  }

  for (const item of packageData.sources || []) {
    if (item.objectType === 'SourceRevision') requireRef(item.sourceArtifactId, 'SourceArtifact', item.id)
    if (item.objectType === 'StructuralElement') requireRef(item.sourceRevisionId, 'SourceRevision', item.id)
  }
  for (const item of packageData.evidence || []) {
    if (item.objectType === 'EvidenceFragment') {
      requireRef(item.locator.sourceRevisionId, 'SourceRevision', item.id)
      requireRef(item.locator.structuralElementId, 'StructuralElement', item.id)
    }
    if (item.objectType === 'Claim') {
      for (const ref of item.supportRefs) requireRef(ref, 'EvidenceFragment', item.id)
      for (const ref of item.contradictionRefs) requireRef(ref, null, item.id)
    }
  }
  for (const skill of packageData.skills || []) {
    requireRef(skill.promotionDecisionRef, 'PromotionDecision', skill.id)
  }
  for (const task of packageData.tasks || []) {
    requireRef(task.skillRef, 'Skill', task.id)
    for (const ref of task.requiredClosure.objectIds) requireRef(ref, null, task.id)
    for (const ref of task.evaluationRefs) requireRef(ref, 'EvaluationContract', task.id)
  }

  const supersedesEdges = []
  for (const relation of packageData.relations || []) {
    const from = requireRef(relation.fromId, null, relation.relationId)
    const to = requireRef(relation.toId, null, relation.relationId)
    if (!from || !to) continue
    if (from.objectType !== relation.fromType || to.objectType !== relation.toType) {
      errors.push({
        code: 'RELATION_DECLARED_TYPE_MISMATCH',
        message: `${relation.relationId} declares ${relation.fromType}→${relation.toType}, actual ${from.objectType}→${to.objectType}`
      })
      continue
    }
    if (relation.relationType === 'produces' && relation.fromType === 'Case' && relation.toType === 'Skill') {
      errors.push({ code: 'CASE_SKILL_PROMOTION_FORBIDDEN', message: `${relation.relationId} bypasses KnowledgeCandidate and PromotionDecision` })
    }
    const contract = relationContracts.get(relation.relationType)
    if (!contract || !contract.from.includes(relation.fromType) || !contract.to.includes(relation.toType)) {
      errors.push({
        code: 'RELATION_ENDPOINT_NOT_ALLOWED',
        message: `${relation.relationType} does not allow ${relation.fromType}→${relation.toType}`
      })
    }
    if (contract?.sameType && relation.fromType !== relation.toType) {
      errors.push({ code: 'RELATION_SAME_TYPE_REQUIRED', message: `${relation.relationId} must connect identical object types` })
    }
    if (relation.relationType === 'supersedes') supersedesEdges.push([relation.fromId, relation.toId])
  }
  for (const collection of ['sources', 'evidence', 'knowledgeObjects', 'skills', 'tasks', 'governance', 'evaluations']) {
    for (const item of packageData[collection] || []) {
      if (item.supersedes) supersedesEdges.push([item.id, item.supersedes])
    }
  }
  if (hasDirectedCycle(supersedesEdges)) {
    errors.push({ code: 'SUPERSEDES_CYCLE', message: 'supersedes graph contains a directed cycle' })
  }

  for (const snapshot of packageData.snapshots || []) {
    for (const ref of snapshot.objectIds) requireRef(ref, null, snapshot.snapshotId)
    for (const ref of snapshot.relationIds) requireRef(ref, 'Relation', snapshot.snapshotId)
    const expected = snapshotHash(snapshot)
    if (snapshot.manifestHash !== expected) {
      errors.push({ code: 'SNAPSHOT_HASH_MISMATCH', message: `${snapshot.snapshotId} expected ${expected}, got ${snapshot.manifestHash}` })
    }
  }
  for (const trace of packageData.traces || []) {
    for (const event of trace.events) {
      for (const ref of [...event.inputRefs, ...event.outputRefs]) requireRef(ref, null, event.eventId)
    }
  }
  for (const receipt of packageData.receipts || []) {
    requireRef(receipt.traceRef, 'RunTrace', receipt.receiptId)
    for (const ref of receipt.evaluationRefs) requireRef(ref, 'EvaluationContract', receipt.receiptId)
  }

  return errors
}

function decodePointer(pointer) {
  if (!pointer.startsWith('/')) throw new Error(`invalid JSON pointer ${pointer}`)
  return pointer.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
}

function applyMutations(source, mutations) {
  const target = structuredClone(source)
  for (const mutation of mutations) {
    const parts = decodePointer(mutation.path)
    const key = parts.pop()
    let parent = target
    for (const part of parts) parent = parent[Array.isArray(parent) ? Number(part) : part]
    const resolvedKey = Array.isArray(parent) && /^\d+$/.test(key) ? Number(key) : key
    if (mutation.operation === 'delete') delete parent[resolvedKey]
    else if (mutation.operation === 'replace') parent[resolvedKey] = mutation.value
    else if (mutation.operation === 'append') parent[resolvedKey].push(mutation.value)
    else if (mutation.operation === 'appendMany') parent[resolvedKey].push(...mutation.value)
    else throw new Error(`unsupported mutation ${mutation.operation}`)
  }
  return target
}

function schemaErrors(validate) {
  return (validate.errors || []).map((error) => `${error.instancePath || '/'} ${error.message}`)
}

async function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false })
  const schemaFiles = [
    ...(await listJsonFiles(schemaRoot)),
    ...(await listJsonFiles(knowledgeSchemaRoot)).filter((file) => path.basename(file).startsWith('product-') || ['roles.schema.json', 'm1-c-review-acceptance.schema.json', 'm1-c-review-record.schema.json'].includes(path.basename(file)))
  ]
  for (const file of schemaFiles) {
    const schema = await readJson(file)
    if (!ajv.validateSchema(schema)) {
      throw new Error(`invalid schema ${path.relative(root, file)}: ${ajv.errorsText(ajv.errors)}`)
    }
    ajv.addSchema(schema)
  }
  return { ajv, schemaFiles }
}

async function validateProductRegistries(ajv) {
  const pairs = [
    ['product-decisions.json', 'https://mkd.local/knowledge-system/product-decisions.schema.json'],
    ['product-lines.json', 'https://mkd.local/knowledge-system/product-lines.schema.json'],
    ['product-claims.json', 'https://mkd.local/knowledge-system/product-claims.schema.json'],
    ['roles.json', 'https://mkd.local/knowledge-system/roles.schema.json'],
    ['m1-c-review-packet.json', 'https://mkd.local/knowledge-system/m1-c-review-acceptance.schema.json']
  ]
  for (const [file, schemaId] of pairs) {
    const validate = ajv.getSchema(schemaId)
    const data = await readJson(path.join(root, 'knowledge-system', file))
    if (!validate(data)) throw new Error(`${file} failed: ${schemaErrors(validate).join('; ')}`)
  }

  const validateReviewRecord = ajv.getSchema('https://mkd.local/knowledge-system/m1-c-review-record.schema.json')
  const validateReviewPacket = ajv.getSchema('https://mkd.local/knowledge-system/m1-c-review-acceptance.schema.json')
  const manifest = await readJson(path.join(root, 'reference', 'receipts', 'm1-c-candidate-manifest.json'))
  const packetPath = path.resolve(root, manifest.reviewPacket)
  if (!packetPath.startsWith(`${path.resolve(root, 'knowledge-system')}${path.sep}`)) {
    throw new Error('current M1-C review packet must remain in knowledge-system')
  }
  const packet = await readJson(packetPath)
  if (!validateReviewPacket(packet)) {
    throw new Error(`${manifest.reviewPacket} failed: ${schemaErrors(validateReviewPacket).join('; ')}`)
  }
  const reviewRecordFiles = packet.reviewers.flatMap((reviewer) => reviewer.evidenceRefs)
  if (reviewRecordFiles.length !== 4 || new Set(reviewRecordFiles).size !== 4) {
    throw new Error(`current M1-C packet requires exactly 4 distinct review records, observed ${reviewRecordFiles.length}`)
  }
  const reviewRecords = []
  for (const file of reviewRecordFiles) {
    const absolute = path.resolve(root, file)
    if (!absolute.startsWith(`${path.resolve(root, 'release', 'm1c', 'reviews')}${path.sep}`)) {
      throw new Error(`current M1-C review record escapes the review directory: ${file}`)
    }
    const record = await readJson(absolute)
    if (!validateReviewRecord(record)) throw new Error(`${file} failed: ${schemaErrors(validateReviewRecord).join('; ')}`)
    reviewRecords.push({ file, record })
  }

  const decisions = await readJson(path.join(root, 'knowledge-system', 'product-decisions.json'))
  const forbidden = new Set(decisions.implementationAuthorization.forbiddenWithoutNewAuthorization)
  for (const action of ['provider-call', 'production-deploy', 'canonical-knowledge-write', 'external-send', 'git-commit', 'git-push', 'package-publication']) {
    if (!forbidden.has(action)) throw new Error(`authorization registry does not fail closed for ${action}`)
  }
  const roles = await readJson(path.join(root, 'knowledge-system', 'roles.json'))
  const reviewersByRole = new Map(packet.reviewers.map((reviewer) => [reviewer.roleId, reviewer]))
  const reviewRecordsByRole = new Map(reviewRecords.map(({ file, record }) => [record.roleId, { file, record }]))
  if (!['in-review', 'accepted'].includes(packet.state)) {
    throw new Error(`current M1-C packet state ${packet.state} is not valid for a fully assigned candidate`)
  }
  const packetAccepted = packet.state === 'accepted'
  if (packet.deploymentGate.candidateStaticDeployAllowed !== packetAccepted) {
    throw new Error('current M1-C packet state and candidate deployment gate disagree')
  }
  for (const role of roles.roles) {
    const reviewer = reviewersByRole.get(role.roleId)
    const currentReview = reviewRecordsByRole.get(role.roleId)
    if (!reviewer) throw new Error(`M1-C review packet is missing ${role.roleId}`)
    if (!currentReview) throw new Error(`M1-C review records are missing ${role.roleId}`)
    const { file: reviewRecordFile, record: reviewRecord } = currentReview
    if (role.assignee !== reviewer.assignee) throw new Error(`${role.roleId} assignee differs between role registry and review packet`)
    if (role.assignee !== reviewRecord.assignee) throw new Error(`${role.roleId} assignee differs between role registry and review record`)
    if (!reviewer.evidenceRefs.includes(reviewRecordFile)) {
      throw new Error(`${role.roleId} review packet does not reference its structured review record`)
    }
    if (reviewRecord.releaseId !== manifest.releaseId || reviewRecord.siteDigest !== manifest.siteDigest) {
      throw new Error(`${role.roleId} review record is not bound to the current candidate`)
    }
    if (packetAccepted) {
      if (role.acceptanceState !== 'accepted') throw new Error(`${role.roleId} role registry is not accepted`)
      if (!role.assignee || reviewer.assignmentState !== 'completed' || reviewer.decision !== 'accepted' || !reviewer.signedAt) {
        throw new Error(`${role.roleId} has an incomplete accepted packet state`)
      }
      if (reviewRecord.state !== 'completed' || reviewRecord.decision !== 'accepted' || reviewRecord.signedAt !== reviewer.signedAt) {
        throw new Error(`${role.roleId} accepted packet and review record disagree`)
      }
      if (reviewRecord.independenceAttestation !== true || reviewRecord.reviewItems.some((item) => item.status !== 'passed')) {
        throw new Error(`${role.roleId} accepted review record is incomplete`)
      }
    } else {
      if (!role.assignee || reviewer.assignmentState !== 'assigned' || reviewer.decision !== 'pending' || reviewer.signedAt !== null) {
        throw new Error(`${role.roleId} has an inconsistent in-review packet state`)
      }
      if (reviewRecord.state !== 'assigned' || reviewRecord.decision !== 'pending' || reviewRecord.signedAt !== null) {
        throw new Error(`${role.roleId} pending packet and review record disagree`)
      }
      if (reviewRecord.independenceAttestation !== null || reviewRecord.reviewItems.some((item) => item.status !== 'pending')) {
        throw new Error(`${role.roleId} pending review record fabricates completed review evidence`)
      }
    }
  }
}

async function validateGuideAdapter() {
  const adapterPath = path.join(root, 'reference', 'adapters', 'guide-registry-map.json')
  const adapter = await readJson(adapterPath)
  const expectedRegistries = new Set([
    'knowledge-system/claims.yml',
    'knowledge-system/concepts.yml',
    'knowledge-system/acceptance.yml'
  ])
  const mappedRegistries = new Set(adapter.adapters?.map(({ sourceRegistry }) => sourceRegistry))
  for (const registry of expectedRegistries) {
    if (!mappedRegistries.has(registry)) throw new Error(`Guide adapter is missing ${registry}`)
    await fs.access(path.join(root, registry))
  }
  if (adapter.status !== 'candidate-only' || adapter.mode !== 'map-without-migration') {
    throw new Error('Guide adapter must remain candidate-only and map-without-migration in M1-A')
  }
  if (adapter.promotionGate?.bulkMigrationAllowed !== false || adapter.promotionGate?.automaticAcceptanceAllowed !== false) {
    throw new Error('Guide adapter must fail closed for bulk migration and automatic acceptance')
  }
}

async function main() {
  const { ajv, schemaFiles } = await createAjv()
  await validateProductRegistries(ajv)
  await validateGuideAdapter()

  const validatePackage = ajv.getSchema('https://mkd.local/schemas/reference-package.schema.json')
  if (!validatePackage) throw new Error('Reference Package schema was not registered')
  const relationRegistry = await readJson(path.join(root, 'reference', 'ontology', 'relations.json'))
  const positiveFile = path.join(fixtureRoot, 'positive', 'amazon-ads-reference-package.json')
  const positive = await readJson(positiveFile)
  if (!validatePackage(positive)) {
    throw new Error(`positive fixture schema failed: ${schemaErrors(validatePackage).join('; ')}`)
  }
  const positiveCrossErrors = validateCrossObject(positive, relationRegistry)
  if (positiveCrossErrors.length) {
    throw new Error(`positive fixture cross-object failed: ${positiveCrossErrors.map(({ code, message }) => `${code}: ${message}`).join('; ')}`)
  }

  const negativeFiles = await listJsonFiles(path.join(fixtureRoot, 'negative'))
  const negativeResults = []
  for (const file of negativeFiles) {
    const spec = await readJson(file)
    const candidate = applyMutations(positive, spec.mutations)
    const codes = []
    if (!validatePackage(candidate)) codes.push('SCHEMA_INVALID')
    else codes.push(...validateCrossObject(candidate, relationRegistry).map(({ code }) => code))
    if (!codes.includes(spec.expectedCode)) {
      throw new Error(`${spec.fixtureId} expected ${spec.expectedCode}, observed ${codes.join(', ') || 'PASS'}`)
    }
    negativeResults.push(`${spec.fixtureId}=${spec.expectedCode}`)
  }

  const m1bFile = path.join(root, 'reference', 'build', 'm1b', 'reference-package.json')
  let m1bSummary = 'not-built'
  try {
    const m1b = await readJson(m1bFile)
    if (!validatePackage(m1b)) {
      throw new Error(`M1-B generated package schema failed: ${schemaErrors(validatePackage).join('; ')}`)
    }
    const crossErrors = validateCrossObject(m1b, relationRegistry)
    if (crossErrors.length) {
      throw new Error(`M1-B generated package cross-object failed: ${crossErrors.map(({ code, message }) => `${code}: ${message}`).join('; ')}`)
    }
    const golden = m1b.evaluations.filter((item) => item.objectType === 'GoldenTask')
    if (golden.length !== 20) throw new Error(`M1-B requires exactly 20 GoldenTasks, observed ${golden.length}`)
    const receipt = await readJson(path.join(root, 'reference', 'build', 'm1b', 'm1-b-execution-receipt.json'))
    if (receipt.status !== 'passed' || receipt.externalCalls !== 0 || receipt.sideEffects !== 0 || receipt.canonicalWrites !== 0) {
      throw new Error('M1-B receipt does not prove a zero-effect passing local build')
    }
    const database = new DatabaseSync(path.join(root, 'reference', 'build', 'm1b', 'index.sqlite'), { readOnly: true })
    const indexedHash = database.prepare("SELECT value FROM metadata WHERE key = 'snapshotHash'").get()?.value
    database.close()
    if (indexedHash !== m1b.snapshots[0].manifestHash) throw new Error('M1-B SQLite/JSON snapshot hash mismatch')
    m1bSummary = `${m1b.packageId} / ${m1b.snapshots[0].objectIds.length} objects / ${golden.length} golden / hash parity passed`
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const objectCount = ['sources', 'evidence', 'knowledgeObjects', 'skills', 'tasks', 'governance', 'evaluations']
    .reduce((total, key) => total + positive[key].length, 0)
  console.log(`Reference contracts passed: ${schemaFiles.length} schemas / 5 product registries / 4 review records / 1 Guide adapter / ${objectCount} package objects / ${positive.relations.length} typed relations.`)
  console.log(`Positive fixture: ${positive.packageId} / ${positive.snapshots[0].manifestHash} / external calls=0 / side effects=0.`)
  console.log(`Negative fixtures: ${negativeResults.join(', ')}.`)
  console.log(`M1-B generated candidate: ${m1bSummary}.`)
  console.log('Evidence ceiling: L2 fixture/dry-run; no provider call, production write, acceptance or deployment was performed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
