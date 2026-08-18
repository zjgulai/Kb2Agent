import { defineConfig, devices } from '@playwright/test'

const testPort = Number.parseInt(process.env.MKD_HYDRATION_TEST_PORT || '4176', 10)
const testBaseUrl = `http://127.0.0.1:${testPort}/Kb2Agent/`

export default defineConfig({
  testDir: './tests/site',
  testMatch: 'mermaid-hydration.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [['list']],
  outputDir: 'output/playwright/mermaid-hydration/artifacts',
  use: {
    baseURL: testBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    { name: 'chromium-built-preview', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: `npm run docs:build && npm run docs:preview -- --host 127.0.0.1 --port ${testPort}`,
    url: testBaseUrl,
    reuseExistingServer: false,
    timeout: 180_000
  }
})
