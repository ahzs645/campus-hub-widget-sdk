import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom throughout: most of the SDK touches the DOM, and the build-time
    // plugin tests use node: builtins, which work the same either way.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
