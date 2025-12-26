import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  test: {
    root: rootDir,
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Playwright E2E tests should be run separately with `npx playwright test`
      'tests/e2e/customer-order-tracking.test.ts',
    ],
    // Environment options are configured per test file using vitest directives
    // @vitest-environment jsdom or @vitest-environment node
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@services': path.resolve(rootDir, 'services'),
    },
  },
});
