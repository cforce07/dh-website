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
