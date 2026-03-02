// Vitest config for the golden-file generator only.
// Used by: npm run generate:golden
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/golden/generate.test.js'],
  },
});
