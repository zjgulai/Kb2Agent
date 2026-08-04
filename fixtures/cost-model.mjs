function requireNonNegative(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number`)
  }
  return value
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
}

export function estimateMonthlyCost(input) {
  const currency = String(input.currency || '').trim().toUpperCase()
  const region = String(input.region || '').trim()
  const effectiveAt = String(input.effectiveAt || '')
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('currency must be an ISO 4217 code')
  if (!region) throw new TypeError('region is required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveAt)) throw new TypeError('effectiveAt must be YYYY-MM-DD')

  const monthlyQueries = requireNonNegative('monthlyQueries', input.monthlyQueries)
  const inputTokensPerQuery = requireNonNegative('inputTokensPerQuery', input.inputTokensPerQuery)
  const cachedInputTokensPerQuery = requireNonNegative('cachedInputTokensPerQuery', input.cachedInputTokensPerQuery || 0)
  const outputTokensPerQuery = requireNonNegative('outputTokensPerQuery', input.outputTokensPerQuery)
  const embeddingTokens = requireNonNegative('embeddingTokens', input.embeddingTokens || 0)
  const fixedMonthlyCost = requireNonNegative('fixedMonthlyCost', input.fixedMonthlyCost || 0)
  const prices = input.prices || {}

  if (cachedInputTokensPerQuery > inputTokensPerQuery) {
    throw new RangeError('cached input cannot exceed total input')
  }

  const uncachedInputTokens = monthlyQueries * (inputTokensPerQuery - cachedInputTokensPerQuery)
  const cachedInputTokens = monthlyQueries * cachedInputTokensPerQuery
  const outputTokens = monthlyQueries * outputTokensPerQuery
  const perMillion = 1_000_000
  const breakdown = {
    uncachedInput: uncachedInputTokens / perMillion * requireNonNegative('prices.inputPerMillion', prices.inputPerMillion),
    cachedInput: cachedInputTokens / perMillion * requireNonNegative('prices.cachedInputPerMillion', prices.cachedInputPerMillion || 0),
    output: outputTokens / perMillion * requireNonNegative('prices.outputPerMillion', prices.outputPerMillion),
    embedding: embeddingTokens / perMillion * requireNonNegative('prices.embeddingPerMillion', prices.embeddingPerMillion || 0),
    fixed: fixedMonthlyCost
  }

  return {
    currency,
    region,
    effectiveAt,
    assumptions: {
      monthlyQueries,
      inputTokensPerQuery,
      cachedInputTokensPerQuery,
      outputTokensPerQuery,
      embeddingTokens
    },
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([key, value]) => [key, round(value)])),
    total: round(Object.values(breakdown).reduce((sum, value) => sum + value, 0))
  }
}
