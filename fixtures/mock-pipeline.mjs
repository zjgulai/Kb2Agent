function tokenize(value) {
  return [...new Set(String(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])]
}

export function runMockPipeline({ documents, query, topK = 3 }) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return { status: 'blocked', reason: 'no_documents', evidence: [] }
  }
  if (!String(query || '').trim()) {
    return { status: 'blocked', reason: 'empty_query', evidence: [] }
  }

  const normalized = documents.map((document, index) => {
    const id = String(document.id || `doc-${index + 1}`)
    const text = String(document.text || '').replace(/\s+/g, ' ').trim()
    if (!text) throw new TypeError(`document ${id} has no text`)
    return { id, text, tokens: tokenize(text) }
  })
  const queryTokens = tokenize(query)
  const ranked = normalized
    .map((document) => ({
      ...document,
      score: queryTokens.filter((token) => document.tokens.includes(token)).length
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, topK)

  if (ranked.length === 0) {
    return { status: 'blocked', reason: 'no_evidence', evidence: [] }
  }

  return {
    status: 'answered',
    answer: ranked.map((document) => document.text).join(' '),
    evidence: ranked.map(({ id, score }) => ({ id, score })),
    provider: 'deterministic-mock',
    productionReady: false
  }
}
