import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'app/renderer'),
  publicDir: path.join(__dirname, 'assets'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app'),
      '@renderer': path.resolve(__dirname, 'app/renderer'),
      '@main': path.resolve(__dirname, 'app/main'),
      '@preload': path.resolve(__dirname, 'app/preload'),
      '@services': path.resolve(__dirname, 'app/services'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true,
  },
});