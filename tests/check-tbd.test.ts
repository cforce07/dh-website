import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
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
