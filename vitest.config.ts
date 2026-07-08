import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Unit tests cover the pure, framework-free business logic (pose math,
 * smoothing, rep-counting state machines, exercise detection, statistics).
 * These modules never import React Native, so they run in a plain Node
 * environment with no native mocking required.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
