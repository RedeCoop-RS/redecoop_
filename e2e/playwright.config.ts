import { defineConfig } from '@playwright/test'

const blog = process.env.E2E_SUITE === 'blog'

export default defineConfig({
  testDir: './tests',
  testMatch: blog ? '**/blog/**/*.spec.ts' : '**/*.spec.ts',
  testIgnore: blog ? undefined : '**/blog/**',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.DASHBOARD_URL || 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
})
