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
 *
 * WHY THERE IS A PREFLIGHT BEFORE AXE RUNS (fix round 1, F-3).
 *
 * `@axe-core/cli` cannot distinguish "this page is clean" from "there was
 * nothing to audit". Pointed at a URL nothing is serving, it prints
 * `0 violations found!` and exits 0 — verified. So the audit's green is
 * only worth what the URL is worth, and two things could make the URL
 * wrong:
 *
 *   1. Astro's `preview()` falls back to another port when the requested
 *      one is taken ("Port 4321 is in use, trying another one..."), and the
 *      returned server object was observed still reporting 4321. So the
 *      port cannot simply be assumed, and cannot be fully trusted even when
 *      read back off the server.
 *   2. Anything else already on that port — a stale dev server, a proxy
 *      answering 404 — would be audited instead, cleanly and silently, and
 *      the whole of spec §6 would report green against someone else's page.
 *
 * So each URL is fetched first and must answer 200 with the exact <title>
 * of the dist/ file it is supposed to be serving. That is a marker only our
 * build of that specific route can produce: it catches a squatter, a
 * fallback port, and a route that resolves to the wrong page. This is the
 * same class of defect as the compliance gate reading a stale build — a
 * check reporting on something other than what it claims to check.
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { preview } from 'astro'

const require = createRequire(import.meta.url)

// Preferred port: the audited URLs are echoed into CI logs, and a random
// port would make that output non-reproducible for no benefit. It is a
// PREFERENCE, not an assumption — see the preflight below.
const PREFERRED_PORT = 4321

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
 * dropping the filename gives the served path. Each route carries the
 * <title> of the file it came from, which the preflight uses as the marker
 * proving the server is serving OUR build of THAT page.
 */
function builtPages() {
  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })

  return walk('dist')
    .filter((file) => file.endsWith('.html'))
    .map((file) => {
      const html = readFileSync(file, 'utf8')
      const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? null
      return {
        file,
        route: file.replace(/^dist/, '').replace(/index\.html$/, ''),
        title,
      }
    })
    .sort((a, b) => a.route.localeCompare(b.route))
}

const pages = builtPages()

// A zero-page audit exits 0 and reports nothing — green for the worst
// possible reason on a step whose whole job is to find violations.
if (pages.length === 0) {
  console.error('\naxe: no HTML pages found under dist/. Nothing was audited.\n')
  process.exit(1)
}

// A page with no <title> gives the preflight no marker to check, so the
// audit of that page would be back to trusting the URL. Fail loudly rather
// than quietly downgrading the guarantee for one page.
const untitled = pages.filter((page) => !page.title?.trim())
if (untitled.length > 0) {
  console.error(
    `\naxe: no <title> in ${untitled.map((p) => p.file).join(', ')} — nothing to verify the served page against.\n`,
  )
  process.exit(1)
}

const server = await preview({
  root: process.cwd(),
  server: { port: PREFERRED_PORT, host: '127.0.0.1' },
  logLevel: 'error',
})

// Read the port back off the server rather than assuming the requested one
// was granted. Belt and braces: this has been observed to report the
// REQUESTED port after Astro fell back to a different one, which is exactly
// why the preflight below does not trust it either.
const port = server.port ?? PREFERRED_PORT
const origin = `http://127.0.0.1:${port}`

/**
 * Prove each URL serves the page we think it does, before axe is told it is
 * clean. 200 plus the exact <title> from the corresponding dist/ file.
 */
async function preflight() {
  const failures = []
  for (const page of pages) {
    const url = `${origin}${page.route}`
    let response
    try {
      response = await fetch(url)
    } catch (error) {
      failures.push(`${url} — request failed: ${error.message}`)
      continue
    }
    if (response.status !== 200) {
      failures.push(`${url} — HTTP ${response.status}, expected 200`)
      continue
    }
    const body = await response.text()
    if (!body.includes(`<title>${page.title}</title>`)) {
      // Names the URL, not the `port` variable: when Astro has silently
      // fallen back to another port, `port` is the misleading value and
      // repeating it in the error would send the reader to the wrong place.
      failures.push(
        `${url} — served page is not ${page.file}; its <title> is missing. ` +
          `Something else is answering there.`,
      )
    }
  }
  return failures
}

// The preview server binds before `preview()` resolves, but a first fetch
// can still land in the gap on a cold Windows run. One short retry, then
// treat it as a real failure rather than looping.
let preflightFailures = await preflight()
if (preflightFailures.length > 0) {
  await new Promise((resolve) => setTimeout(resolve, 500))
  preflightFailures = await preflight()
}

if (preflightFailures.length > 0) {
  console.error('\naxe: preflight failed — the audit would have reported on the wrong pages.\n')
  for (const failure of preflightFailures) console.error(`  ${failure}`)
  console.error('')
  await server.stop()
  process.exit(1)
}

const urls = pages.map((page) => `${origin}${page.route}`)
console.log(`axe: auditing ${urls.length} page(s), verified served from this build`)
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
