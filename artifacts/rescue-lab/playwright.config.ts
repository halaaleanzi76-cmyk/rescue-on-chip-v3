import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the REAL running platform (start it first with start.ps1).
 * Uses the system Microsoft Edge (preinstalled on Windows 11), so no browser download is needed.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1440, height: 900 } }, testIgnore: /mobile.spec.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'msedge' }, testMatch: /mobile\.spec\.ts/ },
  ],
});
