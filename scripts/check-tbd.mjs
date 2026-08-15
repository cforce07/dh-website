#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.argv[2] ?? 'dist'
// Quoted form: <span data-tbd="MOM licence number" ...>
const QUOTED_PATTERN = /data-tbd="([^"]*)"/g
// Bare form: Astro's attribute renderer emits a bare `data-tbd` (no ="...") when the
// value is an empty string, e.g. <Tbd item={expr}/> where expr resolves to "". The
// negative lookahead excludes both the quoted form (next char "=") and `data-tbd-owner`
// (next char "-"), so each survivor is counted exactly once by exactly one pattern.
const BARE_PATTERN = /data-tbd(?![-="])/g

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return full.endsWith('.html') ? [full] : []
  })
}

let files
try {
  files = htmlFiles(root)
} catch (error) {
  console.error(`\nTBD gate could not scan "${root}": ${error.message}\n`)
  process.exit(1)
}

if (files.length === 0) {
  console.error(
    `\nTBD gate found no HTML files under "${root}" — nothing was scanned, so nothing was verified.\n` +
      'Check that the build output directory exists and contains the expected pages.\n',
  )
  process.exit(1)
}

const findings = []
for (const file of files) {
  const html = readFileSync(file, 'utf8')
  const relFile = relative(root, file)
  for (const match of html.matchAll(QUOTED_PATTERN)) {
    const item = match[1].trim() === '' ? '(unnamed placeholder)' : match[1]
    findings.push({ item, file: relFile })
  }
  for (const _match of html.matchAll(BARE_PATTERN)) {
    findings.push({ item: '(unnamed placeholder)', file: relFile })
  }
}

if (findings.length > 0) {
  console.error('\nProduction build blocked — unverified information remains:\n')
  for (const { item, file } of findings) {
    console.error(`  ${item}  (${file})`)
  }
  console.error('\nSupply the values or remove the placeholders, then rebuild.\n')
  process.exit(1)
}

console.log('TBD gate passed — no unverified information in build output.')
