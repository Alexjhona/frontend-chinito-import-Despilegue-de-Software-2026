import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const localChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromiumExecutable = process.env['CHROME_BIN'] || (existsSync(localChrome) ? localChrome : undefined);
const ciRun = Boolean(process.env['CI'] || process.env['JENKINS_URL']);
const externalServer = process.env['E2E_EXTERNAL_SERVER'] === '1';
const defaultFfmpeg = process.env['LOCALAPPDATA']
  ? join(process.env['LOCALAPPDATA'], 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-win64.exe')
  : undefined;
const localFfmpeg = join(__dirname, 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-win64.exe');
const hasFfmpeg = Boolean(ciRun || existsSync(localFfmpeg) || (defaultFfmpeg && existsSync(defaultFfmpeg)));

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  forbidOnly: ciRun,
  retries: ciRun ? 1 : 0,
  workers: ciRun ? 1 : undefined,
  reporter: ciRun ? [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['list'],
  ] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: hasFfmpeg ? 'retain-on-failure' : 'off',
    launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
  },
  webServer: externalServer ? undefined : {
    command: 'npx ng serve --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !ciRun,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
