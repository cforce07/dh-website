/// <reference types="vitest/config" />
/*
 * THE REFERENCE ABOVE IS LOAD-BEARING, added 2026-08-17 with the typecheck
 * script.
 *
 * `getViteConfig` is typed to take Vite's `UserConfig`, which has no `test`
 * key — that key exists because Vitest AUGMENTS Vite's config type, and the
 * augmentation only loads if something references it. Without this line
 * `npm run typecheck` reports
 *
 *   ts(2353) Object literal may only specify known properties, and 'test'
 *            does not exist in type 'UserConfig'
 *
 * on the whole block below. It is the correct fix, not a suppression: the
 * `test` key really is valid here, and this is what tells the compiler so.
 * A `@ts-expect-error` or a cast would have hidden every future typo in this
 * file's options along with it.
 */
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
