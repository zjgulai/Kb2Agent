import assert from 'node:assert/strict'
import test from 'node:test'
import { runMockPipeline } from '../../fixtures/mock-pipeline.mjs'

const documents = [
  { id: 'architecture', text: 'Stage 0 defines questions evidence and acceptance before implementation.' },
  { id: 'operations', text: 'A rollback requires a backup receipt explicit target and observation window.' },
  { id: 'noise', text: 'Unrelated fixture content.' }
]

test('mock pipeline returns an answer with traceable evidence', () => {
  const result = runMockPipeline({ documents, query: 'What does rollback require?' })
  assert.equal(result.status, 'answered')
  assert.equal(result.evidence[0].id, 'operations')
  assert.equal(result.productionReady, false)
})

test('mock pipeline refuses to answer without matching evidence', () => {
  const result = runMockPipeline({ documents, query: 'quantum biology' })
  assert.deepEqual(result, { status: 'blocked', reason: 'no_evidence', evidence: [] })
})
