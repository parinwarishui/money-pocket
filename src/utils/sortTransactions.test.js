import { describe, expect, it } from "vitest";
import { sortByDateDesc } from "./sortTransactions.js";

function tx(id, date) {
  return { id, date };
}

describe("sortByDateDesc", () => {
  it("orders newest date first", () => {
    const input = [tx("a", "2026-11-01"), tx("b", "2026-11-20"), tx("c", "2026-11-10")];
    const result = sortByDateDesc(input);
    expect(result.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("is stable: transactions sharing a date keep their relative order", () => {
    // Mirrors addTransaction's behavior of prepending new rows, so the
    // most-recently-added same-day transaction should stay first.
    const input = [
      tx("newest-same-day", "2026-11-20"),
      tx("oldest-same-day", "2026-11-20"),
      tx("older-day", "2026-11-10"),
    ];
    const result = sortByDateDesc(input);
    expect(result.map((t) => t.id)).toEqual(["newest-same-day", "oldest-same-day", "older-day"]);
  });

  it("does not mutate the input array", () => {
    const input = [tx("a", "2026-11-01"), tx("b", "2026-11-20")];
    const copy = [...input];
    sortByDateDesc(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty array", () => {
    expect(sortByDateDesc([])).toEqual([]);
  });

  it("handles a single transaction", () => {
    const input = [tx("only", "2026-11-05")];
    expect(sortByDateDesc(input)).toEqual(input);
  });

  it("reproduces the reported bug: adding an older-dated transaction after newer ones", () => {
    // Bug: addTransaction always prepends, so adding a backdated
    // transaction after newer ones used to leave it at the top of the
    // array (and therefore the top of the screen) instead of sorted
    // into its correct chronological position.
    const existing = [tx("nov-20", "2026-11-20"), tx("nov-15", "2026-11-15")];
    const afterAddingOlder = [tx("nov-05-new", "2026-11-05"), ...existing]; // prepended, unsorted
    const result = sortByDateDesc(afterAddingOlder);
    expect(result.map((t) => t.id)).toEqual(["nov-20", "nov-15", "nov-05-new"]);
  });
});
