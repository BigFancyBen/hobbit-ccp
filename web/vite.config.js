import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to real mini PC during local dev
      '/api': {
        target: 'http://192.168.0.67',
        changeOrigin: true
      }
    }
  }
});
