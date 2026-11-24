// Buckets a transaction list into contiguous same-day groups for
// rendering (one heading per day, newest first).
//
// This assumes `transactions` arrives already sorted so that every
// transaction for a given date is contiguous (AppContext guarantees
// this — see sortTransactions.js). If that assumption is ever violated,
// the same date can split into two separate groups, which would both
// render with the same React `key` (the date string) and produce
// incorrect, duplicate-key rendering — exactly the historical bug this
// function's test suite guards against.
export function groupTransactionsByDay(transactions) {
  const groups = [];
  let currentGroup = null;
  for (const tx of transactions) {
    if (!currentGroup || currentGroup.date !== tx.date) {
      currentGroup = { date: tx.date, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(tx);
  }
  return groups;
}
