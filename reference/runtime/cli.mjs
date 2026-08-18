#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { buildM1B, evaluateGolden } from '../../scripts/build-m1b.mjs'
import { goldenDefinitions, queryIndex } from './compiler.mjs'
import { exportRun, runDeterministicAgent, TOOL_REGISTRY } from './agent.mjs'
import { readJson } from './utils.mjs'

const root = process.cwd()
const buildRoot = path.join(root, 'reference/build/m1b')

async function loadRuntime() {
  return {
    pkg: await readJson(path.join(buildRoot, 'reference-package.json')),
    indexFile: path.join(buildRoot, 'index.sqlite')
  }
}

async function runInput(input, ordinal = 1) {
  const runtime = await loadRuntime()
  return runDeterministicAgent({ ...runtime, input, ordinal })
}

async function handleMcp(request) {
  const base = { jsonrpc: '2.0', id: request.id }
  if (request.method === 'initialize') return { ...base, result: { protocolVersion: '2025-03-26', serverInfo: { name: 'mkd-m1b-local', version: '0.2.0' }, capabilities: { tools: {} } } }
  if (request.method === 'tools/list') {
    return {
      ...base,
      result: {
        tools: [
          { name: 'mkd_search', description: 'Search the immutable local MKD snapshot.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
          { name: 'mkd_diagnose', description: 'Run deterministic E2 replay with zero external effects.', inputSchema: { type: 'object', properties: { caseId: { type: 'string' }, comparisonWindow: { type: 'string' } }, required: ['caseId', 'comparisonWindow'], additionalProperties: false } }
        ]
      }
    }
  }
  if (request.method === 'tools/call' && request.params?.name === 'mkd_search') {
    const rows = queryIndex(path.join(buildRoot, 'index.sqlite'), request.params.arguments.query)
    return { ...base, result: { content: [{ type: 'text', text: JSON.stringify(rows) }] } }
  }
  if (request.method === 'tools/call' && request.params?.name === 'mkd_diagnose') {
    const run = await runInput(request.params.arguments)
    return { ...base, result: { content: [{ type: 'text', text: JSON.stringify(run) }] } }
  }
  return { ...base, error: { code: -32601, message: 'Method not found' } }
}

async function serveMcp() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of input) {
    if (!line.trim()) continue
    try {
      process.stdout.write(`${JSON.stringify(await handleMcp(JSON.parse(line)))}\n`)
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: error.message } })}\n`)
    }
  }
}

async function main() {
  const [command = 'help', raw = '{}'] = process.argv.slice(2)
  if (command === 'build' || command === 'extract' || command === 'compile') {
    const result = await buildM1B(root)
    console.log(JSON.stringify({ status: result.receipt.status, receipt: 'reference/build/m1b/m1-b-execution-receipt.json' }, null, 2))
    return
  }
  if (command === 'run') {
    const input = raw.startsWith('@') ? JSON.parse(await fs.readFile(raw.slice(1), 'utf8')) : JSON.parse(raw)
    const run = await runInput(input)
    console.log(JSON.stringify(run, null, 2))
    return
  }
  if (command === 'export') {
    const input = raw === '{}' ? goldenDefinitions()[0].input : JSON.parse(raw)
    const run = await runInput(input)
    console.log(JSON.stringify({ output: await exportRun(root, run) }, null, 2))
    return
  }
  if (command === 'evaluate') {
    const runtime = await loadRuntime()
    const report = await evaluateGolden(runtime)
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.passRate === 1 ? 0 : 1
    return
  }
  if (command === 'inspect') {
    const snapshot = await readJson(path.join(buildRoot, 'snapshot.json'))
    console.log(JSON.stringify({ snapshot, tools: TOOL_REGISTRY, canonicalApply: false, providerCalls: 0 }, null, 2))
    return
  }
  if (command === 'mcp') {
    await serveMcp()
    return
  }
  console.log('Usage: node reference/runtime/cli.mjs <build|run|export|evaluate|inspect|mcp> [json|@file]')
}

await main()
