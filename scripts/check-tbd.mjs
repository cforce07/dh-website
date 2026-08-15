#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.argv[2] ?? 'dist'
const PATTERN = /data-tbd="([^"]*)"/g

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return full.endsWith('.html') ? [full] : []
  })
}

const findings = []
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8')
  for (const match of html.matchAll(PATTERN)) {
    findings.push({ item: match[1], file: relative(root, file) })
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
