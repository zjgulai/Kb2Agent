import { defineConfig, devices } from '@playwright/test'

const expectedOrigin = 'https://distill.lute-tlz-dddd.top'
const publicOrigin = process.env.MKD_DISTILL_PUBLIC_ORIGIN
if (!publicOrigin) throw new Error('MKD_DISTILL_PUBLIC_ORIGIN is required; public P9 never falls back to a local or arbitrary target')
if (publicOrigin.replace(/\/$/, '') !== expectedOrigin) throw new Error(`public P9 target must be exactly ${expectedOrigin}`)
const evidenceRoot = process.env.MKD_DISTILL_P9_EVIDENCE_ROOT || 'output/playwright/mkd-distill-p9'
const allowedEvidenceRoots = new Set([
  'output/playwright/mkd-distill-p9',
  'output/playwright/mkd-distill-g4r5'
])
if (!allowedEvidenceRoots.has(evidenceRoot)) throw new Error(`unsupported public P9 evidence root: ${evidenceRoot}`)

export default defineConfig({
  testDir: './tests/site',
  testMatch: 'distill-public-p9.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: `${evidenceRoot}/results.json` }]
  ],
  outputDir: `${evidenceRoot}/artifacts`,
  use: {
    baseURL: `${expectedOrigin}/Kb2Agent/`,
    ignoreHTTPSErrors: false,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    { name: 'chromium-public-p9', use: { ...devices['Desktop Chrome'] } }
  ]
})
