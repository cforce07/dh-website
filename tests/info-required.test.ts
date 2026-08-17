import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * THE GENERATED CHECKLIST IS ACTUALLY CURRENT.
 *
 * `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` opens by telling the
 * reader it is "generated ... from the current build output and content
 * collections" and that Categories A, B and D "cannot fall out of sync"
 * with the codebase. Both sentences were false in the ordinary way, and
 * nobody noticed until Task 12 ran the generator: the committed document
 * was carrying SIX stale line-number citations — `config.ts:90` for a
 * collection that had moved to line 116, and five BaseLayout.astro
 * citations off by up to 79 lines.
 *
 * Nothing was broken. The registry was right, the generator was right, and
 * the document was right on the day it was written. It is derived only at
 * the moment somebody remembers to run the script, and between those
 * moments it is a hand-written file that claims not to be. That is worse
 * than an openly hand-written document, because the claim invites trust.
 *
 * This is the assertion that makes the claim true. It regenerates into a
 * temp file — never touching the tracked one — and compares.
 *
 * WHY THE STALE CITATIONS MATTERED. Those lines are the client's
 * instructions for swapping an AI placeholder for a real photograph:
 * "Usage sites" is where the swap happens. A designer handed
 * `BaseLayout.astro:46` for the og:image call finds an import statement,
 * and the one document written for someone who does not know this codebase
 * is the one that sent them to the wrong line.
 */
