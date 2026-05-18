import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5175',
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    trace: 'on-first-retry',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npx vite --port 5174 --host 0.0.0.0',
    port: 5175,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
