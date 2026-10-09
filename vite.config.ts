import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Make sure only one copy of these libraries is ever loaded.
    dedupe: ['react', 'react-dom', 'three'],
  },
  optimizeDeps: {
    // Pre-bundle the 3D stack up front so Vite does not re-optimise it mid-load,
    // which is what caused the "504 Outdated Optimize Dep" error in development.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'zustand',
    ],
  },
  build: {
    target: 'es2020',
    // three.js alone is large; this stops a harmless size warning for this prototype.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
