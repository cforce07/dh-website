import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
    expect(result.output).toContain('Item A')
    expect(result.output).toContain('Item B')
  })
})
