import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { images, outstandingImages, realPhotoOnlyImages } from '../src/data/images'

/**
 * The image provenance registry (src/data/images.json, typed by
 * src/data/images.ts) is only worth having if it cannot quietly fall out of
 * step with the code. A registry that silently goes stale is worse than none:
 * it would tell the client at production that they have accounted for every
 * image while a newer one sits unlisted.
 *
 * So this suite treats the codebase as the authority and the registry as the
 * claim. Anything referenced under src/ must be registered, every usage site
 * must resolve to a real line in a real file, and the real-photo-only rule
 * must hold structurally rather than by good intentions.
 */

const PROMPTS_DOC = 'docs/design/image-prompts-2026-08-16.md'

const IMAGE_EXT = '(?:svg|png|jpe?g|webp|avif|gif)'
const SCANNED_EXT = ['.astro', '.ts', '.tsx', '.js', '.mjs', '.css']

/** `import x from './y.svg'` — resolved relative to the importing file. */
const IMPORT_PATTERN = new RegExp(String.raw`\bfrom\s+['"]([^'"]+\.${IMAGE_EXT})['"]`, 'g')
/** `href="/favicon.svg"` / `src="/x.png"` — an absolute path into public/. */
const PUBLIC_ATTR_PATTERN = new RegExp(
  String.raw`(?:href|src)\s*=\s*["'](\/[^"']+\.${IMAGE_EXT})["']`,
  'g',
)
/** `url(./x.svg)` in a stylesheet or a scoped <style> block. */
const CSS_URL_PATTERN = new RegExp(String.raw`url\(\s*['"]?([^'")]+\.${IMAGE_EXT})['"]?\s*\)`, 'g')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return SCANNED_EXT.some((ext) => full.endsWith(ext)) ? [full] : []
  })
}

function toRepoPath(p: string): string {
  return relative(process.cwd(), p).split('\\').join('/')
}

/**
 * Every image asset the code under src/ actually references, as repo-relative
 * paths. Deliberately does NOT match bare filenames in prose comments — this
 * codebase names assets in comments constantly (Footer.astro:173,
 * BaseLayout.astro:36), and a scanner that counted those would report
 * references that do not exist.
 */
function referencedAssets(): Map<string, string[]> {
  const found = new Map<string, string[]>()

  const record = (asset: string, source: string) => {
    if (!found.has(asset)) found.set(asset, [])
    found.get(asset)!.push(source)
  }

  for (const file of walk('src')) {
    const source = readFileSync(file, 'utf8')
    const here = toRepoPath(file)

    for (const [, spec] of source.matchAll(IMPORT_PATTERN)) {
      record(toRepoPath(resolve(dirname(file), spec)), here)
    }
    for (const [, spec] of source.matchAll(PUBLIC_ATTR_PATTERN)) {
      record(`public${spec}`, here)
    }
    for (const [, spec] of source.matchAll(CSS_URL_PATTERN)) {
      const asset = spec.startsWith('/')
        ? `public${spec}`
        : toRepoPath(resolve(dirname(file), spec))
      record(asset, here)
    }
  }

  return found
}

