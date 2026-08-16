import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    /*
     * Test FILES run one at a time, never in parallel.
     *
     * Two suites — tests/links.test.ts and tests/compliance-gate.test.ts —
     * assert against the real build output, and each runs
     * `npm run build:dev` in its own `beforeAll`. Both write to the same
     * `dist/`. Run in parallel (vitest's default), the second build wipes
     * and re-creates the directory the first one is mid-way through
     * emitting, and the losing suite dies on an ENOENT inside Astro's own
     * writer. That is a race, not a flake: it surfaced the moment a second
     * build-driven suite existed, and it would come back for the third.
     *
     * The alternative — a shared globalSetup that builds once — is the
     * better long-term shape, and is worth doing when a third suite needs
     * dist/. It is not done here because it would move the build out of
     * two suites this task does not own. Serialising costs one extra
     * ~2.5s build on a suite that runs in well under a minute.
     */
    fileParallelism: false,
  },
})
