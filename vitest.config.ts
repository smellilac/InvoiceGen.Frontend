import { defineConfig } from 'vitest/config';

// Under WSL the default `forks` pool hangs with "Timeout waiting for worker to
// respond" (the builder ignores the VITEST_POOL env var), so pin the thread
// pool here where it's actually honored.
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
  },
});
