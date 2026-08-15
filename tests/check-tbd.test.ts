import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import Tbd from '../src/components/Tbd.astro'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tbd-'))
  mkdirSync(join(dir, 'nested'), { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function runGate(): { code: number; output: string } {
  try {
    const output = execFileSync('node', ['scripts/check-tbd.mjs', dir], { encoding: 'utf8' })
    return { code: 0, output }
  } catch (error: any) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` }
  }
}

describe('check-tbd gate', () => {
  it('passes when no placeholders remain', () => {
    writeFileSync(join(dir, 'index.html'), '<h1>Clean</h1>')
    expect(runGate().code).toBe(0)
  })

  it('fails when a placeholder survives, and names the item', () => {
    writeFileSync(
      join(dir, 'nested', 'page.html'),
      '<span data-tbd="MOM licence number" data-tbd-owner="DirectHired">TBD</span>',
    )
    const result = runGate()
    expect(result.code).toBe(1)
    expect(result.output).toContain('MOM licence number')
    expect(result.output).toContain('page.html')
  })

  it('reports every distinct placeholder, not just the first', () => {
    writeFileSync(join(dir, 'a.html'), '<span data-tbd="Item A"></span>')
    writeFileSync(join(dir, 'b.html'), '<span data-tbd="Item B"></span>')
    const result = runGate()
    expect(result.code).toBe(1)
    expect(result.output).toContain('Item A')
    expect(result.output).toContain('Item B')
  })

  it('fails when a placeholder renders as a bare attribute (empty item), and labels it', () => {
    // Astro's renderer emits a bare `data-tbd` (no ="...") when the attribute value is
    // an empty string, e.g. <Tbd item={someExpressionThatResolvedToEmpty} />. The gate
    // must not silently miss this fail-open case.
    writeFileSync(
      join(dir, 'bare.html'),
      '<span data-tbd data-tbd-owner="DirectHired">TBD — </span>',
    )
    const result = runGate()
    expect(result.code).toBe(1)
    expect(result.output).toContain('bare.html')
    expect(result.output.toLowerCase()).toContain('unnamed placeholder')
  })

  it('does not mistake data-tbd-owner for a bare data-tbd placeholder', () => {
    writeFileSync(join(dir, 'owner-only.html'), '<span data-tbd-owner="DirectHired">Clean</span>')
    expect(runGate().code).toBe(0)
  })

  it('fails when the scan directory contains no HTML files at all', () => {
    // dir exists (created in beforeEach) but nothing was ever written into it — this
    // must not be indistinguishable from "clean". A gate that scanned nothing has
    // verified nothing.
    const result = runGate()
    expect(result.code).not.toBe(0)
    expect(result.output.toLowerCase()).toContain('no html files')
  })
})

/*
 * The gate's WIRING, as distinct from the gate itself.
 *
 * Everything above proves scripts/check-tbd.mjs works. Nothing above
 * proves anything still calls it. Deleting `&& node scripts/check-tbd.mjs
 * dist` from package.json's `build` script left the entire suite green
 * while Category A protection vanished silently — the last untested link
 * in the safety chain, sitting exactly where the chain meets production.
 * The design spec's own words: "an untested gate is decoration."
 *
 * These tests assert that the gate is INVOKED by the release command, not
 * how that invocation is spelled. Extra flags, a different dist path, or
 * delegating through npm-run-all all keep passing; only actually losing
 * the gate fails.
 */
describe('the TBD gate is wired into the release command', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>
  }
  const scripts = pkg.scripts ?? {}

  // The gate's filename is the one string this test must know. If the gate
  // is ever renamed, update GATE_SCRIPT here deliberately — a rename is
  // precisely the moment a human should re-confirm the wiring, so failing
  // loudly is the correct behaviour, not a brittleness to engineer around.
  const GATE_SCRIPT = 'scripts/check-tbd.mjs'
  const GATE_PATTERN = /check-tbd/

  /**
   * npm script names this command DELEGATES to. Matched only after an
   * actual runner keyword (`npm run x`, `run-s a b`, `npm-run-all ...`),
   * never by bare word occurrence: `build:dev` is literally "astro build",
   * and a naive scan would read that as delegating to the `build` script
   * and fold the gate into it, inverting the second test below.
   */
  function referencedScripts(command: string): string[] {
    const names: string[] = []

    for (const match of command.matchAll(/(?:npm|pnpm|yarn|bun)\s+run\s+([\w:.*-]+)/g)) {
      names.push(match[1])
    }

    // run-s / run-p / npm-run-all take a bare list of script names (and
    // possibly globs) until the next shell operator.
    for (const match of command.matchAll(/(?:npm-run-all|run-s|run-p)((?:\s+[^\s&|;]+)+)/g)) {
      for (const token of match[1].trim().split(/\s+/)) {
        if (!token.startsWith('-')) names.push(token)
      }
    }

    // Expand globs (`run-s build:*`) against the real script names.
    return names.flatMap((name) => {
      if (!name.includes('*')) return [name]
      const pattern = new RegExp(`^${name.split('*').map(escapeRegExp).join('.*')}$`)
      return Object.keys(scripts).filter((key) => pattern.test(key))
    })
  }

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /** A script's own command plus, transitively, every script it delegates to. */
  function resolve(name: string, seen = new Set<string>()): string {
    if (seen.has(name)) return ''
    seen.add(name)
    const command = scripts[name]
    if (command === undefined) return ''
    return [command, ...referencedScripts(command).map((ref) => resolve(ref, seen))].join(' ')
  }

  it('the gate script it protects actually exists (sanity check)', () => {
    // Without this, a passing `build` assertion could just mean the command
    // names a file that was deleted.
    expect(existsSync(GATE_SCRIPT)).toBe(true)
  })

  it('has both a build and a build:dev script to check (sanity check)', () => {
    // Guards the two assertions below against passing vacuously if either
    // script is renamed or removed.
    expect(scripts.build).toBeTypeOf('string')
    expect(scripts['build:dev']).toBeTypeOf('string')
  })

  it('the release command invokes the gate', () => {
    expect(resolve('build')).toMatch(GATE_PATTERN)
  })

  it('build:dev does NOT invoke the gate', () => {
    // CI depends on this distinction (see .github/workflows/ci.yml): the
    // gate is expected to fail while the MOM licence number is outstanding,
    // so CI builds with build:dev. Someone "fixing" a red pipeline by
    // adding the gate here would break it in the confusing direction —
    // permanently red for a reason that is working as designed, inviting
    // deletion of the placeholder or the gate to make it go away.
    expect(resolve('build:dev')).not.toMatch(GATE_PATTERN)
  })
})

describe('Tbd component', () => {
  it('throws at build time when item is empty', async () => {
    const container = await AstroContainer.create()
    await expect(container.renderToString(Tbd, { props: { item: '' } })).rejects.toThrow()
  })

  it('throws at build time when item is whitespace-only', async () => {
    const container = await AstroContainer.create()
    await expect(container.renderToString(Tbd, { props: { item: '   ' } })).rejects.toThrow()
  })

  it('renders normally when item is a real value', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(Tbd, { props: { item: 'MOM licence number' } })
    expect(html).toContain('data-tbd="MOM licence number"')
  })
})
