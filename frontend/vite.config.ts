import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const backendPort = process.env.GAME_GALAXY_BACKEND_PORT || '8000';
const backend = `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
