import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
