# DirectHired Foundation + Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the DirectHired design system, content model, layout shell, and twelve-block homepage as a statically-generated Astro site deployable to AWS S3.

**Architecture:** All factual content lives in typed data modules and Astro content collections, never inline in components — so any published fact has exactly one definition. Money is stored as integer cents and totals are derived from line items, never typed as literals. Unverified business information routes through a `<Tbd>` component whose surviving instances fail the production build. The homepage is composed of section components that read from the data layer, shipping zero client JavaScript except three justified islands.

**Tech Stack:** Astro 5, TypeScript (strict), Vitest, vanilla CSS with custom-property tokens, `@astrojs/sitemap`, `astro:assets`.

**Spec:** `docs/superpowers/specs/2026-08-15-directhired-foundation-homepage-design.md`

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec and the source brief.

**Business facts — never alter, never invent**

- WhatsApp / phone: `+65 9855 6637`
- Email: `hello@directhired.com`
- Office: `119 Marsiling Rise #04-130, Singapore 730119`
- Opening hours: `24 hours`
- Founded: `2022` — display as "Since 2022"
- Placements: `1,000+ Helpers Placed`
- Facebook: `https://www.facebook.com/directhired`
- Instagram: `https://www.instagram.com/directhired_sg`
- Fly-in with replacement: `$1,640.10`, includes `1 replacement within 6 months`
- Fly-in without replacement: `$1,252.10`
- Line items: agent fees `$888`, MOM `$70`, insurance `$425.10`, SIP `$77`, medical `$60`, handling & transport `$120`
- Helper sources: Indonesia, Myanmar, Mizoram. **Mizoram is never labelled "India".**

**Copy rules**

- Primary CTA is always `Submit Your Requirements`; secondary is always `WhatsApp Us`, in that order, on every surface.
- Never use `Contact Us` as a primary conversion CTA.
- Never write "perfect match".
- Never claim instant human response. Response expectation is "within 1 business day".
- Never claim AI matching. The differentiation is personalised human consultation.

**Prohibitions**

- Never invent helper names, ages, experience, skills, salaries, availability; customer names or reviews; Google ratings or review counts; licence numbers; certifications, awards, branches, staff counts; pricing, fees, government charges, or replacement conditions.
- Never present placeholder people as actual DirectHired personnel.
- No component may hardcode the requirement-form URL. It resolves only through `company.requirementFormUrl`.

**Technical floors**

- Node 20+, Astro 5+, TypeScript `strict: true`
- Money is stored as **integer cents**. Never use floating-point arithmetic on currency.
- Colour and spacing values come from tokens only. No hardcoded hex or px in components.
- All token pairings meet WCAG AA (4.5:1 text, 3:1 non-text).
- `prefers-reduced-motion: reduce` disables all non-essential motion.
- Performance budget: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Exactly one `<h1>` per page.

## A note on how this plan specifies visual work

Logic tasks (money, pricing, WhatsApp, contrast, the TBD gate, structured data) carry complete code, because their correctness is exactly specifiable and testable.

Presentational tasks (sections 01–12) instead specify **copy verbatim, data sources, structural requirements, and prohibitions** — then leave visual treatment to the implementer working with the taste skills. This is deliberate. Freezing markup here would front-run `design-taste-frontend` and `high-end-visual-design`, whose whole value is producing layouts that do not read as templated. What must not vary is pinned exactly; how it looks is theirs to determine.

Implementers of Tasks 12–14 should invoke `design-taste-frontend` and `high-end-visual-design` before writing section markup.

---

## File Structure

```
astro.config.mjs                   Astro + sitemap config, site URL
package.json                       scripts: dev, build, test, check:tbd
tsconfig.json                      strict TS
vitest.config.ts                   test runner

src/data/company.ts                single source for all company facts
src/data/pricing.ts                packages, line items, derived totals
src/lib/money.ts                   cents arithmetic + SGD formatting
src/lib/whatsapp.ts                deep-link builder
src/lib/contrast.ts                WCAG contrast ratio calculation
src/content/config.ts              Zod schemas for all collections
src/content/services/*.md          6 entries
src/content/helpers/*.md           3 entries
src/content/faq/*.md               FAQ entries, tagged by surface

src/styles/tokens.css              colour, type, space, radius, motion tokens
src/styles/global.css              reset, base element styles

src/components/Tbd.astro           placeholder that fails production builds
src/components/Container.astro     width constraint
src/components/Button.astro        primary / secondary / ghost
src/components/Card.astro          surface-raised panel
src/components/SectionHeader.astro eyebrow + h2 + lede
src/components/Header.astro        desktop header
src/components/MobileNav.astro     island — mobile menu
src/components/Footer.astro        footer with nav, contact, social, legal
src/components/MobileCtaBar.astro  persistent mobile WhatsApp affordance
src/components/FaqItem.astro       island — accordion item

src/sections/*.astro               the twelve homepage blocks
src/layouts/BaseLayout.astro       html shell, SEO head, structured data
src/pages/index.astro              homepage composition

scripts/check-tbd.mjs              post-build gate
scripts/generate-info-required.mjs generates the production checklist

tests/                             vitest suites
```

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `.gitignore` additions
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: working `npm test` and `npm run build`; `dist/` static output

- [ ] **Step 1: Scaffold Astro**

```bash
npm create astro@latest -- --template minimal --typescript strict --no-install --no-git --skip-houston .
npm install
npm install -D vitest @astrojs/sitemap
```

- [ ] **Step 2: Configure Astro for static output**

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://www.directhired.com',
  output: 'static',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
})
```

- [ ] **Step 3: Add vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
```

