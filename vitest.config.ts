import { defineConfig } from 'vitest/config';

// Unit tests for src/roadmap/ (system-template ARCHITECTURE.md §4): pure logic runs in Node, no browser.
// Page-level end-to-end tests stay in tests/*.mjs and run against the built page.
export default defineConfig({
  test: {
    name: 'roadmap',
    environment: 'node',
    include: ['tests/roadmap/**/*.test.ts'],
  },
});
