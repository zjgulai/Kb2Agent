#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'

const root = process.cwd()

function loadJson(rel) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) throw new Error(`missing file: ${rel}`)
  const raw = fs.readFileSync(abs, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    throw new Error(`invalid JSON in ${rel}: ${error.message}`)
  }
  return data
}

function checkEvidenceRefs(map, errors) {
  for (const cap of map.capabilities) {
    for (const ref of cap.evidenceRefs) {
      if (ref.kind === 'path') {
        const abs = path.join(root, ref.value)
        if (!fs.existsSync(abs)) {
          errors.push(`${cap.id}: evidence path does not exist: ${ref.value}`)
        }
      } else if (ref.kind === 'commit') {
        if (!/^[0-9a-f]{7,40}$/.test(ref.value)) {
          errors.push(`${cap.id}: evidence commit is not hex 7-40: ${ref.value}`)
        }
      } else if (ref.kind === 'url') {
        if (!ref.value.startsWith('https://')) {
          errors.push(`${cap.id}: evidence url is not https: ${ref.value}`)
        }
      }
    }
  }
}

function checkStatusGradeConsistency(map, errors) {
  for (const cap of map.capabilities) {
    const liveGrades = ['L3', 'L4']
    const acceptedGrades = ['L2', 'L3', 'L4']
    if (cap.status === 'live' && !liveGrades.includes(cap.evidenceGrade)) {
      errors.push(`${cap.id}: status=live requires evidenceGrade L3/L4, got ${cap.evidenceGrade}`)
    }
    if (cap.status === 'accepted' && !acceptedGrades.includes(cap.evidenceGrade)) {
      errors.push(`${cap.id}: status=accepted requires evidenceGrade L2+, got ${cap.evidenceGrade}`)
    }
    if (cap.status === 'replayable' && cap.evidenceGrade === 'L0') {
      errors.push(`${cap.id}: status=replayable cannot rest on L0 evidence`)
    }
  }
}

function checkProductLineAlignment(map, errors) {
  let lines
  try {
    lines = loadJson('knowledge-system/product-lines.json')
  } catch (error) {
    errors.push(`cannot load product-lines.json for alignment: ${error.message}`)
    return
  }
  const known = new Set(lines.productLines.map((line) => line.productLineId))
  for (const cap of map.capabilities) {
    if (!known.has(cap.line)) {
      errors.push(`${cap.id}: line ${cap.line} is not a registered productLineId`)
    }
  }
}

function main() {
  const errors = []

  let map
  try {
    map = loadJson('knowledge-system/capability-map.json')
  } catch (error) {
    console.error(`error: ${error.message}`)
    process.exitCode = 1
    return
  }

  const schema = loadJson('knowledge-system/schemas/capability-map.schema.json')
  const ajv = new Ajv2020({ strict: true, allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(map)
  if (!valid) {
    for (const error of validate.errors) {
      errors.push(`schema: ${error.instancePath || '/'} ${error.message}`)
    }
  }

  checkEvidenceRefs(map, errors)
  checkStatusGradeConsistency(map, errors)
  checkProductLineAlignment(map, errors)

  const byStatus = {}
  for (const cap of map.capabilities) {
    byStatus[cap.status] = (byStatus[cap.status] || 0) + 1
  }
  console.log(`Capability map: ${map.capabilities.length} capabilities across ${new Set(map.capabilities.map((c) => c.line)).size} product lines`)
  console.log(`Computed states: ${Object.entries(byStatus).map(([status, count]) => `${status}=${count}`).join(', ')}`)
  console.log(`Evidence refs: ${map.capabilities.reduce((n, c) => n + c.evidenceRefs.length, 0)} (path/commit/url)`)

  if (errors.length > 0) {
    for (const error of errors) console.error(`error: ${error}`)
    process.exitCode = 1
    return
  }
  console.log(`Capability schema, evidence resolution, status/grade consistency and product-line alignment passed.`)
}

main()