- [ ] **Step 4: Add scripts to package.json**

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build && node scripts/check-tbd.mjs dist",
  "build:dev": "astro build",
  "test": "vitest run",
  "preview": "astro preview"
}
```

- [ ] **Step 5: Write a smoke test**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('harness', () => {
  it('runs', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: PASS, 1 test

- [ ] **Step 7: Append build artefacts to .gitignore**

```
dist/
.astro/
node_modules/
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with vitest harness"
```

---

### Task 2: Money primitives

Currency must never touch floating point. `425.10` is not exactly representable in binary floating point, and summing the six line items as floats yields `1640.0999999999999`. Integer cents makes the published total exact.

**Files:**
- Create: `src/lib/money.ts`
- Test: `tests/money.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `sumCents(amounts: readonly number[]): number`, `formatSgd(cents: number): string`

- [ ] **Step 1: Write the failing tests**

`tests/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sumCents, formatSgd } from '../src/lib/money'

describe('sumCents', () => {
  it('sums the published fly-in line items exactly', () => {
    expect(sumCents([88800, 7000, 42510, 7700, 6000, 12000])).toBe(164010)
  })

  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })

  it('rejects non-integer input', () => {
    expect(() => sumCents([1640.1])).toThrow(/integer cents/)
  })
})

describe('formatSgd', () => {
  it('formats the with-replacement total', () => {
    expect(formatSgd(164010)).toBe('$1,640.10')
  })

  it('formats the without-replacement total', () => {
    expect(formatSgd(125210)).toBe('$1,252.10')
  })

  it('pads a trailing zero in the cents', () => {
    expect(formatSgd(88800)).toBe('$888.00')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/money.test.ts`
Expected: FAIL — cannot resolve `../src/lib/money`

- [ ] **Step 3: Implement**

`src/lib/money.ts`:

```ts
export function sumCents(amounts: readonly number[]): number {
  for (const amount of amounts) {
    if (!Number.isInteger(amount)) {
      throw new Error(`Money must be integer cents, received: ${amount}`)
    }
  }
  return amounts.reduce((total, amount) => total + amount, 0)
}

export function formatSgd(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Money must be integer cents, received: ${cents}`)
  }
  const dollars = Math.floor(cents / 100)
  const remainder = String(cents % 100).padStart(2, '0')
  return `$${dollars.toLocaleString('en-SG')}.${remainder}`
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/money.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/money.test.ts
git commit -m "feat: add integer-cents money primitives"
```

---

### Task 3: Company data module

**Files:**
- Create: `src/data/company.ts`
- Test: `tests/company.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `company` object with `phoneE164`, `phoneDisplay`, `email`, `address`, `openingHours`, `foundedYear`, `placementCount`, `requirementFormUrl`, `socials.facebook`, `socials.instagram`

- [ ] **Step 1: Write the failing test**

`tests/company.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { company } from '../src/data/company'

describe('company data', () => {
  it('carries the verified contact details', () => {
    expect(company.phoneE164).toBe('+6598556637')
    expect(company.phoneDisplay).toBe('+65 9855 6637')
    expect(company.email).toBe('hello@directhired.com')
    expect(company.address.postalCode).toBe('730119')
    expect(company.openingHours).toBe('24 hours')
  })

  it('carries the confirmed company facts', () => {
    expect(company.foundedYear).toBe(2022)
    expect(company.placementCount).toBe('1,000+')
  })

  it('exposes exactly one requirement-form URL', () => {
    expect(company.requirementFormUrl).toMatch(/^https?:\/\//)
  })

  it('links the official social profiles', () => {
    expect(company.socials.facebook).toBe('https://www.facebook.com/directhired')
    expect(company.socials.instagram).toBe('https://www.instagram.com/directhired_sg')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/company.test.ts`
Expected: FAIL — cannot resolve `../src/data/company`

- [ ] **Step 3: Implement**

`src/data/company.ts`:

```ts
export const company = {
  name: 'DirectHired',
  legalDescription: 'Singapore-based domestic helper agency',

  phoneE164: '+6598556637',
  phoneDisplay: '+65 9855 6637',
  email: 'hello@directhired.com',

  address: {
    street: '119 Marsiling Rise #04-130',
    locality: 'Singapore',
    postalCode: '730119',
    country: 'SG',
  },

  openingHours: '24 hours',
  foundedYear: 2022,
  placementCount: '1,000+',

  // The form is built but not yet wired to the production domain.
  // This is the ONLY definition of the destination. Repoint here at launch.
  requirementFormUrl: 'https://www.directhired.com/employer-requirement',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/company.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/company.ts tests/company.test.ts
git commit -m "feat: add company data module as single source of facts"
```

---

### Task 4: Pricing module

The without-replacement package's line-item breakdown is unknown — the brief gives only its total. This is encoded in the type system as a discriminated union so it is impossible to accidentally itemise it.

**Files:**
- Create: `src/data/pricing.ts`
- Test: `tests/pricing.test.ts`

**Interfaces:**
- Consumes: `sumCents`, `formatSgd` from `src/lib/money`
- Produces: `packages: readonly Package[]`, `packageTotalCents(pkg: Package): number`, types `Package`, `ItemisedPackage`, `TotalOnlyPackage`, `LineItem`

- [ ] **Step 1: Write the failing tests**

`tests/pricing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd } from '../src/lib/money'

const withReplacement = packages.find((p) => p.id === 'fly-in-with-replacement')!
const withoutReplacement = packages.find((p) => p.id === 'fly-in-without-replacement')!

describe('fly-in with replacement', () => {
  it('derives its total from line items, matching the published price', () => {
    expect(formatSgd(packageTotalCents(withReplacement))).toBe('$1,640.10')
  })

  it('is itemised with the six published components', () => {
    expect(withReplacement.kind).toBe('itemised')
    if (withReplacement.kind !== 'itemised') throw new Error('unreachable')
    expect(withReplacement.lineItems.map((i) => i.label)).toEqual([
      'Agent fees', 'MOM', 'Insurance', 'SIP', 'Medical', 'Handling & transport',
    ])
  })

  it('states the confirmed replacement term', () => {
    expect(withReplacement.replacementTerm).toBe('1 replacement within 6 months')
  })
})

describe('fly-in without replacement', () => {
  it('reports the published total', () => {
    expect(formatSgd(packageTotalCents(withoutReplacement))).toBe('$1,252.10')
  })

  it('is total-only, because the brief does not state its breakdown', () => {
    expect(withoutReplacement.kind).toBe('total-only')
  })

  it('has no replacement term', () => {
    expect(withoutReplacement.replacementTerm).toBeNull()
  })
})

describe('the two packages', () => {
  it('differ by the documented $388', () => {
    const difference = packageTotalCents(withReplacement) - packageTotalCents(withoutReplacement)
    expect(formatSgd(difference)).toBe('$388.00')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/pricing.test.ts`
