import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "./AuthContext.jsx";
import { DEFAULT_CATEGORIES } from "../data/categories.js";
import { iconForName, DEFAULT_ICON } from "../data/icons.js";
import { sortByDateDesc } from "../utils/sortTransactions.js";

// Income transactions don't use the category system — every income row
// gets this fixed label instead of a picked category.
export const INCOME_LABEL = { icon: "payments", name: "Income" };

const DEFAULT_SETTINGS = {
  activeCurrencyCodes: ["SGD"],
  lastUsedCurrencyCode: "SGD",
};

const AppContext = createContext(null);

// Data lives in Firestore under users/{uid}: a settings doc plus
// transactions/categories subcollections. AppProvider is only ever
// mounted once signed in (see Root.jsx), so `user` here is always a
// real account — there's no "logged out" state to handle inside it.
export function AppProvider({ children }) {
  const { user } = useAuth();
  const uid = user.uid;

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const txCollection = useMemo(() => collection(db, "users", uid, "transactions"), [uid]);
  const catCollection = useMemo(() => collection(db, "users", uid, "categories"), [uid]);
  const settingsRef = useMemo(() => doc(db, "users", uid), [uid]);

  // A brand-new account has no settings doc yet — seed it with the
  // default categories exactly once. A returning account already has
  // one, so this never overwrites anything the user has changed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await getDoc(settingsRef);
      if (cancelled) return;
      if (!snap.exists()) {
        const batch = writeBatch(db);
        batch.set(settingsRef, DEFAULT_SETTINGS);
        for (const c of DEFAULT_CATEGORIES) {
          batch.set(doc(catCollection, c.id), { icon: c.icon, name: c.name });
        }
        await batch.commit();
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    return onSnapshot(txCollection, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [txCollection]);

  useEffect(() => {
    return onSnapshot(catCollection, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [catCollection]);

  useEffect(() => {
    return onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, [settingsRef]);

  // ----- transactions: spending -----

  function addTransaction({ date, category, amount, currencyCode, note }) {
    setDoc(doc(txCollection, crypto.randomUUID()), {
      date,
      type: "expense",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
      createdAt: Date.now(),
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function updateTransaction(id, { date, category, amount, currencyCode, note }) {
    updateDoc(doc(txCollection, id), {
      date,
      type: "expense",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function deleteTransaction(id) {
    deleteDoc(doc(txCollection, id));
  }

  // ----- transactions: income -----

  function addIncomeTransaction({ date, amount, currencyCode, note }) {
    setDoc(doc(txCollection, crypto.randomUUID()), {
      date,
      type: "income",
      categoryIcon: INCOME_LABEL.icon,
      categoryName: INCOME_LABEL.name,
      amount,
      currencyCode,
      note: note || "",
      createdAt: Date.now(),
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function updateIncomeTransaction(id, { date, amount, currencyCode, note }) {
    updateDoc(doc(txCollection, id), {
      date,
      type: "income",
      categoryIcon: INCOME_LABEL.icon,
      categoryName: INCOME_LABEL.name,
      amount,
      currencyCode,
      note: note || "",
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  // ----- categories -----

  function addCategory({ icon, name }) {
    setDoc(doc(catCollection, crypto.randomUUID()), { icon, name });
  }

  function updateCategory(id, { icon, name }) {
    updateDoc(doc(catCollection, id), { icon, name });
  }

  function deleteCategory(id) {
    // Safe to delete unconditionally: transactions snapshot their
    // category's icon/name at creation time, so nothing else depends on
    // this category still existing.
    deleteDoc(doc(catCollection, id));
  }

  // ----- currencies (append-only: codes never change or get removed) -----

  function addCurrency(code) {
    updateDoc(settingsRef, { activeCurrencyCodes: arrayUnion(code) });
  }

  // ----- import (merge by id, local always wins) -----

  async function mergeImportedData({ transactions: importedTx, categories: importedCats }) {
    const existingTxIds = new Set(transactions.map((t) => t.id));
    const existingCatIds = new Set(categories.map((c) => c.id));

    const batch = writeBatch(db);
    let writes = 0;

    for (const t of importedTx) {
      if (existingTxIds.has(t.id)) continue;
      const withType = t.type ? t : { ...t, type: "expense" };
      const withIcon = withType.categoryIcon
        ? withType
        : { ...withType, categoryIcon: iconForName(withType.categoryName) || DEFAULT_ICON };
      const { id, ...data } = withIcon;
      batch.set(doc(txCollection, id), { createdAt: Date.now(), ...data });
      writes++;
    }

    for (const c of importedCats || []) {
      if (existingCatIds.has(c.id)) continue;
      const withIcon = c.icon ? c : { ...c, icon: iconForName(c.name) || DEFAULT_ICON };
      const { id, ...data } = withIcon;
      batch.set(doc(catCollection, id), data);
      writes++;
    }

    if (writes > 0) await batch.commit();
  }

  // ----- computed -----

  // Every consumer (list, charts, filters) reads transactions through
  // this, so date order is guaranteed app-wide no matter what order
  // Firestore's snapshot delivers documents in.
  const sortedTransactions = useMemo(() => sortByDateDesc(transactions), [transactions]);

  // Running balance per currency (income minus spending, always
  // all-time, never affected by the list's filters).
  const balancesByCurrency = useMemo(() => {
    const totals = {};
    for (const tx of transactions) {
      const signed = tx.type === "income" ? tx.amount : -tx.amount;
      totals[tx.currencyCode] = (totals[tx.currencyCode] || 0) + signed;
    }
    return totals;
  }, [transactions]);

  if (!ready) {
    return <div className="auth-loading">Setting up your account…</div>;
  }

  const value = {
    transactions: sortedTransactions,
    categories,
    activeCurrencyCodes: settings.activeCurrencyCodes,
    lastUsedCurrencyCode: settings.lastUsedCurrencyCode,
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
