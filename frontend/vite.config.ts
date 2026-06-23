import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const backend = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': backend,
      '/games': backend,
    },
  },
  preview: {
    // Safety net if preview is used without the unified backend server
    proxy: {
      '/api': backend,
      '/games': backend,
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
