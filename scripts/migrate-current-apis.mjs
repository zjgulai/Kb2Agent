#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const files = [
  '03-scene-sops.md',
  '10-e2e-pipeline.md',
  '11-kb-evolution.md',
  '12-evaluation.md',
  '20-ops-runbook.md',
  '23-finetuning-vs-rag.md'
]

const directory = path.join(process.cwd(), 'docs', 'knowledge')

async function main() {
  let changed = 0
  for (const fileName of files) {
    const filePath = path.join(directory, fileName)
    const source = await fs.readFile(filePath, 'utf8')
    const next = source
      .replaceAll('.chat.completions.create(', '.responses.create(')
      .replaceAll('.choices[0].message.content', '.output_text')
      .replaceAll('usage.prompt_tokens', 'usage.input_tokens')
      .replaceAll('usage.completion_tokens', 'usage.output_tokens')
      .replace(/\bmessages=/g, 'input=')
      .replace(/\bmax_tokens=/g, 'max_output_tokens=')
      .replace(/^\s*response_format=\{"type": "json_object"\},\n/gm, '')
      .replace(/model="gpt-4o(?:-mini)?"/g, 'model="gpt-5.6"')

    if (next !== source) {
      await fs.writeFile(filePath, next)
      changed += 1
    }
  }
  console.log(`Current API migration updated ${changed}/${files.length} documents.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
