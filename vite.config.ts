import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

const isVitest = Boolean(process.env.VITEST);

export default defineConfig({
  plugins: [
    react(),
    ...(isVitest
      ? []
      : [
          electron([
            {
              entry: 'src/main/index.ts',
              vite: {
                build: {
                  outDir: 'dist-electron/main',
                  rollupOptions: {
                    external: ['electron'],
                  },
                },
              },
            },
            {
              entry: 'src/main/preload.ts',
              onstart(args) {
                args.reload();
              },
              vite: {
                build: {
                  outDir: 'dist-electron/preload',
                  lib: {
                    entry: 'src/main/preload.ts',
                    formats: ['cjs'],
                    fileName: () => 'preload.cjs',
                  },
                  rollupOptions: {
                    external: ['electron'],
                  },
                },
              },
            },
          ]),
          renderer(),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/tests/**',
        'src/renderer/main.tsx',
        'src/renderer/types/**',
        'src/main/index.ts',
        'src/main/preload.ts',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
});
