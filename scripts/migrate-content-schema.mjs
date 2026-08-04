#!/usr/bin/env node

import process from 'node:process'

console.error(
  'This one-time migration is retired after identity baseline v1. ' +
    'Edit knowledge-system/documents.yml and page frontmatter together, then run npm run docs:identity.'
)
process.exitCode = 1
