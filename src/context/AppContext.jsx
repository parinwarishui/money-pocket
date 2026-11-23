import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_CATEGORIES } from "../data/categories.js";

const STORAGE_KEY = "money-pocket-data";

const AppContext = createContext(null);

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // corrupted JSON — fall through to defaults
    }
  }
  return {
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    activeCurrencyCodes: ["SGD"],
    lastUsedCurrencyCode: "SGD",
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ----- transactions -----

  function addTransaction({ date, category, amount, currencyCode, note }) {
    const newTx = {
      id: crypto.randomUUID(),
      date,
      categoryEmoji: category.emoji,
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
              categoryEmoji: category.emoji,
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

  // ----- categories -----

  function addCategory({ emoji, name }) {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, { id: crypto.randomUUID(), emoji, name }],
    }));
  }

  function updateCategory(id, { emoji, name }) {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, emoji, name } : c)),
    }));
  }

  function deleteCategory(id) {
    // Safe to delete unconditionally: transactions snapshot their
    // category's emoji/name at creation time, so nothing else
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
      const newTx = importedTx.filter((t) => !existingTxIds.has(t.id));

      const existingCatIds = new Set(prev.categories.map((c) => c.id));
      const newCats = (importedCats || []).filter((c) => !existingCatIds.has(c.id));

      return {
        ...prev,
        transactions: [...prev.transactions, ...newTx].sort((a, b) =>
          a.date < b.date ? 1 : -1,
        ),
        categories: [...prev.categories, ...newCats],
      };
    });
  }

  // ----- bank statement import (reviewed rows -> real transactions) -----

  function importStatementTransactions(rows) {
    // rows: [{ date, description, amount, currencyCode, categoryName }]
    setState((prev) => {
      const newTx = rows.map((row) => {
        const category =
          prev.categories.find((c) => c.name === row.categoryName) || prev.categories[0];
        return {
          id: crypto.randomUUID(),
          date: row.date,
          categoryEmoji: category.emoji,
          categoryName: category.name,
          amount: row.amount,
          currencyCode: row.currencyCode,
          note: row.description || "",
        };
      });
      return {
        ...prev,
        transactions: [...newTx, ...prev.transactions],
        lastUsedCurrencyCode: rows.length ? rows[rows.length - 1].currencyCode : prev.lastUsedCurrencyCode,
      };
    });
  }

  const value = {
    transactions: state.transactions,
    categories: state.categories,
    activeCurrencyCodes: state.activeCurrencyCodes,
    lastUsedCurrencyCode: state.lastUsedCurrencyCode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addCurrency,
    mergeImportedData,
    importStatementTransactions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
