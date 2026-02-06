import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.0.67',
        changeOrigin: true
      },
      '/netdata': {
        target: 'http://192.168.0.67:19999',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/netdata/, '/api/v1')
      }
    }
  }
});
