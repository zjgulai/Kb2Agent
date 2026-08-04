#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const host = '127.0.0.1'
const port = 4176
const baseUrl = `http://${host}:${port}/Kb2Agent/`
const threshold = 0.95
const targets = [
  { name: 'home', url: baseUrl },
  { name: 'security', url: `${baseUrl}knowledge/05-security-compliance` }
]
const outputDir = path.resolve('artifacts', 'lighthouse')

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForPreview(server, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Local preview exited early with code ${server.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await wait(250)
  }
  throw new Error(`Timed out waiting for ${baseUrl}`)
}

async function stopProcess(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    wait(3_000)
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  const previewScript = path.resolve('scripts', 'preview-local.mjs')
  const server = spawn(
    process.execPath,
    [previewScript, '--host', host, '--port', String(port)],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  let previewOutput = ''
  server.stdout.on('data', (chunk) => { previewOutput += chunk.toString() })
  server.stderr.on('data', (chunk) => { previewOutput += chunk.toString() })

  let chrome
  try {
    await waitForPreview(server)
    chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu']
    })

    const summary = []
    for (const target of targets) {
      const result = await lighthouse(target.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['accessibility'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          disabled: false
        }
      })
      if (!result?.lhr) throw new Error(`Lighthouse produced no report for ${target.url}`)

      const score = result.lhr.categories.accessibility.score ?? 0
      const failedAudits = Object.values(result.lhr.audits)
        .filter((audit) => audit.score !== null && audit.score < 1 && (audit.scoreDisplayMode === 'binary' || audit.scoreDisplayMode === 'numeric'))
        .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score }))

      await fs.writeFile(
        path.join(outputDir, `${target.name}.report.json`),
        JSON.stringify(result.lhr, null, 2)
      )
      summary.push({ name: target.name, url: target.url, score, failedAudits })
    }

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      `${JSON.stringify({ threshold, targets: summary }, null, 2)}\n`
    )

    for (const result of summary) {
      const percentage = Math.round(result.score * 100)
      console.log(`Lighthouse accessibility ${result.name}: ${percentage}`)
      if (result.score < threshold) {
        throw new Error(
          `${result.name} accessibility score ${percentage} is below ${Math.round(threshold * 100)}`
        )
      }
      if (result.failedAudits.length > 0) {
        throw new Error(
          `${result.name} has failed Lighthouse accessibility audits: ${result.failedAudits.map(({ id }) => id).join(', ')}`
        )
      }
    }
  } catch (error) {
    if (previewOutput.trim()) console.error(previewOutput.trim())
    throw error
  } finally {
    if (chrome) await chrome.kill()
    await stopProcess(server)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
