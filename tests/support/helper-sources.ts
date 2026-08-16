/**
 * "Never name the Philippines or any source beyond Indonesia, Myanmar and
 * Mizoram" (design spec §7, master brief §22) — implemented as the
 * ALLOWLIST the sentence actually is.
 *
 * WHAT WAS WRONG WITH THE OLD SHAPE. Both copies of the rule —
 * tests/pages.test.ts's FORBIDDEN_CLAIMS entry and tests/content.test.ts's
 * FORBIDDEN_SOURCE — were a four-name DENYLIST: Philippines, Sri Lanka,
 * Cambodia, Bangladesh, plus the Filipino/Filipina spellings. Those are the
 * four a Singapore agency writer reaches for by habit, so the denylist
 * covered the likely mistake and nothing else. Appending "We also place
 * helpers from Nepal and Thailand." to src/content/services/transfer-helper.md
 * scored a full green suite — verified by mutation before this file existed.
 * The rule is unbounded on its face ("any source beyond"), and an unbounded
 * rule cannot be enumerated as the set of things it forbids.
 *
 * THE APPROACH, AND THE TWO REJECTED.
 *
 *   CHOSEN — invert it: enumerate what a source CAN be (every country on
 *   earth, derived), subtract the three that are permitted and the two
 *   places that are named on this site for reasons that are not a helper
 *   source, and flag whatever is left. The country list is DERIVED from
 *   Node's own ICU data via Intl.DisplayNames over the ISO 3166-1 alpha-2
 *   space — 260-odd names nobody in this repo maintains, that arrive with
 *   the runtime and cannot go stale against a hand-kept file. Demonyms are
 *   handled by a fixed suffix set on each name ("Cambodia" → Cambodian,
 *   "Nepal" → Nepali/Nepalese, "Bangladesh" → Bangladeshi, "Vietnam" →
 *   Vietnamese) plus a short irregulars list for the ones no suffix rule
 *   produces (Filipino, Filipina, Thai, Khmer...).
 *
 *   REJECTED — "a longer denylist of source-country and nationality words
 *   broad enough to cover plausible mistakes". It is the same shape as the
 *   defect: it covers the countries somebody thought of, on a rule whose
 *   whole point is the country nobody thought of. It also has no natural
 *   stopping point, so its length becomes an argument that it is "broad
 *   enough" — which is exactly what the four-name version looked like.
 *
 *   REJECTED — "detect the syntactic frame: helpers from X, sourced from X,
 *   X helpers, and assert X is permitted". Attractive, and strictly weaker
 *   than what shipped: it cannot see a bare naming. "Sri Lanka and Cambodia
 *   and Bangladesh." — the exact string tests/content.test.ts already
 *   asserts the guard fires on — carries no frame at all, so adopting this
 *   would have meant DELETING a passing assertion to make the new one fit.
 *   Frames also multiply without bound ("we work with", "our partners in",
 *   "arriving from", a bulleted list under a "Sources" heading), which puts
 *   the enumeration problem back where it started, one level up.
 *
 * WHAT THIS IS NOT. It is not a replacement for the four-name denylist. Both
 * guards keep theirs verbatim, and keep the assertion that the two copies
 * stay byte-identical: those patterns are case-insensitive and stem-based
 * ("philippin\w*"), so they catch a lowercased or mangled spelling that a
 * proper-noun sweep can miss. This runs ALONGSIDE them — braces, not a new
 * belt.
 *
 * FALSE POSITIVES ARE THE FAILURE MODE THAT MATTERS. A guard that fires on
 * legitimate copy teaches the next person to loosen it, which is the one
 * thing an allowlist must never invite. Two exemptions exist and both are
 * recorded in EXEMPT_PLACES with their reason. Measured before this file was
 * committed: across all content markdown, every .astro source and every
 * built page, this sweep matches NOTHING today.
 *
 * If a future testimonial names a person "Jordan" or a "Georgia", this will
 * fire. That is the designed behaviour, not a bug: on a rule shaped as an
 * allowlist, anything place-shaped has to be justified once, out loud, by
 * adding it to EXEMPT_PLACES with a reason. The failure names the file and
 * the exact word, so the decision takes a minute and leaves a diff.
 */

