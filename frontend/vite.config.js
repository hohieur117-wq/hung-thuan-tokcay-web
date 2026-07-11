import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  esbuild: {
    charset: 'utf8'
  }
});
