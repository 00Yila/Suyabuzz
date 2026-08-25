// Used by `npm test` (unit tests, node environment). Integration tests use
// vitest.config.mts instead (`npm run test:int`), which needs jsdom + React
// plugin setup that would slow down and complicate this config.
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
