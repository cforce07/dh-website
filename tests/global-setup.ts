/**
 * Builds the site ONCE, before any test file is collected.
 *
 * WHY THIS EXISTS. Three suites now assert against the real build output —
 * tests/links.test.ts, tests/compliance-gate.test.ts and tests/pages.test.ts
 * — and a fourth (tests/content.test.ts) reads dist/pricing/index.html for
 * the drift guard. Until now each build-driven suite ran `npm run build:dev`
 * in its own `beforeAll`, and because they all write to the same `dist/`,
 * vitest.config.ts had to set `fileParallelism: false` so the second build
 * could not wipe the directory the first was mid-way through emitting.
 *
 * That config comment promised a shared globalSetup "when a third suite
 * needs dist/". This is that third suite. The promise is kept here.
 *
 * WHAT IT BUYS. One build instead of N, and the serialisation flag can go:
 * with nobody writing to dist/ during the run, the suites only read it, so
 * there is no race left to serialise away. Measured on this machine:
 *
 *   before — 2 in-suite builds, fileParallelism: false   18.0s
 *   after  — 1 globalSetup build, parallelism restored    9.6s
 *
 * build:dev, not build. `npm run build` pipes through scripts/check-tbd.mjs,
 * which fails while any <Tbd> placeholder is still in the rendered output.
 * The test suite must be able to inspect dist/ regardless of the client's
 * outstanding-information state; pinning it to `build` would couple every
 * build-driven assertion to that state. Same reasoning the two `beforeAll`
 * blocks carried before they were replaced by this file.
 *
 * ORDERING GUARANTEE. vitest runs globalSetup to completion before it
 * collects any test file, so a suite may safely read dist/ at collection
 * time (tests/pages.test.ts generates one `it` per built page that way).
 * The lesson recorded in tests/compliance-gate.test.ts — that a
 * collection-time read of dist/ saw the PREVIOUS run's build, because
 * collection happens before `beforeAll` — is what made that unsafe before;
 * moving the build ahead of collection is precisely what fixes it. That
 * suite still reads dist/ inside each `it` anyway: it costs nothing, and it
 * keeps the guard correct even if this file is ever removed.
 */
import { execSync } from 'node:child_process'

export default function setup(): void {
  execSync('npm run build:dev', { stdio: 'inherit' })
}
