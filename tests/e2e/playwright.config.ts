import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
require('dotenv').config()
var crypto = require("crypto");
var id = crypto.randomUUID();

export const TEST_EMAIL = ((process.env.ENVIRONMENT ?? 'local') + "-" + id) + '@e2e.test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const browsers = [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
    },
  },
]
process.env.CI && browsers.push({
  name: 'firefox',
  use: {
    ...devices['Desktop Firefox'],
  },
})
const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 180 * 1000,
  expect: {
    timeout: 120 * 1000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    actionTimeout: 0,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: browsers,

  outputDir: 'playwright-test-output/',
  maxFailures: 0,
};

export default config;