Expected: FAIL — cannot resolve `../src/data/pricing`

- [ ] **Step 3: Implement**

`src/data/pricing.ts`:

```ts
import { sumCents } from '../lib/money'

export type LineItem = { readonly label: string; readonly amountCents: number }

export type ItemisedPackage = {
  readonly kind: 'itemised'
  readonly id: string
  readonly name: string
  readonly lineItems: readonly LineItem[]
  readonly replacementTerm: string | null
}

/**
 * The brief publishes this package's total but not its line-item breakdown.
 * Modelling it separately makes an invented itemisation impossible.
 */
export type TotalOnlyPackage = {
  readonly kind: 'total-only'
  readonly id: string
  readonly name: string
  readonly totalCents: number
  readonly replacementTerm: string | null
}

export type Package = ItemisedPackage | TotalOnlyPackage

export const packages: readonly Package[] = [
  {
    kind: 'itemised',
    id: 'fly-in-with-replacement',
    name: 'Fly-In With Replacement',
    replacementTerm: '1 replacement within 6 months',
    lineItems: [
      { label: 'Agent fees', amountCents: 88800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical', amountCents: 6000 },
      { label: 'Handling & transport', amountCents: 12000 },
    ],
  },
  {
    kind: 'total-only',
    id: 'fly-in-without-replacement',
    name: 'Fly-In Without Replacement',
    replacementTerm: null,
    totalCents: 125210,
  },
]

export function packageTotalCents(pkg: Package): number {
  return pkg.kind === 'itemised'
    ? sumCents(pkg.lineItems.map((item) => item.amountCents))
    : pkg.totalCents
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/pricing.test.ts`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/pricing.ts tests/pricing.test.ts
git commit -m "feat: add pricing module with derived totals"
```

---

### Task 5: WhatsApp deep-link builder

**Files:**
- Create: `src/lib/whatsapp.ts`
- Test: `tests/whatsapp.test.ts`

**Interfaces:**
- Consumes: `company` from `src/data/company`
- Produces: `whatsappUrl(phoneE164: string, message: string): string`, `defaultWhatsappUrl(): string`

- [ ] **Step 1: Write the failing tests**

`tests/whatsapp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { whatsappUrl, defaultWhatsappUrl } from '../src/lib/whatsapp'

describe('whatsappUrl', () => {
  it('strips non-digits from the E.164 number', () => {
    expect(whatsappUrl('+65 9855 6637', 'Hi')).toContain('https://wa.me/6598556637')
  })

  it('url-encodes the message', () => {
    expect(whatsappUrl('+6598556637', 'Hi there & thanks')).toContain(
      'text=Hi%20there%20%26%20thanks',
    )
  })

  it('rejects an empty number', () => {
    expect(() => whatsappUrl('', 'Hi')).toThrow(/phone number/)
  })
})

