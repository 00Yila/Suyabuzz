// Used by `npm run test:int` (integration tests, jsdom environment, needs the
// React plugin). Unit tests use vitest.config.ts instead (`npm test`), which
// stays lean by not carrying jsdom/React overhead.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
