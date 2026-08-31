/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text'], // Prints a beautiful clean ASCII table straight to your console
      include: ['src/**/*'],
      exclude: [
        'src/test/**',
        'src/**/*.test.tsx',
        'src/types.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.css',        // Filters out CSS files from logic tracking
        'src/assets/**'        // Filters out images, icons, and SVGs
      ],
    },
  },
});
