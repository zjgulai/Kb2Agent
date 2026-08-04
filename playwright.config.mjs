import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/site',
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174/Kb2Agent/',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run docs:dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/Kb2Agent/',
    reuseExistingServer: false,
    timeout: 120_000
  }
})
