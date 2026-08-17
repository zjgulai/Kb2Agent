import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { extractFile, ExtractionError } from '../../reference/runtime/extract.mjs'
import { goldenDefinitions, validatePromotion } from '../../reference/runtime/compiler.mjs'
import { runDeterministicAgent } from '../../reference/runtime/agent.mjs'
import { artifactHash, readJson } from '../../reference/runtime/utils.mjs'
import {
  localizeReplayActionPackage,
  replayPresentation,
  replayResult
} from '../../docs/reference-lab-fixture.mjs'

const root = process.cwd()
const buildRoot = path.join(root, 'reference/build/m1b')

function spawnCli(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['reference/runtime/cli.mjs', ...args], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.stdin.end(input)
  })
}

test('corpus manifest covers six normal formats with immutable hashes and explicit licenses', async () => {
  const manifest = await readJson(path.join(root, 'reference/corpus/amazon-ads-v1/manifest.json'))
  const normal = manifest.sources.filter((source) => source.corpusClass === 'normal')
  assert.equal(normal.length, 6)
  assert.deepEqual(new Set(normal.map((source) => source.format)), new Set(['xlsx', 'pdf', 'pptx', 'docx', 'markdown', 'json']))
  assert.ok(normal.every((source) => /^sha256:[a-f0-9]{64}$/.test(source.sha256)))
  assert.ok(normal.every((source) => source.license === 'project-authored-synthetic' && source.redistribution === true))
})

test('extracted structural elements preserve stable source locators', async () => {
  const lines = (await fs.readFile(path.join(buildRoot, 'structural-elements.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
  assert.equal(lines.length, 88)
  for (const element of lines) {
    assert.match(element.id, /^ELEM-[A-Z0-9-]+$/)
    assert.match(element.contentHash, /^sha256:[a-f0-9]{64}$/)
    assert.ok(element.locator.length >= 3)
  }
  assert.ok(lines.some((item) => item.locator.includes('page=2')))
  assert.ok(lines.some((item) => item.locator.includes('slide=3;shape=')))
  assert.ok(lines.some((item) => item.locator.includes('table=2;row=5')))
  assert.ok(lines.some((item) => item.locator.includes('sheet=Analysis;range=')))
})

test('extractors fail closed for empty PDFs, oversized input, invalid archives, and structure drift', async () => {
  const emptyPdf = path.join(root, 'reference/corpus/amazon-ads-v1/negative/scanned-empty.synthetic.pdf')
  await assert.rejects(() => extractFile(emptyPdf, { format: 'pdf', title: 'empty' }), (error) => error instanceof ExtractionError && error.code === 'TEXT_MISSING')

  const jsonFile = path.join(root, 'reference/corpus/amazon-ads-v1/normal/account-context.synthetic.json')
  await assert.rejects(() => extractFile(jsonFile, { format: 'json', title: 'oversized' }, { maxBytes: 1 }), (error) => error.code === 'INPUT_TOO_LARGE')
  await assert.rejects(() => extractFile(jsonFile, { format: 'json', title: 'drift', expected: { locatorIncludes: ['jsonpath=$.doesNotExist'] } }), (error) => error.code === 'STRUCTURE_MISMATCH')

  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mkd-invalid-archive-'))
  const invalidDocx = path.join(temporary, 'invalid.docx')
  await fs.writeFile(invalidDocx, 'not a zip archive')
  await assert.rejects(() => extractFile(invalidDocx, { format: 'docx', title: 'invalid' }), (error) => error.code === 'ARCHIVE_INVALID')
  await fs.rm(temporary, { recursive: true, force: true })
})

test('canonical promotion supports dry-run only and hard-blocks apply', () => {
  assert.deepEqual(validatePromotion({ apply: false }), { mode: 'dry-run', apply: false, canonicalWrites: 0, decision: 'pending-review', externalCalls: 0, sideEffects: 0 })
  assert.throws(() => validatePromotion({ apply: true }), (error) => error.code === 'CANONICAL_APPLY_DISABLED')
})

test('deterministic agent is byte-stable and blocks all adversarial tasks', async () => {
  const pkg = await readJson(path.join(buildRoot, 'reference-package.json'))
  const indexFile = path.join(buildRoot, 'index.sqlite')
  const positive = goldenDefinitions()[0]
  const first = runDeterministicAgent({ pkg, indexFile, input: positive.input, ordinal: 1 })
  const second = runDeterministicAgent({ pkg, indexFile, input: positive.input, ordinal: 1 })
  assert.equal(artifactHash(first), artifactHash(second))
  assert.equal(first.actionPackage.status, 'draft-for-review')
  assert.equal(first.receipt.externalCalls, 0)
  assert.equal(first.receipt.sideEffects, 0)
  assert.equal(first.toolRegistry.length, 8)
  for (const [index, golden] of goldenDefinitions().entries()) {
    const result = runDeterministicAgent({ pkg, indexFile, input: golden.input, ordinal: index + 1 })
    assert.equal(result.actionPackage.status, golden.expected.status, golden.id)
    assert.ok(result.actionPackage.evidenceRefs.length > 0, golden.id)
  }
})

test('Chinese presentation contract remains stable across SSR and hydrated runtime data', async () => {
  const bundle = await readJson(path.join(buildRoot, 'runs/RUN-AMZ-M1B-001/replay-bundle.json'))
  const localized = localizeReplayActionPackage(bundle.actionPackage)

  assert.equal(replayPresentation.locale, 'zh-CN')
  assert.equal(replayPresentation.headline, `${replayPresentation.headlineLead}${replayPresentation.headlineEmphasis}`)
  assert.equal(localized.summary, replayResult.summary)
  assert.equal(localized.recommendation, replayResult.recommendation)
  assert.deepEqual(localized.facts.map((item) => item.text), replayResult.facts.map((item) => item.text))
  assert.deepEqual(localized.unknowns.map((item) => item.question), replayResult.unknowns.map((item) => item.text))
  assert.doesNotMatch(JSON.stringify(localized), /Request the missing comparable evidence|Synthetic ACOS rises|Did CPC, CVR/)
})

test('SQLite and JSON snapshots have hash parity', async () => {
  const snapshot = await readJson(path.join(buildRoot, 'snapshot.json'))
  const receipt = await readJson(path.join(buildRoot, 'm1-b-execution-receipt.json'))
  assert.equal(receipt.compiler.snapshotHash, snapshot.manifestHash)
  assert.equal(receipt.agent.goldenPassed, 20)
  assert.equal(receipt.canonicalWrites, 0)
})

test('CLI evaluate and stdio MCP expose only local deterministic capabilities', async () => {
  const evaluated = await spawnCli(['evaluate'])
  assert.equal(evaluated.code, 0, evaluated.stderr)
  assert.equal(JSON.parse(evaluated.stdout).passRate, 1)

  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
  ].map(JSON.stringify).join('\n') + '\n'
  const mcp = await spawnCli(['mcp'], requests)
  assert.equal(mcp.code, 0, mcp.stderr)
  const responses = mcp.stdout.trim().split('\n').map(JSON.parse)
  assert.equal(responses[0].result.serverInfo.name, 'mkd-m1b-local')
  assert.deepEqual(responses[1].result.tools.map((tool) => tool.name), ['mkd_search', 'mkd_diagnose'])
})
