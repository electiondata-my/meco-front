import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isSurgical = Object.keys(process.env).some((k) => k.startsWith('POST_TO_BUILD'));

const surgicalMerge = {
  name: 'surgical-merge',
  hooks: {
    'astro:build:done': () => {
      execSync('rsync -a dist-surgical/ dist/');
      console.log('[surgical-merge] Merged dist-surgical/ into dist/');
    },
  },
};

export default defineConfig({
  output: 'static',
  site: 'https://electiondata.my',
  outDir: isSurgical ? './dist-surgical' : './dist',
  build: {
    concurrency: 20,
  },
  integrations: [
    ...(isSurgical ? [surgicalMerge] : []),
    react(),
    mdx(),
    // applyBaseStyles: false — globals.css already imports Tailwind directives
    tailwind({ applyBaseStyles: false }),
    sitemap({
      i18n: {
        defaultLocale: 'en-GB',
        locales: { 'en-GB': 'en-GB', 'ms-MY': 'ms-MY' },
      },
    }),
  ],
  i18n: {
    defaultLocale: 'en-GB',
    locales: ['en-GB', 'ms-MY'],
    routing: { prefixDefaultLocale: false }, // English at /, Malay at /ms-MY/
  },
  vite: {
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, 'src'),
        '@layouts': path.resolve(__dirname, 'src/layouts'),
        '@i18n': path.resolve(__dirname, 'src/i18n'),
        '@charts': path.resolve(__dirname, 'src/components/Charts'),
        '@components': path.resolve(__dirname, 'components'),
        '@tools': path.resolve(__dirname, 'src/components/tools'),
        '@data-catalogue': path.resolve(__dirname, 'data-catalogue'),
        '@hooks': path.resolve(__dirname, 'hooks'),
        '@icons': path.resolve(__dirname, 'icons'),
        '@lib': path.resolve(__dirname, 'lib'),
      },
    },
    ssr: {
      noExternal: ['mapbox-gl', 'react-map-gl'],
    },
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'], // Prevents Vite worker resolution error
    },
    server: {
      proxy: {
        '/api/auth': {
          target: 'https://auth.electiondata.my',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/auth/, ''),
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  },
});
