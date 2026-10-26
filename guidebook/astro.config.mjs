// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hamkor-guidebook.vercel.app',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Pin Vite to this project's tsconfig so it never picks up the parent site's one.
  vite: { tsconfig: './tsconfig.json' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
