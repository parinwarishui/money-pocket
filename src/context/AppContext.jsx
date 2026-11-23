import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_CATEGORIES } from "../data/categories.js";
import { iconForName, DEFAULT_ICON } from "../data/icons.js";

const STORAGE_KEY = "money-pocket-data";

// Income transactions don't use the category system — every income row
// gets this fixed label instead of a picked category.
export const INCOME_LABEL = { icon: "payments", name: "Income" };

const AppContext = createContext(null);

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let state = null;
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch {
      // corrupted JSON — fall through to defaults
    }
  }
  if (!state) {
    state = {
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      activeCurrencyCodes: ["SGD"],
      lastUsedCurrencyCode: "SGD",
    };
  }

  // Migration: categories used to store an emoji glyph. Icons are
  // identified by a plain ASCII name instead (see src/data/icons.js), so
  // derive one from the category's name — which was never corrupted —
  // rather than trying to interpret whatever is in the old `emoji` field.
  state.categories = (state.categories || []).map((c) => {
    if (c.icon) return c;
    const { emoji, ...rest } = c;
    return { ...rest, icon: iconForName(c.name) || DEFAULT_ICON };
  });

  state.transactions = (state.transactions || []).map((tx) => {
    // Migration: every transaction saved before income existed was spending.
    const withType = tx.type ? tx : { ...tx, type: "expense" };
    // Migration: categoryEmoji -> categoryIcon, same reasoning as above.
    if (withType.categoryIcon) return withType;
    const { categoryEmoji, ...rest } = withType;
    return { ...rest, categoryIcon: iconForName(withType.categoryName) || DEFAULT_ICON };
  });

  return state;
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ----- transactions: spending -----

  function addTransaction({ date, category, amount, currencyCode, note }) {
    const newTx = {
      id: crypto.randomUUID(),
      date,
      type: "expense",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
    };
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      lastUsedCurrencyCode: currencyCode,
    }));
  }

  function updateTransaction(id, { date, category, amount, currencyCode, note }) {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              date,
              type: "expense",
              categoryIcon: category.icon,
              categoryName: category.name,
              amount,
              currencyCode,
              note: note || "",
            }
          : tx,
      ),
      lastUsedCurrencyCode: currencyCode,
    }));
  }

  function deleteTransaction(id) {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id),
    }));
  }

  // ----- transactions: income -----

  function addIncomeTransaction({ date, amount, currencyCode, note }) {
    const newTx = {
      id: crypto.randomUUID(),
      date,
      type: "income",
      categoryIcon: INCOME_LABEL.icon,
      categoryName: INCOME_LABEL.name,
      amount,
      currencyCode,
      note: note || "",
    };
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      lastUsedCurrencyCode: currencyCode,
    }));
  }

  function updateIncomeTransaction(id, { date, amount, currencyCode, note }) {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              date,
              type: "income",
              categoryIcon: INCOME_LABEL.icon,
              categoryName: INCOME_LABEL.name,
              amount,
              currencyCode,
              note: note || "",
            }
          : tx,
      ),
      lastUsedCurrencyCode: currencyCode,
    }));
  }

  // ----- categories -----

  function addCategory({ icon, name }) {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, { id: crypto.randomUUID(), icon, name }],
    }));
  }

  function updateCategory(id, { icon, name }) {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, icon, name } : c)),
    }));
  }

  function deleteCategory(id) {
    // Safe to delete unconditionally: transactions snapshot their
    // category's icon/name at creation time, so nothing else
    // depends on this category still existing.
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  }

  // ----- currencies (append-only: codes never change or get removed) -----

  function addCurrency(code) {
    setState((prev) =>
      prev.activeCurrencyCodes.includes(code)
        ? prev
        : { ...prev, activeCurrencyCodes: [...prev.activeCurrencyCodes, code] },
    );
  }

  // ----- import (merge by id, local always wins) -----

  function mergeImportedData({ transactions: importedTx, categories: importedCats }) {
    setState((prev) => {
      const existingTxIds = new Set(prev.transactions.map((t) => t.id));
      const newTx = importedTx
        .filter((t) => !existingTxIds.has(t.id))
        .map((t) => (t.type ? t : { ...t, type: "expense" }))
        .map((t) =>
          t.categoryIcon ? t : { ...t, categoryIcon: iconForName(t.categoryName) || DEFAULT_ICON },
        );

      const existingCatIds = new Set(prev.categories.map((c) => c.id));
      const newCats = (importedCats || [])
        .filter((c) => !existingCatIds.has(c.id))
        .map((c) => (c.icon ? c : { ...c, icon: iconForName(c.name) || DEFAULT_ICON }));

      return {
        ...prev,
        transactions: [...prev.transactions, ...newTx].sort((a, b) =>
          a.date < b.date ? 1 : -1,
        ),
        categories: [...prev.categories, ...newCats],
      };
    });
  }

  // ----- computed: running balance per currency (income minus spending,
  // always all-time, never affected by the list's filters) -----

  const balancesByCurrency = useMemo(() => {
    const totals = {};
    for (const tx of state.transactions) {
      const signed = tx.type === "income" ? tx.amount : -tx.amount;
      totals[tx.currencyCode] = (totals[tx.currencyCode] || 0) + signed;
    }
    return totals;
  }, [state.transactions]);

  const value = {
    transactions: state.transactions,
    categories: state.categories,
    activeCurrencyCodes: state.activeCurrencyCodes,
    lastUsedCurrencyCode: state.lastUsedCurrencyCode,
    balancesByCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addIncomeTransaction,
    updateIncomeTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addCurrency,
    mergeImportedData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
