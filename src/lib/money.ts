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
  const abs = Math.abs(cents)
  const remainder = abs % 100
  const dollars = (abs - remainder) / 100
  const dollarStr = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const remainderStr = String(remainder).padStart(2, '0')
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${dollarStr}.${remainderStr}`
}

/**
 * The SENTENCE rendering of a money value. Identical to formatSgd() except
 * that a whole-dollar amount drops its trailing ".00".
 *
 * Why a second formatter rather than a flag on the first: the two have
 * different jobs and must not be interchangeable. In a table or on a card,
 * every figure needs the same number of decimal places or the column stops
 * aligning on its decimal point — that is what formatSgd() is for, and it
 * is the only formatter any price display may use. In prose, "a gap of
 * $500.00" reads as a machine printing a field rather than a person naming
 * an amount; "$500" is what a person writes.
 *
 * USE THIS IN SENTENCES ONLY. Never for a card total, a line item or a
 * table cell. Amounts with real cents ($1,640.10, $425.10) are unchanged by
 * it, so the distinction only ever shows on round figures.
 */
export function formatSgdProse(cents: number): string {
  const formatted = formatSgd(cents)
  return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted
}