describe('defaultWhatsappUrl', () => {
  it('uses the official number and pre-filled message', () => {
    const url = defaultWhatsappUrl()
    expect(url).toContain('wa.me/6598556637')
    expect(url).toContain(encodeURIComponent('looking for a domestic helper'))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/whatsapp.test.ts`
Expected: FAIL — cannot resolve `../src/lib/whatsapp`

- [ ] **Step 3: Implement**

`src/lib/whatsapp.ts`:

```ts
import { company } from '../data/company'

export function whatsappUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  if (digits.length === 0) {
    throw new Error('whatsappUrl requires a phone number')
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function defaultWhatsappUrl(): string {
  return whatsappUrl(company.phoneE164, company.whatsappMessage)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/whatsapp.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts tests/whatsapp.test.ts
git commit -m "feat: add WhatsApp deep-link builder"
```

---

### Task 6: Tbd component and production build gate

The gate scans built HTML for the `data-tbd` attribute. Scanning output rather than source means it catches placeholders reached through any code path.

**Files:**
- Create: `src/components/Tbd.astro`, `scripts/check-tbd.mjs`
- Test: `tests/check-tbd.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `<Tbd item="..." owner="..." />`; `scripts/check-tbd.mjs <dir>` exits 1 when placeholders remain

- [ ] **Step 1: Write the failing test**

`tests/check-tbd.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/check-tbd.test.ts`
Expected: FAIL — `Cannot find module scripts/check-tbd.mjs`

- [ ] **Step 3: Implement the gate**

`scripts/check-tbd.mjs`:

```js
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/check-tbd.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Implement the component**

`src/components/Tbd.astro`:

```astro
---
interface Props {
  item: string
  owner?: string
}
const { item, owner = 'DirectHired' } = Astro.props
---

<span class="tbd" data-tbd={item} data-tbd-owner={owner}>
  TBD — {item}
</span>

<style>
  .tbd {
    display: inline-block;
    padding: 0.125em 0.5em;
    border: 1px dashed currentColor;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.85em;
    opacity: 0.75;
  }
</style>
```

- [ ] **Step 6: Verify the gate blocks a real build**

```bash
npm run build:dev && node scripts/check-tbd.mjs dist
```
Expected: exit 0 for now (no `<Tbd>` is rendered yet). Once Task 12 adds the MOM licence placeholder, this command must exit 1 — that is verified there.

- [ ] **Step 7: Commit**

```bash
git add src/components/Tbd.astro scripts/check-tbd.mjs tests/check-tbd.test.ts
git commit -m "feat: add Tbd component and production build gate"
```

---

### Task 7: Palette and typography approval gate

**This task is a human checkpoint, not code.** The spec requires colour and font values to be proposed against the official logo and approved before any component is built on them.

**Files:**
- Create: `docs/design/palette-proposal.md`

- [ ] **Step 1: Obtain the official DirectHired logo file from the user**

Do not proceed without it. If unavailable, stop and report the blockage — do not invent a palette.

- [ ] **Step 2: Load the taste skills for this decision**

Invoke `brandkit` and `high-end-visual-design`. Their purpose is precisely this: deriving a premium palette and type pairing that reads as a Singapore consumer brand rather than a recruitment portal.

- [ ] **Step 3: Propose values for every token role**

Fill in the table from spec §3.1 — `ink`, `ink-muted`, `surface`, `surface-raised`, `accent`, `accent-hover`, `deep`, `on-deep`, `border` — plus the display and text typefaces. Constraints: no corporate blue, no generic green, no red/blue recruitment palette; warm near-black rather than `#000`; warm off-white rather than `#fff`.

- [ ] **Step 4: Verify every pairing meets WCAG AA before presenting**

Use `contrastRatio` from Task 8. Any pairing below 4.5:1 for text or 3:1 for non-text is revised, not presented.

- [ ] **Step 5: Present the swatch set and await explicit approval**

- [ ] **Step 6: Commit the approved proposal**

```bash
git add docs/design/palette-proposal.md
git commit -m "docs: record approved palette and type system"
```

---

### Task 8: Contrast utility and design tokens

Task 7 depends on `contrastRatio`, so it is built here and used there; execute Step 1–5 of this task before Task 7's Step 4.

**Files:**
- Create: `src/lib/contrast.ts`, `src/styles/tokens.css`, `src/styles/global.css`
- Test: `tests/contrast.test.ts`, `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `contrastRatio(hexA: string, hexB: string): number`; CSS custom properties on `:root`

- [ ] **Step 1: Write the failing contrast tests**

`tests/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../src/lib/contrast'

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('returns 1 for identical colours', () => {
    expect(contrastRatio('#4a7c59', '#4a7c59')).toBeCloseTo(1, 5)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#333333', '#eeeeee')).toBeCloseTo(
      contrastRatio('#eeeeee', '#333333'), 5,
    )
  })

  it('accepts shorthand hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/contrast.test.ts`
Expected: FAIL — cannot resolve `../src/lib/contrast`

- [ ] **Step 3: Implement**

`src/lib/contrast.ts`:

```ts
function expand(hex: string): string {
  const raw = hex.replace('#', '')
  return raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
}

function channelLuminance(value: number): number {
  const srgb = value / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const raw = expand(hex)
  const r = channelLuminance(parseInt(raw.slice(0, 2), 16))
  const g = channelLuminance(parseInt(raw.slice(2, 4), 16))
  const b = channelLuminance(parseInt(raw.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/contrast.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit the utility**

```bash
git add src/lib/contrast.ts tests/contrast.test.ts
git commit -m "feat: add WCAG contrast ratio utility"
```

- [ ] **Step 6: Write the token contract test**

This test reads the approved values from Task 7 and enforces AA permanently. Replace the placeholder hex values below with the approved ones.

`tests/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { contrastRatio } from '../src/lib/contrast'

const css = readFileSync('src/styles/tokens.css', 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,6})`))
  if (!match) throw new Error(`Token --color-${name} not found in tokens.css`)
  return match[1]
}

describe('token contrast', () => {
  it('body text on surface meets AA', () => {
    expect(contrastRatio(token('ink'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on surface meets AA', () => {
    expect(contrastRatio(token('ink-muted'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('accent meets AA against surface', () => {
    expect(contrastRatio(token('accent'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('text on the deep brand surface meets AA', () => {
    expect(contrastRatio(token('on-deep'), token('deep'))).toBeGreaterThanOrEqual(4.5)
  })

  it('borders meet the non-text threshold', () => {
    expect(contrastRatio(token('border'), token('surface'))).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — `tokens.css` does not exist

- [ ] **Step 8: Write tokens.css using the approved values**

Structure (colour values from Task 7):

```css
:root {
  /* Colour — values approved in docs/design/palette-proposal.md */
  --color-ink: #___;
  --color-ink-muted: #___;
  --color-surface: #___;
  --color-surface-raised: #___;
  --color-accent: #___;
  --color-accent-hover: #___;
  --color-deep: #___;
  --color-on-deep: #___;
  --color-border: #___;

  /* Typography */
  --font-display: '<approved display face>', Georgia, serif;
  --font-text: '<approved text face>', system-ui, sans-serif;

  --size-body: 1rem;         /* 16px floor */
  --size-lede: 1.25rem;
  --size-h3: 1.5rem;
  --size-h2: clamp(1.75rem, 1.2rem + 2vw, 2.75rem);
  --size-h1: clamp(2.25rem, 1.5rem + 3.5vw, 4rem);

  /* Space — 4px base */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-6: 1.5rem;   --space-8: 2rem;
  --space-12: 3rem;    --space-16: 4rem;    --space-24: 6rem;
  --space-section: clamp(4rem, 2rem + 8vw, 8rem);

  /* Radius — restrained per spec §3.3 */
  --radius-sm: 3px;  --radius-md: 6px;  --radius-lg: 10px;

  /* Motion */
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 150ms;
  --duration-base: 300ms;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 9: Run to verify pass**

Run: `npx vitest run tests/tokens.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 10: Write global.css**

Modern reset plus base element styling: `box-sizing: border-box`, margin zero, `body` using `--font-text`/`--color-ink`/`--color-surface`, headings using `--font-display`, `:focus-visible` outline using `--color-accent` at 2px with 2px offset, `img { max-width: 100%; display: block }`.

- [ ] **Step 11: Commit**

```bash
git add src/styles tests/tokens.test.ts
git commit -m "feat: add design tokens with enforced AA contrast"
```

---

### Task 9: Content collections

**Files:**
- Create: `src/content/config.ts`, `src/content/services/*.md` (6), `src/content/helpers/*.md` (3), `src/content/faq/*.md` (6)
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: collections `services`, `helpers`, `faq` with Zod-validated frontmatter

- [ ] **Step 1: Write the schemas**

`src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content'

const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    summary: z.string().max(160),
    order: z.number(),
  }),
})

const helpers = defineCollection({
  type: 'content',
  schema: z.object({
    country: z.string(),
    slug: z.string(),
    flag: z.string(),
    summary: z.string().max(200),
    order: z.number(),
  }),
})

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    surfaces: z.array(z.enum(['home', 'faq', 'pricing'])),
    order: z.number(),
  }),
})

export const collections = { services, helpers, faq }
```

- [ ] **Step 2: Author the six service entries**

One file each, using exactly these titles: New Helper Placement, Transfer Helper, Direct-Hire Processing, Medical Examination, Maid Insurance, Maid Replacement. Summaries are concise — the brief forbids service walls of long paragraphs.

- [ ] **Step 3: Author the three helper-source entries**

`indonesia.md` (flag `🇮🇩`), `myanmar.md` (`🇲🇲`), `mizoram.md` (`🇮🇳`). **Mizoram's `country` field is "Mizoram", never "India".** Summaries describe DirectHired's matching approach for that source. Make no claims about any nationality's characteristics — the brief forbids stereotypes.

- [ ] **Step 4: Author six homepage FAQ entries**

Drawn from brief §37, chosen for search intent: cost, what the fly-in package includes, new vs transfer helpers, available source countries, how matching works, how to submit requirements. Answer only what the brief verifies; anything else uses `<Tbd>`.

- [ ] **Step 5: Write the content test**

`tests/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

describe('helper sources', () => {
  const files = readdirSync('src/content/helpers')

  it('has the three current sources', () => {
    expect(files.sort()).toEqual(['indonesia.md', 'mizoram.md', 'myanmar.md'])
  })

  it('never labels Mizoram as India', () => {
    const content = readFileSync('src/content/helpers/mizoram.md', 'utf8')
    expect(content).not.toMatch(/\bIndia\b/)
  })
})

describe('services', () => {
  it('has the six current services', () => {
    expect(readdirSync('src/content/services')).toHaveLength(6)
  })
})
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 7: Commit**

```bash
git add src/content tests/content.test.ts
git commit -m "feat: add content collections for services, sources, and FAQ"
```

---

### Task 10: Layout primitives

**Files:**
- Create: `src/components/Container.astro`, `Button.astro`, `Card.astro`, `SectionHeader.astro`

**Interfaces:**
- Consumes: tokens from `src/styles/tokens.css`
- Produces: `<Container>`, `<Button variant href>`, `<Card>`, `<SectionHeader eyebrow title lede>`

- [ ] **Step 1: Container**

```astro
---
interface Props { width?: 'default' | 'narrow' }
const { width = 'default' } = Astro.props
---
<div class:list={['container', width]}><slot /></div>
<style>
  .container { width: 100%; margin-inline: auto; padding-inline: var(--space-6); }
  .default { max-width: 72rem; }
  .narrow  { max-width: 48rem; }
</style>
```

- [ ] **Step 2: Button**

```astro
---
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  href: string
  external?: boolean
}
const { variant = 'primary', href, external = false } = Astro.props
const rel = external ? 'noopener noreferrer' : undefined
const target = external ? '_blank' : undefined
---
<a class:list={['btn', variant]} href={href} rel={rel} target={target}><slot /></a>
<style>
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-md);
    font-family: var(--font-text); font-weight: 600;
    text-decoration: none;
    transition: background-color var(--duration-fast) var(--ease),
                transform var(--duration-fast) var(--ease);
  }
  .btn:hover { transform: translateY(-1px); }
  .primary { background: var(--color-accent); color: var(--color-surface); }
  .primary:hover { background: var(--color-accent-hover); }
  .secondary { background: transparent; color: var(--color-ink);
               border: 1px solid var(--color-border); }
  .ghost { background: transparent; color: var(--color-ink); padding-inline: 0; }
</style>
```

- [ ] **Step 3: Card and SectionHeader**

`Card.astro` — `--color-surface-raised` background, `--radius-lg`, `--space-8` padding, subtle border via `--color-border`, hover elevation transition.

`SectionHeader.astro` — props `eyebrow?`, `title`, `lede?`. Renders eyebrow as small uppercase `--color-ink-muted`, title as `h2` in `--font-display` at `--size-h2`, lede at `--size-lede` in `--color-ink-muted`, constrained to ~60ch.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build:dev`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: add layout primitives"
```

---

### Task 11: Layout shell — header, nav, footer, mobile CTA

**Files:**
- Create: `src/components/Header.astro`, `MobileNav.astro`, `Footer.astro`, `MobileCtaBar.astro`, `src/layouts/BaseLayout.astro`
- Create: `src/lib/nav.ts`

**Interfaces:**
- Consumes: `company`, `defaultWhatsappUrl`, `Button`, `Container`
- Produces: `navItems` from `src/lib/nav.ts`; `<BaseLayout title description>`

- [ ] **Step 1: Define navigation once**

`src/lib/nav.ts`:

```ts
export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Find Your Helper', href: '/find-your-helper' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Helper Sources', href: '/helpers' },
  { label: 'Why DirectHired', href: '/why-directhired' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
] as const

export const legalItems = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'PDPA Notice', href: '/pdpa' },
  { label: 'Disclaimer', href: '/disclaimer' },
] as const
```

- [ ] **Step 2: Header**

Logo left, `navItems` centre, CTAs right: secondary `WhatsApp Us` then primary `Submit Your Requirements` — in that order, always. Both use `Button`; the requirement CTA's href is `company.requirementFormUrl`, the WhatsApp CTA's is `defaultWhatsappUrl()` with `external`.

- [ ] **Step 3: MobileNav island**

The only JS in the header. `<script>` toggles an `aria-expanded` button and a full-screen panel. Panel lists `navItems`, then both CTAs at full width with the primary first. Traps focus while open; closes on `Escape`.

- [ ] **Step 4: MobileCtaBar**

Fixed bottom bar, `display: none` above the tablet breakpoint. Contains both CTAs, primary given visual weight. Add `padding-bottom: env(safe-area-inset-bottom)` and a matching `body` bottom padding so it never occludes content.

- [ ] **Step 5: Footer**

Four groups per brief §76: company blurb; `navItems`; contact block (`phoneDisplay` as a `tel:` link, `email` as `mailto:`, address, opening hours); social links to `company.socials`. `legalItems` in a bottom bar.

- [ ] **Step 6: BaseLayout**

```astro
---
import '../styles/tokens.css'
import '../styles/global.css'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
import MobileCtaBar from '../components/MobileCtaBar.astro'

interface Props { title: string; description: string }
const { title, description } = Astro.props
const canonical = new URL(Astro.url.pathname, Astro.site).href
---
<!doctype html>
<html lang="en-SG">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />
    <slot name="head" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main"><slot /></main>
    <Footer />
    <MobileCtaBar />
  </body>
</html>
```

- [ ] **Step 7: Verify build**

Run: `npm run build:dev`
Expected: build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/components src/layouts src/lib/nav.ts
git commit -m "feat: add layout shell with header, nav, footer, mobile CTA"
```

---

### Task 12: Homepage blocks 01–05

**Files:**
- Create: `src/sections/Hero.astro`, `TrustBar.astro`, `Problem.astro`, `Difference.astro`, `Process.astro`
- Create: `src/components/TrustBadge.astro`, `src/components/ProcessStep.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `company`, `Button`, `Container`, `SectionHeader`, `Card`, `Tbd`
- Produces: five section components taking no props; `<TrustBadge label>` wrapping slotted content; `<ProcessStep index label description>`

Build the two components before the sections that use them:

- `TrustBadge.astro` — props `label: string`, default slot for the value. Renders label in `--color-ink-muted` at small size above the slotted value; accepts a `<Tbd>` in the slot without special-casing.
- `ProcessStep.astro` — props `index: number`, `label: string`, `description: string`. Renders the index as a typographic marker in `--font-display`, not a filled circle.

- [ ] **Step 1: Hero**

`h1` — the page's only one — reads **"Find the Right Helper for Your Family"**. Lede: "Every family is different. We take the time to understand your needs before recommending a helper." CTAs: primary `Submit Your Requirements`, secondary `WhatsApp Us`.

Split composition per brief §54: family on one side, helper on the other, communicating "better match". Use `astro:assets` with explicit `width`/`height`. Placeholder imagery only — **never captioned or described as actual DirectHired families, helpers, or staff.**

- [ ] **Step 2: TrustBar**

Three items: MOM licence, "Since 2022", "1,000+ Helpers Placed". The licence number is unverified, so:

```astro
<TrustBadge label="MOM Licensed">
  <Tbd item="MOM licence number" />
</TrustBadge>
```

- [ ] **Step 3: Verify the gate now blocks production**

```bash
npm run build:dev && node scripts/check-tbd.mjs dist; echo "exit: $?"
```
Expected: exit 1, output naming "MOM licence number" and `index.html`. This proves the gate works against real output, not just fixtures.

- [ ] **Step 4: Problem**

Headline **"Finding a helper shouldn't be a guessing game."** Three cards: Not the right fit / Unclear pricing / Previous bad experiences. Copy stays short and transitions into Difference.

- [ ] **Step 5: Difference**

Headline **"We understand first. We recommend second."** Lead with the origin story — DirectHired was created after seeing families struggle with agencies focused on filling vacancies rather than finding the right fit — then the three pillars: Better Matching, Transparent Pricing, Personalised Service. This block absorbs brief §35; there is no separate "Why DirectHired" homepage section.

- [ ] **Step 6: Process**

Headline **"A better match starts with understanding."** Five steps: Understand your family → Understand your needs → Recommend suitable helpers → Interview & decide → Support the placement. Render as a visual progression with a connecting rule, not numbered boxes. Never describe this as automated or AI-driven.

- [ ] **Step 7: Compose them in index.astro**

- [ ] **Step 8: Commit**

```bash
git add src/sections src/pages/index.astro
git commit -m "feat: add homepage blocks 01-05"
```

---

### Task 13: Homepage blocks 06–09

**Files:**
- Create: `src/sections/PricingSection.astro`, `TwoSidedMatch.astro`, `HelperSources.astro`, `Services.astro`
- Create: `src/components/PricingCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `packages`, `packageTotalCents`, `formatSgd`, the `helpers` and `services` collections
- Produces: `<PricingCard pkg />` taking a single `Package` prop

Build `PricingCard.astro` first. It branches on `pkg.kind`: an `itemised` package renders its line items, a `total-only` package renders its total alone. Because `TotalOnlyPackage` has no `lineItems` property, TypeScript rejects any attempt to itemise it — the §4.2 constraint is enforced by the compiler rather than by care.

- [ ] **Step 1: PricingSection**

Headline **"Transparent Pricing. No Guesswork."** Render both packages via `packageTotalCents` + `formatSgd` — never a hardcoded price string.

For the itemised package, list its six components. For the total-only package, show its total and **do not render an inclusion list**; the `kind` discriminant makes this a type error rather than a judgement call.

Include the qualifier verbatim: *"Additional helper placement-related fees may apply depending on the selected helper and placement arrangement."* CTA `View Pricing` → `/pricing`. No discount or sale language.

- [ ] **Step 2: TwoSidedMatch**

The emotional peak and the only block using `--color-deep` / `--color-on-deep`. Employer side — family needs, lifestyle, household responsibilities, skills required, expectations. Helper side — skills, experience, expectations, suitable responsibilities, working environment. Resolves to **"Better matching happens when both sides are understood."**

Show it as composition per brief §83. Use "Happy Employer. Happy Helper." here and sparingly elsewhere — §3 warns against making it a slogan repeated in every section.

- [ ] **Step 3: HelperSources**

Headline **"Helpers from trusted sources"**. Map over the `helpers` collection — never hardcode three cards, so a fourth entry appears without a layout change. Each card links to `/helpers/{slug}`.

- [ ] **Step 4: Services**

Map over the `services` collection, six cards, concise copy, each linking to `/services/{slug}`.

- [ ] **Step 5: Verify build**

Run: `npm run build:dev`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/sections src/pages/index.astro
git commit -m "feat: add homepage blocks 06-09"
```

---

### Task 14: Conditional blocks and homepage completion

**Files:**
- Create: `src/sections/MeetHelpers.astro`, `Reviews.astro`, `Faq.astro`, `FinalCta.astro`
- Create: `src/content/helper-profiles/.gitkeep`, `src/content/reviews/.gitkeep`
- Modify: `src/content/config.ts`, `src/pages/index.astro`
- Test: `tests/conditional-blocks.test.ts`

**Interfaces:**
- Consumes: `faq` collection, empty `helperProfiles` and `reviews` collections
- Produces: blocks that omit entirely when their collection is empty

- [ ] **Step 1: Add the two gated collections to config.ts**

```ts
const helperProfiles = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(), nationality: z.string(),
    placementType: z.enum(['new', 'transfer']),
    skills: z.array(z.string()), experienceYears: z.number(),
  }),
})

const reviews = defineCollection({
  type: 'content',
  schema: z.object({
    author: z.string(), rating: z.number().min(1).max(5),
    source: z.literal('google'), date: z.string(),
  }),
})
```

Register them with keys matching the directory names exactly — Astro resolves `getCollection('helper-profiles')` against the key, not the variable:

```ts
export const collections = {
  services,
  helpers,
  faq,
  'helper-profiles': helperProfiles,
  reviews,
}
```

Both start empty. Populating them requires verified data from DirectHired — never author entries.

- [ ] **Step 2: Write the conditional test**

`tests/conditional-blocks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('conditional homepage blocks', () => {
  it('MeetHelpers guards on a non-empty collection', () => {
    const source = readFileSync('src/sections/MeetHelpers.astro', 'utf8')
    expect(source).toMatch(/length\s*[>!]/)
  })

  it('Reviews guards on a non-empty collection', () => {
    const source = readFileSync('src/sections/Reviews.astro', 'utf8')
    expect(source).toMatch(/length\s*[>!]/)
  })

  it('neither block invents fallback content', () => {
    for (const file of ['MeetHelpers', 'Reviews']) {
      const source = readFileSync(`src/sections/${file}.astro`, 'utf8')
      expect(source).not.toMatch(/lorem|placeholder name|example review/i)
    }
  })
})
```

- [ ] **Step 3: Implement MeetHelpers and Reviews**

Each begins:

```astro
---
import { getCollection } from 'astro:content'
const profiles = await getCollection('helper-profiles')
---
{profiles.length > 0 && (
  <section>...</section>
)}
```

The block returns nothing when empty — no empty shell, no gap, no placeholder. Note these are *not* `<Tbd>` instances: an absent section is honest, so it must not fail the build.

- [ ] **Step 4: Faq**

Filter the `faq` collection to `surfaces` containing `'home'`, take six. Render as an accordion island using `<details>`/`<summary>` — native disclosure needs no JavaScript and is keyboard-accessible by default. Link to `/faq`.

- [ ] **Step 5: FinalCta**

Headline **"Tell us what your family needs."** Supporting copy: "Take the first step toward finding a helper who fits your family's needs." Primary `Submit Your Requirements`, secondary `WhatsApp Us`.

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run tests/conditional-blocks.test.ts && npm run build:dev`
Expected: PASS, 3 tests; build succeeds; homepage flows 09 → 11 with no gap

- [ ] **Step 7: Commit**

```bash
git add src/sections src/content src/pages/index.astro tests/conditional-blocks.test.ts
git commit -m "feat: add conditional blocks and complete homepage"
```

---

### Task 15: Structured data and SEO head

**Files:**
- Create: `src/lib/structured-data.ts`, `public/robots.txt`
- Modify: `src/pages/index.astro`
- Test: `tests/structured-data.test.ts`

**Interfaces:**
- Consumes: `company`
- Produces: `employmentAgencySchema(): object`, `faqPageSchema(items): object`

- [ ] **Step 1: Write the failing test**

`tests/structured-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { employmentAgencySchema, faqPageSchema } from '../src/lib/structured-data'

describe('employmentAgencySchema', () => {
  const schema: any = employmentAgencySchema()

  it('declares the precise schema.org type', () => {
    expect(schema['@type']).toBe('EmploymentAgency')
  })

  it('carries the verified Singapore address', () => {
    expect(schema.address.postalCode).toBe('730119')
    expect(schema.address.addressCountry).toBe('SG')
  })

  it('carries the official phone number', () => {
    expect(schema.telephone).toBe('+6598556637')
  })

  it('omits aggregateRating, which is unverified', () => {
    expect(schema.aggregateRating).toBeUndefined()
  })
})

describe('faqPageSchema', () => {
  it('maps questions to Question entities', () => {
    const schema: any = faqPageSchema([{ question: 'How much?', answer: 'It depends.' }])
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity[0]['@type']).toBe('Question')
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('It depends.')
  })
})
```

The `aggregateRating` assertion matters: emitting an invented rating would be both a §78 violation and a Google structured-data penalty.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/structured-data.test.ts`
Expected: FAIL — cannot resolve `../src/lib/structured-data`

- [ ] **Step 3: Implement**

`src/lib/structured-data.ts`:

```ts
import { company } from '../data/company'

export function employmentAgencySchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    name: company.name,
    description: company.legalDescription,
    telephone: company.phoneE164,
    email: company.email,
    url: 'https://www.directhired.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.locality,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    areaServed: { '@type': 'Country', name: 'Singapore' },
    sameAs: [company.socials.facebook, company.socials.instagram],
    // aggregateRating deliberately omitted until verified.
  }
}

export function faqPageSchema(items: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/structured-data.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Inject into the homepage via the head slot**

```astro
<script type="application/ld+json" set:html={JSON.stringify(employmentAgencySchema())} slot="head" />
```

- [ ] **Step 6: Add robots.txt**

```
User-agent: *
Allow: /

Sitemap: https://www.directhired.com/sitemap-index.xml
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/structured-data.ts public/robots.txt src/pages/index.astro tests/structured-data.test.ts
git commit -m "feat: add structured data and robots.txt"
```

---

### Task 16: Link integrity and the generated production checklist

**Files:**
- Create: `scripts/generate-info-required.mjs`
- Test: `tests/links.test.ts`

**Interfaces:**
- Consumes: built `dist/`
- Produces: `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`

- [ ] **Step 1: Write the failing link test**

`tests/links.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { company } from '../src/data/company'

beforeAll(() => { execSync('npm run build:dev', { stdio: 'inherit' }) }, 180_000)

function sources(dir = 'src'): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? sources(full) : [full]
  })
}

describe('CTA integrity', () => {
  it('no component hardcodes the requirement-form URL', () => {
    const offenders = sources()
      .filter((f) => !f.endsWith('company.ts'))
      .filter((f) => readFileSync(f, 'utf8').includes('/employer-requirement'))
    expect(offenders).toEqual([])
  })

  it('the built homepage links to the configured form URL', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).toContain(company.requirementFormUrl)
  })

  it('the built homepage links to the official WhatsApp number', () => {
    expect(readFileSync('dist/index.html', 'utf8')).toContain('wa.me/6598556637')
  })

  it('never uses "Contact Us" as a primary CTA', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).not.toMatch(/class="btn primary"[^>]*>\s*Contact Us/)
  })

  it('never promises a perfect match', () => {
    expect(readFileSync('dist/index.html', 'utf8')).not.toMatch(/perfect match/i)
  })

  it('has exactly one h1', () => {
    const matches = readFileSync('dist/index.html', 'utf8').match(/<h1[\s>]/g) ?? []
    expect(matches).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure or pass**

Run: `npx vitest run tests/links.test.ts`
Expected: PASS if Tasks 11–14 were done correctly. Any failure names a real violation — fix the component, not the test.

- [ ] **Step 3: Write the checklist generator**

`scripts/generate-info-required.mjs` scans `dist/` for `data-tbd` attributes (category A) and `src/content/` for empty gated collections (category B), then writes `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` with both sections, each item naming what is needed and which build stage it blocks.

- [ ] **Step 4: Run it and confirm output**

```bash
npm run build:dev && node scripts/generate-info-required.mjs
```
Expected: the file lists the MOM licence number under category A, and helper profiles plus Google reviews under category B.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-info-required.mjs tests/links.test.ts docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md
git commit -m "feat: add link integrity tests and generated production checklist"
```

---

### Task 17: Responsive verification and accessibility audit

**Files:**
- Modify: section components as defects are found

- [ ] **Step 1: Install audit tooling**

```bash
npm install -D @axe-core/cli
```

- [ ] **Step 2: Run axe against the built homepage**

```bash
npm run build:dev && npx astro preview &
npx axe http://localhost:4321 --exit
```
Expected: zero violations. Fix any found — do not suppress.

- [ ] **Step 3: Verify each breakpoint**

Check 375px, 768px, 1280px, 1920px. Per brief §62, sections are **recomposed**, not scaled down. Confirm specifically: the hero split becomes stacked on mobile; `MobileCtaBar` never occludes the footer or final CTA; nav collapses cleanly; no horizontal overflow at any width.

- [ ] **Step 4: Verify reduced motion**

Enable the OS reduced-motion setting, reload, and confirm all scroll reveals and transitions are suppressed.

- [ ] **Step 5: Verify keyboard navigation**

Tab through the entire page. Every interactive element must be reachable with a visible focus ring. The mobile menu must trap focus while open and close on `Escape`.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address responsive and accessibility audit findings"
```

---

### Task 18: Performance budget in CI

**Files:**
- Create: `.github/workflows/ci.yml`, `lighthouserc.json`

- [ ] **Step 1: Add the Lighthouse budget**

`lighthouserc.json`:

```json
{
  "ci": {
    "collect": { "staticDistDir": "./dist", "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1 }],
        "categories:seo": ["error", { "minScore": 1 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

- [ ] **Step 2: Add the workflow**

Runs on push and PR: `npm ci`, `npm test`, `npm run build:dev`, `npx @lhci/cli autorun`.

Note: CI uses `build:dev`, which skips the TBD gate. That is deliberate — the gate must not block development builds while the MOM licence number is outstanding. `npm run build` (with the gate) is the release command.

- [ ] **Step 3: Verify locally**

```bash
npm ci && npm test && npm run build:dev && npx @lhci/cli autorun
```
Expected: all assertions pass. If LCP exceeds budget, the cause is almost certainly the hero image — check that it is AVIF/WebP, correctly sized, and preloaded.

- [ ] **Step 4: Commit**

```bash
git add .github lighthouserc.json
git commit -m "ci: add test and Lighthouse performance budget"
```

---

## Verification

Sub-project 1 is complete when:

```bash
npm test                    # all suites pass
npm run build:dev           # succeeds
npm run build               # FAILS on the MOM licence Tbd — this is correct
npx @lhci/cli autorun       # meets the §8 budget
npx axe http://localhost:4321 --exit   # zero violations
```

The failing `npm run build` is the acceptance criterion for the TBD gate, not a defect. It passes only once DirectHired supplies the MOM licence number.

## Handoff to sub-project 2

The following are established and should be reused rather than rebuilt: design tokens, layout primitives, `BaseLayout`, header/footer/mobile CTA, all data modules, content collections, the `<Tbd>` mechanism, structured-data helpers, and the link-integrity test — which should be extended to cover each new page as it is added.
