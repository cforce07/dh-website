#!/usr/bin/env node
/**
 * Runs axe-core against EVERY built page and fails on any violation.
 *
 * Core-pages design spec §6 requires "axe at zero violations" across all
 * seven pages. Until Task 5 this script hardcoded a single URL —
 * `http://127.0.0.1:4321/` — so `npm run axe` audited the homepage and
 * nothing else. Both /pricing axe runs to that point had been driven by
 * hand, which means CI was not enforcing what the task reports claimed, and
 * the gap would have widened silently with every page added. The page list
 * is now derived from dist/, so the five pages landing next week are audited
 * the moment they exist and nobody has to remember to add them.
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
 *   3. The page list has to be computed, and computing it in the workflow
 *      would put it somewhere `npm run axe` locally could not reach.
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
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { preview } from 'astro'

const require = createRequire(import.meta.url)

// Fixed port: the audited URLs are echoed into CI logs, and a random port
// would make that output non-reproducible for no benefit.
const PORT = 4321

if (!existsSync('dist/index.html')) {
  console.error('\nNo dist/index.html found. Run "npm run build:dev" first.\n')
  process.exit(1)
}

/**
 * Every route in dist/, derived — never a hardcoded list. A hardcoded list
 * stops covering new pages without failing anything, which is the exact
 * defect this rewrite exists to remove.
 *
 * dist/index.html → "/", dist/pricing/index.html → "/pricing/". Astro's
 * default `directory` build format emits one index.html per route, so
 * dropping the filename gives the served path.
 */
function builtRoutes() {
  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })

  return walk('dist')
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.replace(/^dist/, '').replace(/index\.html$/, ''))
    .sort()
}

const routes = builtRoutes()

// A zero-page audit exits 0 and reports nothing — green for the worst
// possible reason on a step whose whole job is to find violations.
if (routes.length === 0) {
  console.error('\naxe: no HTML pages found under dist/. Nothing was audited.\n')
  process.exit(1)
}

const server = await preview({
  root: process.cwd(),
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'error',
})

const urls = routes.map((route) => `http://127.0.0.1:${PORT}${route}`)
console.log(`axe: auditing ${urls.length} page(s)`)
for (const url of urls) console.log(`  ${url}`)

const axeBin = require.resolve('@axe-core/cli/dist/src/bin/cli.js')

// One invocation for all URLs: the CLI takes `<url...>` variadically and
// reuses a single chromedriver session across them, which matters because
// starting the driver is most of the wall time. It still reports and exits
// per the whole run, so `--exit` fails the process if ANY page violates.
const exitCode = await new Promise((resolve) => {
  const child = spawn(
    process.execPath,
    [
      axeBin,
      ...urls,
      // Fail the process on any violation. Without this axe reports and
      // exits 0, which would make the CI step decorative.
      '--exit',
      // WCAG 2.1 A + AA — the level the design spec's budget is written
      // against. Not "everything axe knows", which includes best-practice
      // rules that are advisory rather than conformance.
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
