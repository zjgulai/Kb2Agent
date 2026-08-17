#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { extractCorpus } from '../reference/runtime/extract.mjs'
import { compilePackage, goldenDefinitions, writeCompilerArtifacts } from '../reference/runtime/compiler.mjs'
import { exportRun, runDeterministicAgent } from '../reference/runtime/agent.mjs'
import { artifactHash, FIXED_NOW, hashFile, sha256, writeJson, writeJsonl } from '../reference/runtime/utils.mjs'

const INVENTORY = [
  {
    path: 'reference/corpus/amazon-ads-v1/normal/portfolio-performance.synthetic.xlsx',
    title: 'Synthetic Amazon Ads portfolio performance workbook', format: 'xlsx', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 3, locatorIncludes: ['sheet=Source Data', 'sheet=Analysis', 'sheet=Definitions'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/normal/metric-definition.synthetic.pdf',
    title: 'Synthetic ACOS metric definition', format: 'pdf', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 2, locatorIncludes: ['page=1', 'page=2'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/normal/diagnostic-brief.synthetic.pptx',
    title: 'Synthetic Amazon Ads diagnostic brief', format: 'pptx', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 9, locatorIncludes: ['slide=1', 'slide=2', 'slide=3'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/normal/operating-playbook.synthetic.docx',
    title: 'Synthetic Amazon Ads operating playbook', format: 'docx', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 12, locatorIncludes: ['heading=Stop conditions', 'table=1'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/normal/diagnosis-notes.synthetic.md',
    title: 'Synthetic diagnosis notes', format: 'markdown', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 5, locatorIncludes: ['heading=Observed change', 'heading=Competing hypotheses'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/normal/account-context.synthetic.json',
    title: 'Synthetic account context', format: 'json', corpusClass: 'normal', language: 'en-US',
    expected: { minElements: 5, locatorIncludes: ['jsonpath=$.dataClass', 'jsonpath=$.attributionWindow'] }
  },
  {
    path: 'reference/corpus/amazon-ads-v1/negative/scanned-empty.synthetic.pdf',
    title: 'Synthetic scanned-like empty PDF', format: 'pdf', corpusClass: 'negative', language: 'en-US', expectedError: 'TEXT_MISSING'
  },
  {
    path: 'reference/corpus/amazon-ads-v1/negative/outdated-context.synthetic.json',
    title: 'Synthetic stale account context', format: 'json', corpusClass: 'negative', language: 'en-US', expectedError: 'FRESHNESS_BLOCKED'
  },
  {
    path: 'reference/corpus/amazon-ads-v1/negative/conflicting-guidance.synthetic.md',
    title: 'Synthetic conflicting guidance', format: 'markdown', corpusClass: 'negative', language: 'en-US', expectedError: 'CONTRADICTION_BLOCKED'
  },
  {
    path: 'reference/corpus/amazon-ads-v1/negative/missing-metrics.synthetic.json',
    title: 'Synthetic missing metric inputs', format: 'json', corpusClass: 'negative', language: 'en-US', expectedError: 'REQUIRED_INPUT_MISSING'
  }
]

export async function buildManifest(root) {
  const sources = []
  for (const item of INVENTORY) {
    const file = path.join(root, item.path)
    const stat = await fs.stat(file)
    sources.push({
      ...item,
      asOf: item.path.includes('outdated') ? '2025-01-01' : '2026-08-01',
      bytes: stat.size,
      sha256: await hashFile(file),
      authorship: 'MKD project',
      license: 'project-authored-synthetic',
      redistribution: true,
      publicDisplay: true,
      privacy: 'no customer, account, credential, or platform export data'
    })
  }
  return {
    manifestId: 'CORPUS-AMZ-ADS-V1', schemaVersion: 1, generatedAt: FIXED_NOW,
    corpusClass: 'project-authored-synthetic', normalFormatCount: 6, negativeFixtureCount: 4,
    externalCalls: 0, sideEffects: 0, sources
  }
}

export async function evaluateGolden({ pkg, indexFile }) {
  const cases = goldenDefinitions()
  const results = cases.map((golden, index) => {
    const run = runDeterministicAgent({ pkg, indexFile, input: golden.input, ordinal: index + 1 })
    const checks = {
      status: run.actionPackage.status === golden.expected.status,
      citations: !golden.expected.mustCite || run.actionPackage.evidenceRefs.length > 0,
      externalCalls: run.receipt.externalCalls <= golden.expected.maxExternalCalls,
      sideEffects: run.receipt.sideEffects <= golden.expected.maxSideEffects,
      tools: run.toolRegistry.length === 8 && run.toolRegistry.every((tool) => tool.sideEffect === false)
    }
    return { goldenId: golden.id, category: golden.category, expected: golden.expected.status, actual: run.actionPackage.status, checks, passed: Object.values(checks).every(Boolean) }
  })
  return {
    evaluationId: 'EVALUATION-REPORT-AMZ-ADS-M1B', generatedAt: FIXED_NOW,
    total: results.length, passed: results.filter((result) => result.passed).length,
    passRate: results.filter((result) => result.passed).length / results.length,
    externalCalls: 0, sideEffects: 0, results
  }
}

export async function buildM1B(root = process.cwd()) {
  const manifest = await buildManifest(root)
  const corpusRoot = path.join(root)
  await writeJson(path.join(root, 'reference/corpus/amazon-ads-v1/manifest.json'), manifest)
  const extracted = await extractCorpus(corpusRoot, manifest)
  const buildRoot = path.join(root, 'reference/build/m1b')
  await fs.mkdir(buildRoot, { recursive: true })
  await writeJsonl(path.join(buildRoot, 'structural-elements.jsonl'), extracted.elements)
  const extractionReceipt = {
    receiptId: 'EXTRACTION-RECEIPT-AMZ-ADS-M1B', generatedAt: FIXED_NOW,
    formatCount: 6, sourceCount: extracted.receipts.length,
    structuralElementCount: extracted.elements.length,
    locatorsHash: sha256(extracted.elements.map((element) => `${element.id}:${element.locator}:${element.contentHash}`).sort().join('\n')),
    sources: extracted.receipts, externalCalls: 0, sideEffects: 0, status: 'passed'
  }
  await writeJson(path.join(buildRoot, 'extraction-receipt.json'), extractionReceipt)

  const pkg = await compilePackage({ root, extracted })
  const compiler = await writeCompilerArtifacts(root, pkg)
  const run = runDeterministicAgent({ pkg, indexFile: compiler.index.file, input: goldenDefinitions()[0].input, ordinal: 1 })
  await exportRun(root, run)
  const evaluation = await evaluateGolden({ pkg, indexFile: compiler.index.file })
  await writeJson(path.join(buildRoot, 'evaluation-report.json'), evaluation)
  await writeJson(path.join(root, 'reference/golden/amazon-ads-diagnosis-v1.json'), { datasetId: 'DATASET-AMZ-ADS-M1B', tasks: goldenDefinitions() })

  const sqliteHash = await hashFile(compiler.index.file)
  const receipt = {
    receiptId: 'M1-B-LOCAL-BUILD-RECEIPT', generatedAt: FIXED_NOW, status: evaluation.passRate === 1 ? 'passed' : 'failed',
    corpus: { formats: 6, normalSources: 6, negativeFixtures: 4, elements: extracted.elements.length },
    compiler: {
      packageId: pkg.packageId,
      snapshotId: pkg.snapshots[0].snapshotId,
      snapshotHash: pkg.snapshots[0].manifestHash,
      objectCount: pkg.snapshots[0].objectIds.length,
      relationCount: pkg.snapshots[0].relationIds.length,
      canonicalApply: false,
      canonicalWrites: 0
    },
    agent: { taskId: 'TASK-AMZ-ADS-DIAGNOSIS-V1', eLevel: 'E2', tools: 8, goldenTotal: evaluation.total, goldenPassed: evaluation.passed },
    artifacts: {
      manifest: artifactHash(manifest), extractionReceipt: artifactHash(extractionReceipt),
      referencePackage: artifactHash(pkg), snapshot: pkg.snapshots[0].manifestHash,
      sqlite: sqliteHash, evaluation: artifactHash(evaluation), replay: artifactHash(run)
    },
    evidenceGrade: 'L2-fixture-or-dry-run', providerCalls: 0, externalCalls: 0, sideEffects: 0,
    canonicalWrites: 0, deployed: false, gitCommitted: false, gitPushed: false
  }
  await writeJson(path.join(buildRoot, 'm1-b-execution-receipt.json'), receipt)

  const publicRoot = path.join(root, 'docs/public/reference/m1b')
  await fs.rm(publicRoot, { recursive: true, force: true })
  await fs.mkdir(path.join(publicRoot, 'runs/RUN-AMZ-M1B-001'), { recursive: true })
  for (const name of ['snapshot.json', 'review-packet.json', 'canonical-dry-run.json', 'knowledge-map.json', 'extraction-receipt.json', 'evaluation-report.json', 'm1-b-execution-receipt.json']) {
    await fs.copyFile(path.join(buildRoot, name), path.join(publicRoot, name))
  }
  for (const name of ['action-package.json', 'trace.json', 'receipt.json', 'replay-bundle.json', 'report.md']) {
    await fs.copyFile(path.join(buildRoot, 'runs/RUN-AMZ-M1B-001', name), path.join(publicRoot, 'runs/RUN-AMZ-M1B-001', name))
  }
  return { manifest, extracted, pkg, compiler, run, evaluation, receipt }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const result = await buildM1B(process.cwd())
  process.stdout.write(`${JSON.stringify({
    status: result.receipt.status,
    formats: result.receipt.corpus.formats,
    elements: result.receipt.corpus.elements,
    objects: result.receipt.compiler.objectCount,
    snapshotHash: result.receipt.compiler.snapshotHash,
    golden: `${result.evaluation.passed}/${result.evaluation.total}`,
    externalCalls: 0,
    sideEffects: 0
  }, null, 2)}\n`)
}
