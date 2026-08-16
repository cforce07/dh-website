import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    /*
     * ONE build, before anything is collected. See tests/global-setup.ts for
     * the full reasoning.
     *
     * This replaces `fileParallelism: false`, which was here because two
     * suites each ran `npm run build:dev` in their own `beforeAll` and both
     * wrote to the same `dist/` — run in parallel, the second build wiped
     * the directory the first was mid-way through emitting and the losing
     * suite died on an ENOENT inside Astro's own writer. That comment
     * promised a shared globalSetup "when a third suite needs dist/".
     * tests/pages.test.ts is the third, so the promise is kept rather than
     * restated.
     *
     * With the build hoisted here, no test process writes to dist/ at all —
     * they only read it — so the race the flag suppressed no longer exists
     * and file parallelism is back at vitest's default.
     *
     * Measured on the same 15 files: 18.0s before (one run), 8.6–9.1s after
     * (five runs). An independent reviewer measured 8.84s and 8.91s. Quote
     * the range, not a single figure — three different numbers appeared in
     * three places in the first version of this change.
     */
    globalSetup: ['./tests/global-setup.ts'],
  },
})
