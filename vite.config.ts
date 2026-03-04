import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const repository = process.env.GITHUB_REPOSITORY;
  const repoName = repository?.split('/')[1];
  // 在 GitHub Actions 生产构建时自动使用仓库子路径，避免 Pages 上静态资源 404。
  const pagesBasePath =
    mode === 'production' && process.env.GITHUB_ACTIONS === 'true' && repoName
      ? `/${repoName}/`
      : '/';
  return {
    base: env.VITE_BASE_PATH || pagesBasePath,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
