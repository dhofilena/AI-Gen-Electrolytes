import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public-stage',
  server: {
    port: 5273,
    host: true,
    fs: { strict: false },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 2048,
  },
});
