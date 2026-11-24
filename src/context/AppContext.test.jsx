import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppProvider, useApp } from "./AppContext.jsx";
import { groupTransactionsByDay } from "../utils/groupTransactions.js";

function renderApp() {
  return renderHook(() => useApp(), { wrapper: AppProvider });
}

const FOOD = { icon: "restaurant", name: "Food" };

beforeEach(() => {
  localStorage.clear();
});

describe("AppContext — transaction ordering (regression tests)", () => {
  it("bug: adding a transaction on an older date no longer jumps to the top", () => {
    const { result } = renderApp();

    act(() => {
      result.current.addTransaction({
        date: "2026-11-20",
        category: FOOD,
        amount: 10,
        currencyCode: "SGD",
        note: "newer",
      });
    });
    act(() => {
      result.current.addTransaction({
        date: "2026-11-05", // older, added second
        category: FOOD,
        amount: 5,
        currencyCode: "SGD",
        note: "older, added later",
      });
    });

    const dates = result.current.transactions.map((t) => t.date);
    // The older-dated transaction must NOT be first just because it was
    // added last — it belongs after the newer one.
    expect(dates).toEqual(["2026-11-20", "2026-11-05"]);
  });

  it("bug: editing a transaction's date is reflected immediately, including its position", () => {
    const { result } = renderApp();

    act(() => {
      result.current.addTransaction({
        date: "2026-11-10",
        category: FOOD,
        amount: 20,
        currencyCode: "SGD",
        note: "to be edited",
      });
    });
    act(() => {
      result.current.addTransaction({
        date: "2026-11-15",
        category: FOOD,
        amount: 30,
        currencyCode: "SGD",
        note: "stays put",
      });
    });

    const editedId = result.current.transactions.find((t) => t.note === "to be edited").id;

    act(() => {
      result.current.updateTransaction(editedId, {
        date: "2026-11-25", // moved to newest
        category: FOOD,
        amount: 20,
        currencyCode: "SGD",
        note: "to be edited",
      });
    });

    const edited = result.current.transactions.find((t) => t.id === editedId);
    // The date value itself must reflect the edit...
    expect(edited.date).toBe("2026-11-25");
    // ...and it must now sort to the front, ahead of the untouched one.
    expect(result.current.transactions[0].id).toBe(editedId);
    expect(result.current.transactions.map((t) => t.date)).toEqual(["2026-11-25", "2026-11-15"]);
  });

  it("transactions exposed by the context are always safe to group by day (no duplicate date keys)", () => {
    const { result } = renderApp();

    act(() => {
      result.current.addTransaction({ date: "2026-11-01", category: FOOD, amount: 1, currencyCode: "SGD", note: "a" });
    });
    act(() => {
      result.current.addTransaction({ date: "2026-11-20", category: FOOD, amount: 2, currencyCode: "SGD", note: "b" });
    });
    act(() => {
      result.current.addTransaction({ date: "2026-11-10", category: FOOD, amount: 3, currencyCode: "SGD", note: "c" });
    });
    // Edit the first one to collide with an existing date elsewhere in
    // the list — this is exactly the scenario that used to produce two
    // non-adjacent groups sharing one React key.
    const toEdit = result.current.transactions.find((t) => t.note === "a").id;
    act(() => {
      result.current.updateTransaction(toEdit, {
        date: "2026-11-20",
        category: FOOD,
        amount: 1,
        currencyCode: "SGD",
        note: "a",
      });
    });

    const groups = groupTransactionsByDay(result.current.transactions);
    const dateKeys = groups.map((g) => g.date);
    expect(new Set(dateKeys).size).toBe(dateKeys.length);
  });
});
