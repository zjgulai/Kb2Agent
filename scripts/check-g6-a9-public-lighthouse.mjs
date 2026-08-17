#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const expectedOrigin = 'https://distill.lute-tlz-dddd.top'
const publicOrigin = process.env.MKD_DISTILL_PUBLIC_ORIGIN?.replace(/\/$/, '')
if (!publicOrigin) throw new Error('MKD_DISTILL_PUBLIC_ORIGIN is required; G6-A9 Lighthouse never falls back to a local target')
if (publicOrigin !== expectedOrigin) throw new Error(`G6-A9 Lighthouse target must be exactly ${expectedOrigin}`)

const expectedRelease = 'mkd-m1c-438e6ae583fc952d'
if (process.env.MKD_DISTILL_EXPECTED_RELEASE !== expectedRelease) throw new Error(`G6-A9 Lighthouse release must be exactly ${expectedRelease}`)
const runsPerTarget = 3
const targets = [
  { name: 'home', url: `${expectedOrigin}/Kb2Agent/` },
  { name: 'lab', url: `${expectedOrigin}/Kb2Agent/lab/` }
]
const thresholds = {
  performance: 0.90,
  accessibility: 0.95,
  'best-practices': 0.95
}
const evidenceRoot = process.env.MKD_DISTILL_P9_EVIDENCE_ROOT
const expectedEvidenceRoot = 'output/playwright/mkd-distill-g6a9'
if (evidenceRoot !== expectedEvidenceRoot) throw new Error(`G6-A9 Lighthouse evidence root must be exactly ${expectedEvidenceRoot}`)
const outputRoot = path.resolve(evidenceRoot, 'lighthouse')

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function main() {
  await fs.mkdir(outputRoot, { recursive: true })
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu']
  })
  try {
    const summary = []
    for (const target of targets) {
      const runs = []
      for (let run = 1; run <= runsPerTarget; run += 1) {
        const result = await lighthouse(target.url, {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: Object.keys(thresholds),
          formFactor: 'mobile',
          screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
        })
        if (!result?.lhr) throw new Error(`Lighthouse produced no report for ${target.url}`)
        const scores = Object.fromEntries(Object.keys(thresholds).map((category) => [category, result.lhr.categories[category]?.score ?? 0]))
        runs.push({ run, scores })
        await fs.writeFile(path.join(outputRoot, `${target.name}-run-${run}.report.json`), JSON.stringify(result.lhr, null, 2), { flag: 'wx' })
      }
      const medians = Object.fromEntries(Object.keys(thresholds).map((category) => [category, median(runs.map(({ scores }) => scores[category]))]))
      summary.push({ ...target, runs, medians })
    }
    const receipt = {
      schemaVersion: 1,
      receiptId: 'MKD-DISTILL-G6A9-PUBLIC-LIGHTHOUSE',
      targetOrigin: expectedOrigin,
      releaseId: expectedRelease,
      runsPerTarget,
      thresholds,
      targets: summary
    }
    await fs.writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
    for (const target of summary) {
      for (const [category, threshold] of Object.entries(thresholds)) {
        const score = target.medians[category]
        console.log(`${target.name} ${category} median: ${Math.round(score * 100)}`)
        if (score < threshold) throw new Error(`${target.name} ${category} median ${Math.round(score * 100)} is below ${Math.round(threshold * 100)}`)
      }
    }
  } finally {
    await chrome.kill()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