describe('image provenance registry', () => {
  it('registers every image asset actually referenced under src/', () => {
    const registered = new Set(
      images.map((slot) => slot.assetPath).filter((p): p is string => p !== null),
    )

    const unregistered = [...referencedAssets().entries()]
      .filter(([asset]) => !registered.has(asset))
      .map(([asset, sources]) => `${asset} (referenced by ${sources.join(', ')})`)

    expect(unregistered).toEqual([])
  })

  it('finds at least the assets we know are referenced (guards the scanner itself)', () => {
    // Without this, a scanner regression that matched nothing would make the
    // test above pass vacuously.
    const found = new Set(referencedAssets().keys())
    // A raster and a vector, deliberately: the scanner must not quietly
    // regress to matching only .svg.
    expect(found).toContain('src/assets/hero-together.png')
    expect(found).toContain('src/assets/og-share.png')
    expect(found).toContain('src/assets/logo-wordmark.svg')
    expect(found).toContain('src/assets/logo-wordmark-on-deep.svg')
    expect(found).toContain('public/favicon.svg')
  })

  it('does not invent references from prose comments', () => {
    // logo-lockup.svg and logo-mark.svg are named in comments but imported
    // nowhere. They are registered (a registry may be a superset of what is
    // referenced) but must not be reported as live references.
    const found = new Set(referencedAssets().keys())
    expect(found).not.toContain('src/assets/logo-lockup.svg')
    expect(found).not.toContain('logo/Logo-01.svg')
    expect(found).not.toContain('public/favicon.ico')
  })

  it('points every registered asset path at a file that exists', () => {
    const missing = images
      .filter((slot) => slot.assetPath !== null && !existsSync(slot.assetPath))
      .map((slot) => `${slot.id} -> ${slot.assetPath}`)

    expect(missing).toEqual([])
  })

  it('gives every slot a unique id', () => {
    const ids = images.map((slot) => slot.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves every usage site to a real line in a real file', () => {
    const broken: string[] = []

    for (const slot of images) {
      for (const use of slot.usedBy) {
        if (!existsSync(use.file)) {
          broken.push(`${slot.id}: ${use.file} does not exist`)
          continue
        }
        const lineCount = readFileSync(use.file, 'utf8').split('\n').length
        if (use.line < 1 || use.line > lineCount) {
          broken.push(`${slot.id}: ${use.file}:${use.line} is outside the file (${lineCount} lines)`)
        }
      }
    }

    expect(broken).toEqual([])
  })

  /**
   * Every `usedBy[].what` begins with a literal quotation of the line it
   * cites, terminated by " — " (or by the end of the string). `…` inside the
   * quotation is an elision and matches any run of text.
   *
   * This convention exists because the check above — `1 <= line <= lineCount`
   * — is all the registry had, and it detects almost nothing. Every entry
   * could say line 1 and pass. Both drifts this test was written to catch had
   * already happened and were invisible: `favicon-mark` cited
   * BaseLayout.astro:55 after commit a05b78e inserted the og block above the
   * favicon <link>, so it pointed at the viewport meta; and
   * `helper-profile-portrait` cited config.ts:110, the `})` closing the
   * *reviews* collection.
   *
   * A registry of where images are used is worth having only if a line number
   * going stale is a failure. The quotation is what makes the line number
   * checkable, so it is required of every entry rather than of the ones that
   * happen to have it.
   */
  const QUOTE_MIN_LENGTH = 8

  function quotedSource(what: string): string {
    return what.split(' — ')[0].trim()
  }

  /** Does `quote` (with `…` as a wildcard) occur in `line`? */
  function quoteOccursIn(quote: string, line: string): boolean {
    let from = 0
    for (const part of quote.split('…').map((p) => p.trim())) {
      if (part === '') continue
      const at = line.indexOf(part, from)
      if (at === -1) return false
      from = at + part.length
    }
    return true
  }

  it('quotes the line it cites, and the quote is still at that line', () => {
    const wrong: string[] = []

    for (const slot of images) {
      for (const use of slot.usedBy) {
        const quote = quotedSource(use.what)
        if (quote.length < QUOTE_MIN_LENGTH) {
          wrong.push(`${slot.id}: ${use.file}:${use.line} quotes nothing ("${use.what}")`)
          continue
        }
        const line = readFileSync(use.file, 'utf8').split('\n')[use.line - 1] ?? ''
        if (!quoteOccursIn(quote, line)) {
          wrong.push(
            `${slot.id}: ${use.file}:${use.line} should read ${quote}\n` +
              `      but line ${use.line} is: ${line.trim()}`,
          )
        }
      }
    }

    expect(wrong).toEqual([])
  })

  it('would notice if every usage site claimed line 1 (guards the check above)', () => {
    // The failure mode of the previous check, reproduced deliberately: a
    // registry whose line numbers are all in range but all wrong. If this
    // ever finds nothing, the quotation check has stopped doing any work.
    const survivingAtLineOne = images.flatMap((slot) =>
      slot.usedBy.filter((use) => {
        const firstLine = readFileSync(use.file, 'utf8').split('\n')[0] ?? ''
        return quoteOccursIn(quotedSource(use.what), firstLine)
      }),
    )

    expect(survivingAtLineOne).toEqual([])
  })

  // The hard boundary. An AI-generated helper IS a fabricated helper, and an
  // AI face beside a real quote IS a fabricated attribution — master brief
  // §55 and §78. Marking a slot real-photo-only has to mean something the
  // suite can enforce, not something a future edit can quietly undo.
  it('never lets a real-photo-only slot carry AI provenance', () => {
    const violations = realPhotoOnlyImages()
      .filter((slot) => slot.provenance === 'ai-generated')
      .map((slot) => slot.id)

    expect(violations).toEqual([])
  })

  it('never lets a real-photo-only slot carry a prompt', () => {
    const violations = realPhotoOnlyImages()
      .filter((slot) => slot.promptSection !== null)
      .map((slot) => `${slot.id} -> ${slot.promptSection}`)

    expect(violations).toEqual([])
  })

  it('makes every real-photo-only slot state why', () => {
    const unexplained = realPhotoOnlyImages()
      .filter((slot) => (slot.aiForbiddenReason ?? '').trim().length < 40)
      .map((slot) => slot.id)

    expect(unexplained).toEqual([])
  })

  it('keeps the three forbidden categories registered and locked', () => {
    // Named explicitly rather than counted, so deleting one is a failure
    // rather than a smaller number nobody notices.
    for (const id of ['helper-profile-portrait', 'review-author-portrait', 'team-and-office']) {
      const slot = images.find((s) => s.id === id)
      expect(slot, `${id} must stay in the registry`).toBeDefined()
      expect(slot!.aiPermitted).toBe(false)
    }
  })

  it('gives every AI-permitted slot a prompt section that exists in the prompts document', () => {
    const doc = readFileSync(PROMPTS_DOC, 'utf8')

    for (const slot of images.filter((s) => s.aiPermitted)) {
      expect(slot.promptSection, `${slot.id} must name a prompt section`).not.toBeNull()
      expect(doc, `${PROMPTS_DOC} must contain a heading for ${slot.id}`).toContain(
        `## ${slot.promptSection}`,
      )
    }
  })

  it('lists exactly the non-real-photo slots as outstanding, by name', () => {
    // NAMED, not derived. This previously asserted, for every slot,
    //   outstanding.includes(slot.id) === (slot.provenance !== 'real-photo')
    // which is outstandingImages()'s own filter restated as its own test. It
    // held for any registry, any provenance and any number of slots — an
    // empty registry passed it, and so did one where every image had been
    // relabelled 'real-photo'.
    //
    // This list is what the client is handed at production as "still
    // outstanding". Flipping a slot's provenance is a claim about who owns
    // an image and whether it may ship, so it has to be a deliberate edit
    // in two places, not a quiet one in the JSON. The literal order is also
    // the assertion that outstandingImages() stays sorted — the generated
    // checklist's diff depends on it.
    expect(outstandingImages().map((slot) => slot.id)).toEqual([
      'helper-profile-portrait',
      'hero-together',
      'og-share',
      'review-author-portrait',
      'team-and-office',
    ])

    // The complement, named for the same reason: these five are
    // DirectHired's own brand artwork and nothing about them is pending.
    const settled = images
      .filter((slot) => slot.provenance === 'real-photo')
      .map((slot) => slot.id)
      .sort()
    expect(settled).toEqual([
      'favicon-mark',
      'logo-lockup',
      'logo-mark',
      'logo-wordmark',
      'logo-wordmark-on-deep',
    ])
    // No slot may be in neither list.
    expect(outstandingImages().length + settled.length).toBe(images.length)
  })

  it('is wired into the generated production checklist', () => {
    // The registry's whole purpose is that the client opens ONE generated
    // file at production. If the generator stops reading it, the registry
    // still passes every test above while helping nobody.
    const generator = readFileSync('scripts/generate-info-required.mjs', 'utf8')
    expect(generator).toContain('src/data/images.json')
    expect(generator).toContain('Category D')
  })
})
