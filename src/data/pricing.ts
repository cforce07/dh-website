import { sumCents } from '../lib/money'

/**
 * A row on a pricing card: what it is called, and what it costs.
 *
 * ONE LINE-ITEM LABEL SAYS MORE THAN THE PRICE LIST DID, AND ONLY ONE.
 *
 * DirectHired confirmed on 2026-08-16 (spec §2.6.10, §2.6.11) that
 * `Medical` and `Insurance` are two different obligations: `Medical`
 * ($60.00) is the pre-employment medical checkup, and `Insurance`
 * ($425.10) buys the two policies MOM requires, one of which IS medical
 * insurance.
 *
 * That last clause is the whole problem. A bare `Medical` four rows under
 * a bare `Insurance` does not merely read as vague — the wrong reading,
 * "this is the medical part of the insurance", names a real thing in the
 * same package, and a reader who takes it concludes that a year of
 * hospitalisation cover cost $60.00. So `Medical` is now `Medical
 * checkup`: one word, DirectHired's own ("pre-employment medical
 * checkup"), and it is the smallest edit that makes the row say which
 * obligation it is.
 *
 * `INSURANCE IS DELIBERATELY LEFT ALONE.` It is accurate and complete for
 * what it buys, and once the row below it stops competing for the word
 * "medical" it is no longer ambiguous — the distinction is drawn by
 * disambiguating one label, not two. Expanding it to name both policies
 * would put policy detail into a price table, duplicate the FAQ answer
 * that exists for it, and invite a reader to look for a split of the
 * $425.10 that DirectHired has never supplied.
 *
 * NO LAYOUT RISK, and it was checked rather than assumed: `Handling &
 * transport` is 20 characters and already the longest label these cards
 * render, so a 15-character one introduces no wrap that the component's
 * reserved-height notes do not already cover.
 *
 * These labels are rendered copy. PricingCard prints them, and both
 * src/sections/ReplacementTerms.astro and src/pages/pricing.astro DERIVE
 * their component lists from this array, so a rename here reaches all
 * three without being retyped. The two FAQ entries that reprint the
 * breakdown in prose cannot import this file; tests/pricing.test.ts holds
 * them to it instead.
 */
export type LineItem = { readonly label: string; readonly amountCents: number }

/**
 * Who DirectHired recommends a package TO, or `null` for no recommendation.
 *
 * AN AUDIENCE, NOT A VERDICT, and the type is this shape to keep it that
 * way. DirectHired confirmed on 2026-08-16 (core-pages design spec §2.6.3)
 * that they recommend the with-replacement package to FIRST-TIME EMPLOYERS.
 * That is the whole of the supplied fact. A boolean `recommended` flag would
 * have published a stronger claim than the client made — "this is the better
 * package" rather than "this is the one for a reader in this situation" —
 * and the without-replacement package remains the right choice for an
 * experienced employer, which no copy may contradict.
 *
 * So the field holds the audience, PricingCard renders "Recommended for
 * {audience}", and the qualifier cannot be dropped by accident: there is no
 * value of this field that produces a bare "Recommended".
 *
 * At most one package may carry it — asserted in tests/pricing.test.ts.
 * Two recommendations is a contradiction, and zero is a silent regression.
 */
export type RecommendedFor = string | null

export type ItemisedPackage = {
  readonly kind: 'itemised'
  readonly id: string
  readonly name: string
  readonly lineItems: readonly LineItem[]
  readonly replacementTerm: string | null
  readonly recommendedFor: RecommendedFor
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
  readonly recommendedFor: RecommendedFor
}

export type Package = ItemisedPackage | TotalOnlyPackage

