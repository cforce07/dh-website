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
