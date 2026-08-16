#!/usr/bin/env node
/**
 * Runs Lighthouse against a local `astro preview` and writes the raw LHRs
 * into `.lighthouseci/`, so `npx lhci assert` can grade them with
 * lighthouserc.json — the same config, the same assertion engine and the
 * same median aggregation CI uses.
 *
 * WHY THIS EXISTS. `npx lhci autorun` and the `lighthouse` CLI both die on
 * Windows before producing anything:
 *
 *     Runtime error encountered: EPERM, Permission denied:
 *     \\?\C:\Users\<user>\AppData\Local\Temp\lighthouse.NNNNNNNN
 *       at Launcher.destroyTmp (chrome-launcher/dist/chrome-launcher.js:367)
 *
 * The audit itself COMPLETES — the log reaches "Generating results..." and
 * the crash is in `chrome-launcher`'s teardown, removing the temp profile
 * directory it created. Windows still holds a handle on it a beat after
 * Chrome exits. Nothing is wrong with the site, the config or the budget;
 * the only thing standing between this project and real numbers is who owns
 * the Chrome process. This script owns it: it spawns Chrome itself with a
 * profile directory it controls, connects over CDP through the Lighthouse
 * NODE API, and never calls chrome-launcher. Cleanup failures are caught
 * and ignored, because a leftover temp profile is not a reason to throw
 * away a completed audit.
 *
 * Before this ran, EVERY performance claim about this site was unverified:
 * locally on the EPERM above, and in CI on a chromedriver/Chrome version
 * mismatch that went unfixed for months. The first successful run is
 * recorded in docs/runbooks/lighthouse-on-windows.md.
 *
 * THIS IS NOT A REPLACEMENT FOR `lhci autorun` and must not become one. CI
 * runs autorun on Linux, where chrome-launcher works. This is the local
 * escape hatch, and it deliberately stops at collection: it does not grade
 * anything itself, because a second implementation of the budget is a
 * second thing to keep in step with lighthouserc.json. Run `npx lhci
 * assert` after it and the real config does the grading.
 *
 * Usage:
 *   npm run build          # or build:dev
 *   npm run preview &      # must be serving before this starts
 *   node scripts/lighthouse-local.mjs
 *   npx lhci assert
 *
 * Env: LH_ORIGIN (default http://localhost:4321), LH_RUNS (default 3, which
 * is what lighthouserc.json collects and what its median needs), CHROME_PATH.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const lighthouse = (await import('lighthouse')).default

const ORIGIN = process.env.LH_ORIGIN ?? 'http://localhost:4321'
const RUNS = Number(process.env.LH_RUNS ?? 3)
const OUT = '.lighthouseci'
const PORT = 9333

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
].filter(Boolean)

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chromePath) {
  console.error(
    '\nNo Chrome found. Looked at:\n' +
      CHROME_CANDIDATES.map((p) => `  ${p}`).join('\n') +
      '\nSet CHROME_PATH and re-run.\n',
  )
  process.exit(1)
}

/**
 * The page list, derived from dist/ the same way scripts/run-axe.mjs derives
 * its own — so a page added to the site is audited without anyone editing
 * this file. That is the property lighthouserc.json's `maxAutodiscoverUrls:
 * 0` exists to protect, and hardcoding the list here would reintroduce
 * exactly the silent-drop failure that comment describes.
 */
function routesFromDist() {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = join(dir, e.name)
      if (e.isDirectory()) return e.name === '_astro' ? [] : walk(full)
      return e.name.endsWith('.html') ? [full] : []
    })

  if (!existsSync('dist')) {
    console.error('\nNo dist/ — run `npm run build` first.\n')
    process.exit(1)
  }

  return walk('dist')
    .map((f) => f.split('\\').join('/').replace(/^dist/, ''))
    .map((route) => (route === '/index.html' ? '/' : route.replace(/\/index\.html$/, '/')))
    .sort()
}

const routes = routesFromDist()
if (routes.length === 0) {
  console.error('\nNo HTML under dist/ — nothing to audit.\n')
  process.exit(1)
}

