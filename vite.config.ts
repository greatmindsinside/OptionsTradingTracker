import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/pages': '/src/pages',
      '@/modules': '/src/modules',
      '@/utils': '/src/utils',
      '@/workers': '/src/workers',
    },
  },
  define: {
    global: 'globalThis',
  },
});
