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
    replacementTerm: null,
    lineItems: [
      { label: 'Agent fees', amountCents: 38800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical', amountCents: 6000 },
      { label: 'Transport', amountCents: 12000 },
    ],
  },
]

export function packageTotalCents(pkg: Package): number {
  return pkg.kind === 'itemised'
    ? sumCents(pkg.lineItems.map((item) => item.amountCents))
    : pkg.totalCents
}