// Fail loudly rather than auditing an empty or stale server: an LHR of a
// connection error still writes a file, and `lhci assert` would then grade a
// blank page. Same reasoning as run-axe.mjs's preflight.
try {
  const res = await fetch(ORIGIN + routes[0])
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch (err) {
  console.error(
    `\nNothing serving at ${ORIGIN}${routes[0]} (${err.message}).\n` +
      'Start `npm run preview` first, or set LH_ORIGIN.\n',
  )
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) {
  // Stale LHRs from a previous run would be graded alongside the new ones
  // and quietly change the median.
  if (f.startsWith('lhr-') || f === 'assertion-results.json') unlinkSync(join(OUT, f))
}

const userDataDir = mkdtempSync(join(tmpdir(), 'lh-chrome-'))
const chrome = spawn(
  chromePath,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-extensions',
    '--disable-default-apps',
    '--mute-audio',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function waitForPort() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Chrome never opened debugging port ${PORT}`)
}

let written = 0
const stamp = Date.now()
try {
  await waitForPort()

  for (const route of routes) {
    for (let run = 1; run <= RUNS; run++) {
      const result = await lighthouse(ORIGIN + route, {
        port: PORT,
        output: 'json',
        logLevel: 'error',
        // Everything else left at Lighthouse's defaults — mobile emulation
        // and simulated throttling — which is what lhci collects with when
        // lighthouserc.json overrides neither.
      })
      // `lhr-<digits>.json` AND NOTHING ELSE. @lhci/utils/src/saved-reports.js
      // matches /^lhr-\d+\.json$/, so a separator as innocent as a hyphen
      // makes `lhci assert` find zero files — and it then prints "Checking
      // assertions against 0 URL(s), 0 total run(s) ... All results
      // processed!" and EXITS 0. A green run that graded nothing is the
      // worst output this pipeline can produce, and it cost a round to
      // notice. `stamp + written` keeps every name unique and all-digits.
      writeFileSync(join(OUT, `lhr-${stamp + written++}.json`), JSON.stringify(result.lhr))
      const { performance, accessibility, seo } = result.lhr.categories
      process.stdout.write(
        `  ${route} (${run}/${RUNS})  perf ${performance.score}  a11y ${accessibility.score}  seo ${seo.score}\n`,
      )
    }
  }
} finally {
  chrome.kill()
  await new Promise((r) => setTimeout(r, 1000))
  try {
    rmSync(userDataDir, { recursive: true, force: true })
  } catch {
    // The very EPERM this script exists to route around. Harmless here: the
    // audits are already on disk, and the OS reclaims the temp directory.
    console.warn(`\nCould not remove ${userDataDir} — Windows still holds it. Results are fine.`)
  }
}

/*
 * THE FILES MUST BE DISCOVERABLE, AND THAT IS CHECKED HERE RATHER THAN
 * ASSUMED. This whole script is worthless if `lhci assert` cannot see what
 * it wrote, and the way lhci reports not seeing anything is a green exit 0.
 * So the naming contract is asserted against lhci's own regex before this
 * script claims success — the one check that would have caught the hyphen.
 */
const LHCI_LHR_REGEX = /^lhr-\d+\.json$/
const discoverable = readdirSync(OUT).filter((f) => LHCI_LHR_REGEX.test(f))
if (discoverable.length !== written) {
  console.error(
    `\nWrote ${written} LHRs but only ${discoverable.length} match lhci's ${LHCI_LHR_REGEX} —\n` +
      '`lhci assert` would grade the difference as though it did not exist, and exit 0.\n',
  )
  process.exit(1)
}

console.log(
  `\nWrote ${written} LHRs for ${routes.length} route(s) to ${OUT}/, all discoverable by lhci.\n` +
    'Now grade them with the real budget:\n\n  npx lhci assert\n' +
    `\nIt must report ${routes.length} URL(s) and ${written} total run(s). If it says 0 and 0,\n` +
    'it graded nothing and its exit 0 means nothing.\n',
)
