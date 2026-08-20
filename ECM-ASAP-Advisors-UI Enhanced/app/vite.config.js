import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/core-api': {
        target: 'https://core-api.pucho.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/core-api/, ''),
      },
    },
  },
});