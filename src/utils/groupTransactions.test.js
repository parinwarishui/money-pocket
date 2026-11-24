import { describe, expect, it } from "vitest";
import { groupTransactionsByDay } from "./groupTransactions.js";
import { sortByDateDesc } from "./sortTransactions.js";

function tx(id, date) {
  return { id, date };
}

describe("groupTransactionsByDay", () => {
  it("returns no groups for an empty list", () => {
    expect(groupTransactionsByDay([])).toEqual([]);
  });

  it("merges same-date transactions into one group when the input is sorted", () => {
    const sorted = sortByDateDesc([
      tx("a", "2026-11-20"),
      tx("b", "2026-11-10"),
      tx("c", "2026-11-20"),
      tx("d", "2026-11-10"),
    ]);
    const groups = groupTransactionsByDay(sorted);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe("2026-11-20");
    expect(groups[0].items.map((t) => t.id).sort()).toEqual(["a", "c"]);
    expect(groups[1].date).toBe("2026-11-10");
    expect(groups[1].items.map((t) => t.id).sort()).toEqual(["b", "d"]);
  });

  it("never produces two groups with the same date key when input is sorted", () => {
    // Duplicate date keys among sibling React elements is the exact
    // failure mode behind "editing a date doesn't visually update" —
    // React can reuse/skip re-rendering a sibling whose key collides
    // with an earlier one. As long as callers only ever pass
    // date-sorted input (which AppContext now guarantees), every
    // same-date transaction lands in one contiguous group, so this can
    // never happen.
    const sorted = sortByDateDesc([
      tx("edited-to-nov-25", "2026-11-25"),
      tx("already-nov-25", "2026-11-25"),
      tx("nov-18", "2026-11-18"),
    ]);
    const groups = groupTransactionsByDay(sorted);
    const dateKeys = groups.map((g) => g.date);
    expect(new Set(dateKeys).size).toBe(dateKeys.length);
  });

  it("documents the pre-sort failure mode: unsorted input can split a date into two groups", () => {
    // This is *not* the desired behavior — it's a regression guard
    // showing exactly what goes wrong if something ever hands this
    // function unsorted data again.
    const unsorted = [tx("a", "2026-11-20"), tx("b", "2026-11-10"), tx("c", "2026-11-20")];
    const groups = groupTransactionsByDay(unsorted);
    expect(groups).toHaveLength(3); // nov-20 split into two separate groups
    expect(groups[0].date).toBe(groups[2].date); // duplicate date key
  });
});