/** Design spec §7. The only three sources this site may ever name. */
export const PERMITTED_SOURCES = ['Indonesia', 'Myanmar', 'Mizoram'] as const

/**
 * Places this site names for a reason that is NOT a helper source. Each
 * entry is an exemption from the sweep and needs the sentence that justifies
 * it, because a silent entry here is how an allowlist becomes a denylist
 * again.
 */
export const EXEMPT_PLACES: ReadonlyMap<string, string> = new Map([
  [
    'Singapore',
    'Where the business operates, where the employer lives and where every helper is placed. It is the destination, never a source, and it appears in the company address, the page titles, the structured data and most headlines on the site.',
  ],
  [
    'India',
    'Mizoram is a STATE OF INDIA, so the word is unavoidable in any sentence that says what Mizoram is. It is not exempt from the site\'s rules — a dedicated, STRICTER rule bans it outright in copy a visitor reads ("never names India in copy a visitor reads" in tests/content.test.ts, and the "India named in copy a visitor reads" claim in tests/pages.test.ts), over the same two corpora this sweep runs on. Flagging it here as well would add no coverage and would point a failure at the wrong rule. That coupling is asserted, not assumed — see the exemption tests in tests/content.test.ts.',
  ],
])

/**
 * Names ICU does not produce for spellings an English-language writer in
 * Singapore actually types, and demonyms no suffix rule derives.
 *
 * Deliberately short and deliberately conservative: this is the one hand-kept
 * list in the file, so anything ambiguous stays out of it. "Chinese" is
 * absent on purpose — "China" is caught by the derived list, while the
 * demonym collides with a language name that legitimate copy about a helper
 * could carry.
 *
 * MATCHED CASE-INSENSITIVELY. None of these is an English word in lower
 * case, and a mangled spelling of the Philippines is the single likeliest
 * way this rule gets broken, so the cost of `i` here is nil and the cover
 * is real. The one entry that could not stay is below.
 */
const IRREGULAR_SOURCE_WORDS = [
  // The Philippines, in the spellings that are not "Philippines".
  'Filipino',
  'Filipina',
  'Philippine',
  'Pinoy',
  // Demonyms and short forms with no regular derivation from the ICU name.
  'Thai', // "Thailand" + no suffix rule yields this
  'Khmer', // Cambodia
  'Lao', // "Laos" is in the derived list; this is the demonym
  'Ivory Coast', // ICU says "Côte d'Ivoire"
  'East Timor', // ICU says "Timor-Leste"
]

/**
 * Irregulars whose lower-case form is an ordinary English word, matched
 * CASE-SENSITIVELY for the same reason the derived names are.
 *
 * ICU says "Türkiye", so "Turkey" reaches this sweep only by being written
 * down here — and written down with the `i` flag it fired on the bird. A
 * one-entry list looks like an oddity until you notice that the derived
 * names needed exactly the same treatment for exactly the same reason
 * (jersey, chad); this is that rule applied to the hand-kept half rather
 * than a special case carved out of it.
 */
const CASE_SENSITIVE_IRREGULARS = [
  'Turkey', // ICU says "Türkiye"; a writer says "Turkey" — and roasts one
]

/**
 * Suffixes that turn a place name into the word for its people. Fixed and
 * short ON PURPOSE: an open-ended `\w*` on 260 stems produces real English
 * words ("Mali" → "malign", "Chad" → "chads") and a guard that fires on
 * ordinary prose gets deleted. Every suffix here is one that forms a demonym
 * from at least one real country name.
 */
const DEMONYM_SUFFIXES = ['s', 'n', 'ns', 'an', 'ans', 'ian', 'ians', 'ese', 'ish', 'i', 'is']