describe('docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md is regenerated, not stale', () => {
  const COMMITTED = 'docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md'

  /**
   * Git may check the tracked file out with CRLF on Windows while the
   * generator always writes LF, so a raw comparison would fail on every
   * developer machine for a reason that has nothing to do with staleness —
   * and the fix for THAT failure would be to delete this test.
   */
  const normalise = (s: string) => s.replace(/\r\n/g, '\n').trimEnd()

  it('matches a fresh run of scripts/generate-info-required.mjs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'info-required-'))
    const out = join(dir, 'generated.md')
    try {
      execFileSync('node', ['scripts/generate-info-required.mjs'], {
        env: { ...process.env, INFO_REQUIRED_OUT: out },
        stdio: 'pipe',
      })
      const fresh = normalise(readFileSync(out, 'utf8'))
      const committed = normalise(readFileSync(COMMITTED, 'utf8'))
      expect(
        committed,
        `${COMMITTED} is out of date. Run:\n\n` +
          '  npm run build:dev && node scripts/generate-info-required.mjs\n\n' +
          'and commit the result. Do not hand-edit the document — every line of it ' +
          'comes from scripts/generate-info-required.mjs.',
      ).toBe(fresh)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the generator honours INFO_REQUIRED_OUT, so this test never writes to the tracked file', () => {
    /*
     * If the env override silently stopped working, the test above would
     * still pass — by overwriting the committed file and then comparing it
     * with itself. That is a green test that has destroyed the evidence it
     * was checking, so the override is asserted directly.
     */
    const before = readFileSync(COMMITTED, 'utf8')
    const dir = mkdtempSync(join(tmpdir(), 'info-required-'))
    const out = join(dir, 'elsewhere.md')
    try {
      execFileSync('node', ['scripts/generate-info-required.mjs'], {
        env: { ...process.env, INFO_REQUIRED_OUT: out },
        stdio: 'pipe',
      })
      expect(readFileSync(out, 'utf8').length).toBeGreaterThan(0)
      expect(readFileSync(COMMITTED, 'utf8')).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  /**
   * docs/OPEN-DECISIONS.md is HAND-WRITTEN, and it tells DirectHired exactly
   * how many buttons on their site lead to the requirement form. A hand-typed
   * count is precisely the figure that is correct on the day it is written and
   * quietly wrong one page later.
   *
   * WHAT THE NUMBER MEANS CHANGED ON 2026-08-17 AND THE ASSERTION DID NOT.
   * Until that date it counted DEAD calls to action and was the measure of the
   * damage, which is why the item was ranked first in that document. The form
   * URL was supplied, and the same count is now a count of WORKING ones,
   * stated in the *Answered, for the record* register. The check is unchanged
   * because it never depended on the reading: it holds a hand-written figure
   * against the build either way.
   *
   * The generated checklist derives its copy of the number from dist/ and
   * cannot drift. This is the assertion that holds the hand-written
   * document to the same standard, rather than trusting it.
   */
  it('docs/OPEN-DECISIONS.md states the real number of requirement-form CTAs', () => {
    const url = readFileSync('src/data/company.ts', 'utf8').match(
      /requirementFormUrl:\s*'([^']+)'/,
    )?.[1]
    expect(url, 'company.requirementFormUrl must be readable').toBeTruthy()

    const walkDist = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry).split('\\').join('/')
        return statSync(full).isDirectory() ? walkDist(full) : [full]
      })

    const pages = walkDist('dist').filter((f) => f.endsWith('.html'))
    let ctas = 0
    let pagesWithCta = 0
    for (const file of pages) {
      const hits = readFileSync(file, 'utf8').split(`href="${url}"`).length - 1
      if (hits > 0) pagesWithCta++
      ctas += hits
    }

    // Sanity: the count must be doing real work, not counting zero.
    expect(ctas).toBeGreaterThan(0)
    expect(pagesWithCta).toBe(pages.length)

    const decisions = readFileSync('docs/OPEN-DECISIONS.md', 'utf8')
    expect(
      decisions,
      `docs/OPEN-DECISIONS.md must state the real CTA count (${ctas}). Update the ` +
        'form-URL row in "Answered, for the record" — both the "N buttons and ' +
        'links" sentence and the "moved all N links at once" sentence.',
    ).toContain(`${ctas} buttons and links`)
    expect(decisions).toContain(`all ${ctas} links at once`)
  })

  it('the production form URL is on the checklist at all', () => {
    /*
     * Task 12 found the highest-value outstanding input on the project
     * missing from the document named "Information Required Before
     * Production" — it was tracked only in docs/OPEN-DECISIONS.md. It was
     * undetectable by construction (the code rendered a real, confident href
     * to a URL that did not resolve), so nothing but a declared entry could
     * carry it, and nothing but this assertion stopped it being tidied away
     * again as "already covered elsewhere".
     *
     * IT IS ANSWERED NOW, AND THIS ASSERTION MATTERS MORE RATHER THAN LESS.
     * A resolved item is exactly the kind that gets deleted as clutter on the
     * next tidy-up, and deleting it would leave DirectHired unable to tell
     * "resolved" from "forgotten" about the one item that stopped their site
     * converting. It moved to the RESOLVED_INPUTS register in
     * scripts/generate-info-required.mjs, and the additions below hold that
     * register to the two things that make it worth printing: the date, and
     * the answer.
     */
    const doc = readFileSync(COMMITTED, 'utf8')
    expect(doc).toMatch(/employer requirement form/i)
    expect(doc).toContain('requirementFormUrl')
  })

  it('the checklist records the form URL as resolved, with the date and the supplied value', () => {
    /*
     * The value is read from the single definition rather than typed here —
     * the same rule tests/links.test.ts enforces on every file under src/.
     * A guard for "the document states the answer" must not become a second
     * place the answer is written down.
     */
    const url = readFileSync('src/data/company.ts', 'utf8').match(
      /requirementFormUrl:\s*'([^']+)'/,
    )?.[1]
    expect(url, 'company.requirementFormUrl must be readable').toBeTruthy()

    const HEADING = '### Resolved — supplied by DirectHired'
    const doc = readFileSync(COMMITTED, 'utf8')
    const at = doc.indexOf(HEADING)
    expect(at, 'the checklist has no resolved register').toBeGreaterThan(-1)

    // Scoped to the register itself — from its heading to the next `##` —
    // rather than to the whole document. The URL appears elsewhere in the
    // file, so a whole-document search would pass against a register that
    // had been emptied.
    const register = doc.slice(at).split('\n## ')[0]
    expect(register, 'the resolved register does not state the supplied value').toContain(url!)
    expect(register, 'the resolved register does not state when it was answered').toMatch(
      /\*\*answered \d{4}-\d{2}-\d{2}\*\*/,
    )
  })
})
