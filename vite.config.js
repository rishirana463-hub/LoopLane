import { readFile, readdir } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const lessonDirectory = new URL('./src/data/', import.meta.url);

// Emit the same curriculum used by React, rather than maintaining a public copy.
function lessonJSON() {
  return {
    name: 'looplane-lesson-json',
    async generateBundle() {
      const files = (await readdir(lessonDirectory)).filter(name => name.endsWith('.json'));
      for (const name of files) {
        const source = await readFile(new URL(name, lessonDirectory), 'utf8');
        JSON.parse(source);
        this.emitFile({ type: 'asset', fileName: `data/${name}`, source });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const match = request.url?.split('?')[0].match(/^\/data\/([a-z0-9_-]+\.json)$/i);
        if (!match) return next();
        try {
          const files = await readdir(lessonDirectory);
          if (!files.includes(match[1])) return next();
          const source = await readFile(new URL(match[1], lessonDirectory), 'utf8');
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
      includeAssets: ['logo.svg', 'fonts/nunito-variable.ttf'],
      manifest: {
        id: '/',
        name: 'Looplane — learn to code',
        short_name: 'Looplane',
        description: 'Build a coding habit with short, playful lessons.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#19172e',
        background_color: '#19172e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2,wav}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(?:api|auth|rest|functions|storage|_vercel)(?:\/|$)/],
        cleanupOutdatedCaches: true,
        // Only build assets are precached. API calls, Supabase responses,
        // and learner code receive no runtime cache route.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
