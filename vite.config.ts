import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对路径，确保在根目录和子目录下（如 GitHub Pages）都能正确加载资源
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    host: true,
  },
});