/** Every region name ICU knows, in English. */
function regionNames(): string[] {
  const display = new Intl.DisplayNames(['en'], { type: 'region' })
  const names = new Set<string>()
  for (let a = 65; a <= 90; a += 1) {
    for (let b = 65; b <= 90; b += 1) {
      const code = String.fromCharCode(a) + String.fromCharCode(b)
      let name: string | undefined
      try {
        name = display.of(code)
      } catch {
        continue
      }
      // Unassigned codes come back as the code itself.
      if (!name || name === code) continue
      // "Myanmar (Burma)" is one name and one alias. Both are real spellings
      // a writer might use, so both are indexed — which is how "Burma" ends
      // up PERMITTED rather than flagged.
      const alias = name.match(/\(([^)]*)\)/)
      if (alias) names.add(alias[1].trim())
      names.add(name.replace(/\s*\([^)]*\)/g, '').trim())
    }
  }
  return [...names].filter(Boolean)
}

/** The permitted three, the alias ICU carries for one of them, and the exemptions. */
function permittedNames(): Set<string> {
  return new Set<string>([
    ...PERMITTED_SOURCES,
    'Burma', // the alias ICU carries for Myanmar
    ...EXEMPT_PLACES.keys(),
  ])
}

function withoutPermitted(names: string[]): string[] {
  const permitted = permittedNames()
  return [...new Set(names)]
    .filter((name) => !permitted.has(name))
    .sort((a, b) => b.length - a.length) // longest first: "Sri Lanka" before "Sri"
}

/**
 * Every place-name this sweep will flag: ICU's regions plus the irregulars,
 * minus the three permitted sources, their aliases, and the exemptions.
 *
 * Both case classes together — this is the list of NAMES, and which of them
 * a lower-case spelling reaches is a property of the patterns below.
 */
export function forbiddenPlaceNames(): string[] {
  return withoutPermitted([
    ...regionNames(),
    ...IRREGULAR_SOURCE_WORDS,
    ...CASE_SENSITIVE_IRREGULARS,
  ])
}

/**
 * The two alternations this sweep applies, each over every forbidden name in
 * its case class, with the demonym suffixes applied to the whole group.
 *
 * Literal spaces become `\s+` because a name can wrap across a line in
 * markdown — the reason the old pattern wrote `sri\s?lank\w*` rather than
 * "Sri Lanka".
 *
 * FIX ROUND, F-3. Both were one pattern carrying `i`. Case-folding 260-odd
 * derived names over English prose is a false-positive machine: `turkey` the
 * roast, `jersey` the laundry and `chad` all fired, none of which is a
 * sentence about where a helper comes from. A guard that fires on ordinary
 * nouns is the one this file's own docblock says gets loosened rather than
 * fixed.
 *
 * The derived names are therefore matched as what they are — PROPER NOUNS,
 * capitalised in any copy a visitor would read. That is a narrowing, and the
 * thing it gives up is a lower-cased spelling of a country nobody has ever
 * written here. What it does NOT give up is the case that actually happens:
 * the four habitual names are independently banned, case-insensitively and
 * stem-based, by FORBIDDEN_SOURCE in tests/content.test.ts and the matching
 * FORBIDDEN_CLAIMS entry in tests/pages.test.ts, over these same two corpora
 * — so lower-case "philippines" still fails, and so does "filipina". Braces,
 * not a new belt, exactly as this file said when it arrived.
 */
export function forbiddenPlacePatterns(): RegExp[] {
  const alternation = (names: string[], flags: string) => {
    const alternatives = names.map((name) =>
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
    )
    return new RegExp(`\\b(?:${alternatives.join('|')})(?:${DEMONYM_SUFFIXES.join('|')})?\\b`, flags)
  }
  return [
    alternation(withoutPermitted([...regionNames(), ...CASE_SENSITIVE_IRREGULARS]), 'g'),
    alternation(withoutPermitted([...IRREGULAR_SOURCE_WORDS]), 'gi'),
  ]
}

/**
 * Every place named in `text` that is not one of the three permitted sources
 * and not an exempt place. Distinct, in the order found — merged by position
 * rather than by pattern, so which case class caught a name is invisible to
 * every caller.
 */
export function namedSources(text: string): string[] {
  const hits: { at: number; word: string }[] = []
  for (const pattern of forbiddenPlacePatterns()) {
    for (const match of text.matchAll(pattern)) hits.push({ at: match.index ?? 0, word: match[0] })
  }
  return [...new Set(hits.sort((a, b) => a.at - b.at).map((hit) => hit.word))]
}
