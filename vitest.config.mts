import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { fumadocsMdx } from 'fumadocs-mdx/vite';

export default defineConfig({
  plugins: [fumadocsMdx({
    outDir: '.source/vitest',
    index: false,
    macro: { include: ['lib/source.ts'] },
  })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'proxy.ts'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', '**/*.d.ts'],
      reportsDirectory: 'coverage/site',
      reporter: ['json', 'text-summary'],
    },
  },
});
