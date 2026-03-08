import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // Exclude the golden-file generator from the default test run.
    // To regenerate: npm run generate:golden
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '.claude/worktrees/**',
      'tests/golden/generate.test.js',
    ],
  },
});
