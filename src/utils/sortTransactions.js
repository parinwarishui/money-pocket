// Sorts transactions newest-date-first. This is the single place that
// decides transaction order for the whole app: AppContext exposes its
// `transactions` already sorted with this, so every consumer (the list,
// the charts view, filters) can rely on date-descending order without
// re-sorting or re-deriving it themselves.
//
// Array.prototype.sort is a stable sort (guaranteed since ES2019), so
// transactions sharing the same date keep their relative order from the
// input array. Combined with addTransaction prepending new rows to the
// front of the array, this means "added most recently" naturally wins
// ties within the same day.
export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });
}
