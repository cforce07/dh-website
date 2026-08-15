#!/usr/bin/env node
/**
 * Runs axe-core against the BUILT homepage and fails on any violation.
 *
 * Design spec §9 requires "axe runs against the homepage in CI". The
 * @axe-core/cli devDependency was installed but nothing ever invoked it,
 * so the requirement was declared and not met. This script is the
 * invocation; .github/workflows/ci.yml calls it via `npm run axe`.
 *
 * Why a script rather than a bare `npx axe <url>` step:
 *
 *   1. axe drives a real browser against a real URL, so the built output
 *      needs serving. It must be the BUILT output, not `astro dev` — dev
 *      injects a toolbar and serves unbundled CSS, so it is not what
 *      ships. A `file://` URL is not an option either: Astro emits
 *      absolute asset paths (/_astro/...), which resolve to nothing under
 *      file://, and a page with no stylesheet would silently pass every
 *      colour-contrast rule for the wrong reason.
 *   2. Starting a server, waiting for it, running the audit and shutting
 *      down cleanly on every exit path is more shell than a workflow step
 *      should carry — and has to work on Windows locally as well as
 *      ubuntu-latest in CI.
 *
 * Astro's programmatic `preview()` serves dist/ exactly as built. No new
 * dependency is introduced: astro, @axe-core/cli and its bundled
 * chromedriver are all already present.
 *
 * Exit code is axe's own: non-zero on any violation (via `--exit`), which
 * fails the CI job. Usage:
 *
 *   npm run build:dev && npm run axe
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { preview } from 'astro'

const require = createRequire(import.meta.url)

// Fixed port: the audited URL is echoed into CI logs, and a random port
// would make that output non-reproducible for no benefit.
const PORT = 4321

if (!existsSync('dist/index.html')) {
  console.error('\nNo dist/index.html found. Run "npm run build:dev" first.\n')
  process.exit(1)
}

const server = await preview({
  root: process.cwd(),
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'error',
})

const url = `http://127.0.0.1:${PORT}/`
console.log(`axe: auditing ${url}`)

const axeBin = require.resolve('@axe-core/cli/dist/src/bin/cli.js')

const exitCode = await new Promise((resolve) => {
  const child = spawn(
    process.execPath,
    [
      axeBin,
      url,
      // Fail the process on any violation. Without this axe reports and
      // exits 0, which would make the CI step decorative.
      '--exit',
      // WCAG 2.1 A + AA — the level the design spec's §9 budget is
      // written against. Not "everything axe knows", which includes
      // best-practice rules that are advisory rather than conformance.
      '--tags',
      'wcag2a,wcag2aa,wcag21a,wcag21aa',
      // Required for Chrome under a container/CI user; harmless locally.
      '--chrome-options',
      'no-sandbox,disable-dev-shm-usage,disable-gpu',
    ],
    { stdio: 'inherit' },
  )
  child.on('exit', (code) => resolve(code ?? 1))
  child.on('error', (error) => {
    console.error(error)
    resolve(1)
  })
})

await server.stop()
process.exit(exitCode)
