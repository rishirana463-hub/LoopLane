import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const lessonSource = new URL('./src/data/lessons.json', import.meta.url);

// Emit the same curriculum used by React, rather than maintaining a public copy.
function lessonJSON() {
  return {
    name: 'looplane-lesson-json',
    async generateBundle() {
      const source = await readFile(lessonSource, 'utf8');
      JSON.parse(source);
      this.emitFile({ type: 'asset', fileName: 'data/lessons.json', source });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/data/lessons.json') return next();
        try {
          const source = await readFile(lessonSource, 'utf8');
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(source);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  build: {
    rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
      { name: 'motion', test: /node_modules[\\/](?:framer-motion|motion-dom|motion-utils)[\\/]/ },
      { name: 'cloud', test: /node_modules[\\/]@supabase[\\/]/ },
    ] } } },
  },
  plugins: [
    react(),
    tailwindcss(),
    lessonJSON(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['logo.svg'],
      manifest: {
        id: '/',
        name: 'Looplane — learn to code',
        short_name: 'Looplane',
        description: 'Build a coding habit with short, playful lessons.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#6845db',
        background_color: '#faf8f3',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2,wav}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(?:api|auth|rest|functions|storage)(?:\/|$)/],
        cleanupOutdatedCaches: true,
        // Only build assets are precached. API calls, Supabase responses,
        // and learner code receive no runtime cache route.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