export const packages: readonly Package[] = [
  {
    kind: 'itemised',
    id: 'fly-in-with-replacement',
    name: 'Fly-In With Replacement',
    replacementTerm: '1 replacement within 6 months',
    // DirectHired, 2026-08-16 (spec §2.6.3), answering "do you recommend the
    // with-replacement package to first-time employers?" — yes. The audience
    // is the fact; see RecommendedFor above for why it is stored rather than
    // a boolean.
    recommendedFor: 'first-time employers',
    lineItems: [
      { label: 'Agent fees', amountCents: 88800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical checkup', amountCents: 6000 },
      { label: 'Handling & transport', amountCents: 12000 },
    ],
  },
  {
    // Was 'total-only' at $1,252.10 while the breakdown was unknown — the
    // master brief published that total but never said which line item the
    // difference came off, so an itemisation would have been invented.
    //
    // DirectHired supplied the real breakdown on 2026-08-16, which both
    // corrects the total ($1,252.10 -> $1,140.10) and makes the package
    // honestly itemisable. The gap to the with-replacement package is
    // therefore $500 (agent fees $888 vs $388), not the $388 the brief
    // describes — the brief's figure was stale.
    kind: 'itemised',
    id: 'fly-in-without-replacement',
    name: 'Fly-In Without Replacement',
    // Stated, not absent. This was `null`, so PricingCard rendered nothing
    // where the other card renders "1 replacement within 6 months" — the
    // difference a visitor is comparing was communicated by a blank space.
    // "No replacement." is DirectHired's own wording from the same message
    // that supplied this breakdown.
    replacementTerm: 'No replacement',
    // Null, and not because this package is second best. DirectHired
    // recommended the other one to first-time employers specifically; this
    // is the right package for an experienced employer, and nothing supplied
    // says otherwise. An absent recommendation is the honest rendering of a
    // recommendation that was scoped to an audience this card is not
    // addressing.
    recommendedFor: null,
    lineItems: [
      { label: 'Agent fees', amountCents: 38800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical checkup', amountCents: 6000 },
      // "Handling & transport" on both cards, per DirectHired 2026-08-16.
      // The supplied breakdown said "Transport"; harmonised so the two cards
      // read as the same line item at the same price, which is what they are.
      { label: 'Handling & transport', amountCents: 12000 },
    ],
  },
]

export function packageTotalCents(pkg: Package): number {
  return pkg.kind === 'itemised'
    ? sumCents(pkg.lineItems.map((item) => item.amountCents))
    : pkg.totalCents
}

/**
 * The labels whose amount is NOT the same across every itemised package —
 * the one row a visitor holding two cards side by side is actually looking
 * for. Today that is exactly `Agent fees`.
 *
 * DERIVED, NEVER LISTED. Writing `['Agent fees']` somewhere would be a
 * claim about the data that the data could quietly stop supporting: if a
 * second component ever diverges, a hardcoded list would leave that row
 * unmarked and the cards would once again say "these two differ in one
 * line" while differing in two. Computing it means the emphasis follows
 * whatever pricing.ts holds, and disappears entirely if the packages are
 * ever harmonised.
 *
 * A label that appears in one package and not another counts as diverging
 * too — its absence is a difference, and the count check below is what
 * catches it. Total-only packages carry no line items to compare, so they
 * are skipped rather than treated as differing in everything.
 */
export function divergingLineItemLabels(
  pkgs: readonly Package[] = packages,
): ReadonlySet<string> {
  const itemised = pkgs.filter((pkg): pkg is ItemisedPackage => pkg.kind === 'itemised')
  if (itemised.length < 2) return new Set<string>()

  const amountsByLabel = new Map<string, number[]>()
  for (const pkg of itemised) {
    for (const item of pkg.lineItems) {
      amountsByLabel.set(item.label, [
        ...(amountsByLabel.get(item.label) ?? []),
        item.amountCents,
      ])
    }
  }

  const diverging = new Set<string>()
  for (const [label, amounts] of amountsByLabel) {
    if (amounts.length !== itemised.length || new Set(amounts).size > 1) diverging.add(label)
  }
  return diverging
}
