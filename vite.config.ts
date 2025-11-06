/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.{js,ts}', '**/coverage/**'],
    },
    // Handle sql.js WASM loading in test environment
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/pages': '/src/pages',
      '@/modules': '/src/modules',
      '@/utils': '/src/utils',
      '@/workers': '/src/workers',
      '@/stores': '/src/stores',
      '@/types': '/src/types',
      '@/hooks': '/src/hooks',
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  define: {
    global: 'globalThis',
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  assetsInclude: ['**/*.wasm'],
});
