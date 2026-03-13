import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署路径为 /jiumen-rpg/
  base: '/jiumen-rpg/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    host: true,
  },
});
