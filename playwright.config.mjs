import { defineConfig, devices } from '@playwright/test'

const testPort = Number.parseInt(process.env.MKD_TEST_PORT || '4174', 10)
const testBaseUrl = `http://127.0.0.1:${testPort}/Kb2Agent/`

export default defineConfig({
  testDir: './tests/site',
  testIgnore: ['distill-public-p9.spec.mjs', 'mermaid-hydration.spec.mjs'],
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: testBaseUrl,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['distill-public-p9.spec.mjs', 'mermaid-hydration.spec.mjs', 'performance.spec.mjs'],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'chromium-performance',
      testMatch: ['performance.spec.mjs'],
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `npm run docs:dev -- --host 127.0.0.1 --port ${testPort}`,
    url: testBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000
  }
})
