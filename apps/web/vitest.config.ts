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
