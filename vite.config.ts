import { defineConfig } from 'vite';

const repoName = 'vibe-vampsuv';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? `/${repoName}/` : '/',
  server: {
    port: 5173
  }
}));
