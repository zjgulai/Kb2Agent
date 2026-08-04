import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractDisplayNumber,
  normalizeDisplayNumber
} from '../../scripts/knowledge-registry.mjs'

test('display identity parser normalizes Chinese, Arabic and appendix labels', () => {
  assert.equal(extractDisplayNumber('第零章：导论'), '00')
  assert.equal(extractDisplayNumber('第 8 章 架构选型'), '08')
  assert.equal(extractDisplayNumber('第二十三章：Fine-tuning vs RAG'), '23')
  assert.equal(extractDisplayNumber('附录 B：工具手册'), 'B')
  assert.equal(normalizeDisplayNumber('7'), '07')
})

test('display identity parser ignores labels without a chapter identity', () => {
  assert.equal(extractDisplayNumber('工具手册与选型决策树'), null)
})
