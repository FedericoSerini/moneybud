/** djb2 hash — stable, deterministic, browser-safe */
function djb2(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h |= 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Produces a stable hash for a bank-statement row using the four fields that
 * uniquely identify a transaction: data contabile, addebiti, accrediti,
 * descrizione.  For an expense row pass (date, amount, 0, desc); for an income
 * row pass (date, 0, amount, desc).
 */
export function transactionImportHash(
  date: string,
  debit: number,
  credit: number,
  description: string,
): string {
  return djb2(`${date}|${debit.toFixed(2)}|${credit.toFixed(2)}|${description}`)
}
