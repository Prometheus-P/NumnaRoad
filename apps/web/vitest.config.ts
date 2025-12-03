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
    environmentMatchGlobs: [
      // Use node for non-component tests
      ['tests/unit/*.test.ts', 'node'],
      ['tests/contract/**', 'node'],
      ['tests/integration/**', 'node'],
      // Use jsdom for component tests
      ['tests/unit/components/**', 'jsdom'],
      ['tests/e2e/**', 'jsdom'],
    ],
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
