import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateMonthlyCost } from '../../fixtures/cost-model.mjs'

test('cost model keeps currency, region and dated pricing assumptions', () => {
  const result = estimateMonthlyCost({
    currency: 'USD',
    region: 'US',
    effectiveAt: '2026-08-01',
    monthlyQueries: 10_000,
    inputTokensPerQuery: 4_000,
    cachedInputTokensPerQuery: 1_000,
    outputTokensPerQuery: 500,
    embeddingTokens: 50_000_000,
    fixedMonthlyCost: 25,
    prices: {
      inputPerMillion: 2,
      cachedInputPerMillion: 0.5,
      outputPerMillion: 8,
      embeddingPerMillion: 0.1
    }
  })

  assert.equal(result.total, 135)
  assert.equal(result.currency, 'USD')
  assert.equal(result.effectiveAt, '2026-08-01')
})

test('cost model fails closed when cached input exceeds total input', () => {
  assert.throws(() => estimateMonthlyCost({
    currency: 'USD',
    region: 'US',
    effectiveAt: '2026-08-01',
    monthlyQueries: 1,
    inputTokensPerQuery: 10,
    cachedInputTokensPerQuery: 11,
    outputTokensPerQuery: 1,
    prices: { inputPerMillion: 1, outputPerMillion: 1 }
  }), /cached input/)
})
