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
