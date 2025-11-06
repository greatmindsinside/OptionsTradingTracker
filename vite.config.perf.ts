/**
 * Performance Optimization Configuration
 * Simple and effective performance settings for Vite
 */

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  // Build optimizations
  build: {
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',

    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'data-vendor': ['@sqlite.org/sqlite-wasm'],
          'utils-vendor': ['zod', 'date-fns'],
        },
      },
    },

    // Use terser for minification
    minify: 'terser',

    // Optimize bundle size
    target: 'es2020',
    cssCodeSplit: true,

    // Asset optimization
    assetsInlineLimit: 4096,

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Development optimizations
  server: {
    hmr: {
      overlay: true,
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'zod', 'date-fns'],
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },

  // CSS optimizations
  css: {
    modules: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    devSourcemap: true,
  },
});
